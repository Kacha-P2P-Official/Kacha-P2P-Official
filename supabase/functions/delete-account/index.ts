import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    // ── 1. Verify the caller's JWT with the anon client ──────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Caller client — scoped to the requesting user's JWT
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401);

    const userId = user.id;

    // ── 2. Admin client — service role, never exposed to the browser ─────────
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 3. Clean up user data before deleting the auth record ────────────────
    // Cancel or mark open trades as cancelled
    await adminClient
      .from('trades')
      .update({ status: 'cancelled' })
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .in('status', ['initiated', 'payment_pending', 'payment_confirmed']);

    // Remove the user's offers
    await adminClient.from('offers').delete().eq('user_id', userId);

    // Remove KYC applications
    await adminClient.from('kyc_applications').delete().eq('user_id', userId);

    // Remove trade messages sent by this user
    await adminClient.from('trade_messages').delete().eq('sender_id', userId);

    // Remove KYC document files from storage (bucket: kyc-documents)
    const { data: kycFiles } = await adminClient.storage
      .from('kyc-documents')
      .list(userId);
    if (kycFiles && kycFiles.length > 0) {
      const paths = kycFiles.map((f) => `${userId}/${f.name}`);
      await adminClient.storage.from('kyc-documents').remove(paths);
    }

    // Remove avatar from storage (bucket: avatars), if any
    const { data: avatarFiles } = await adminClient.storage
      .from('avatars')
      .list(userId);
    if (avatarFiles && avatarFiles.length > 0) {
      const paths = avatarFiles.map((f) => `${userId}/${f.name}`);
      await adminClient.storage.from('avatars').remove(paths);
    }

    // Remove the profile row — CASCADE will handle remaining FK children
    await adminClient.from('profiles').delete().eq('id', userId);

    // ── 4. Delete the auth user — must be last ───────────────────────────────
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteErr) {
      console.error('delete-account: admin.deleteUser failed', deleteErr);
      return json({ error: deleteErr.message }, 500);
    }

    console.log(`delete-account: deleted user ${userId}`);
    return json({ success: true });
  } catch (err) {
    console.error('delete-account: unexpected error', err);
    return json({ error: 'Internal server error', details: String(err) }, 500);
  }
});
