import { createClient } from '@supabase/supabase-js';

// Runs server-side only (Vercel serverless function). Never bundled into the
// client — safe to use SUPABASE_SERVICE_ROLE_KEY here.
//
// Usage: visit  https://<your-domain>/api/admin-setup?secret=<ADMIN_SETUP_SECRET>
// Idempotent — safe to call more than once. On success, the account matching
// ADMIN_EMAIL exists (created if needed) and has role = 'admin'.

export default async function handler(req: any, res: any) {
  const secret = req.query?.secret ?? req.headers?.['x-admin-setup-secret'];

  if (!process.env.ADMIN_SETUP_SECRET || secret !== process.env.ADMIN_SETUP_SECRET) {
    // Deliberately vague — don't reveal whether the secret was close or missing.
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME ?? 'Admin';

  if (!supabaseUrl || !serviceRoleKey || !adminEmail || !adminPassword) {
    res.status(500).json({ error: 'Missing one or more required env vars (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD)' });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. Find the auth user by email, or create it if it doesn't exist yet.
    let userId: string | null = null;

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: adminName },
    });

    if (createErr) {
      // Most likely "already registered" — look the existing user up instead.
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
      if (listErr) {
        res.status(500).json({ error: `Could not create or find admin user: ${createErr.message}` });
        return;
      }
      const existing = list.users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());
      if (!existing) {
        res.status(500).json({ error: `Create failed and no existing user found: ${createErr.message}` });
        return;
      }
      userId = existing.id;
    } else {
      userId = created.user.id;
    }

    // 2. Promote (or create) the matching profiles row to admin.
    //    Requires the service-role trigger bypass from allow_service_role_bootstrap.sql.
    const { error: upsertErr } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          email: adminEmail,
          full_name: adminName,
          role: 'admin',
        },
        { onConflict: 'id' }
      );

    if (upsertErr) {
      res.status(500).json({ error: `User ready but profile promotion failed: ${upsertErr.message}` });
      return;
    }

    res.status(200).json({ success: true, message: `${adminEmail} is now an admin.`, userId });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? 'Unknown error' });
  }
}
