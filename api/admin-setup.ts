import { createClient } from '@supabase/supabase-js';

// One-time bootstrap endpoint:
//   GET /api/admin-setup?secret=YOUR_ADMIN_SETUP_SECRET
//
// Creates the admin account (or finds it if it already signed up normally),
// then sets profiles.role = 'admin' for it using the service-role key.
// Idempotent — safe to call more than once.
//
// Delete this file (or rotate ADMIN_SETUP_SECRET) once you've confirmed it worked.
export default async function handler(req: any, res: any) {
  try {
    const host = req.headers?.host ?? 'localhost';
    const url = new URL(req.url ?? '/', `https://${host}`);
    const secret = url.searchParams.get('secret');

    const expectedSecret = process.env.ADMIN_SETUP_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'Admin';

    const missing = [
      ['VITE_SUPABASE_URL', supabaseUrl],
      ['SUPABASE_SERVICE_ROLE_KEY', serviceKey],
      ['ADMIN_EMAIL', adminEmail],
      ['ADMIN_PASSWORD', adminPassword],
    ]
      .filter(([, v]) => !v)
      .map(([k]) => k);

    if (missing.length > 0) {
      res.status(500).json({ error: `Missing required env var(s): ${missing.join(', ')}` });
      return;
    }

    const supabase = createClient(supabaseUrl as string, serviceKey as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find an existing user with this email, or create one.
    let userId: string | null = null;

    const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
      res.status(500).json({ error: `Could not list users: ${listErr.message}` });
      return;
    }

    const existingUser = listData.users.find(
      (u) => u.email?.toLowerCase() === (adminEmail as string).toLowerCase()
    );

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: adminEmail as string,
        password: adminPassword as string,
        email_confirm: true,
        user_metadata: { full_name: adminName },
      });

      if (createErr || !created.user) {
        res.status(500).json({
          error: `Could not create admin user: ${createErr?.message ?? 'unknown error'}`,
        });
        return;
      }

      userId = created.user.id;
    }

    // The profiles row is created by an on_auth_user_created trigger, which can
    // lag by a beat for a brand-new signup — poll briefly instead of assuming it's there.
    let profileRow: { id: string; role: string } | null = null;
    for (let attempt = 0; attempt < 5 && !profileRow; attempt++) {
      const { data } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        profileRow = data;
        break;
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    if (!profileRow) {
      res.status(500).json({
        error: 'No profiles row exists for this user yet (handle_new_user trigger may not have run). Try again in a few seconds.',
      });
      return;
    }

    if (profileRow.role !== 'admin') {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userId);

      if (updateErr) {
        res.status(500).json({
          error: `Could not promote user to admin: ${updateErr.message}. Did you run allow_service_role_bootstrap.sql first?`,
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      userId,
      email: adminEmail,
      role: 'admin',
    });
  } catch (err: any) {
    res.status(500).json({ error: `Unexpected error: ${err?.message ?? String(err)}` });
  }
}
