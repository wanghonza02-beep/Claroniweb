// Opens the Stripe Billing Portal for the signed-in subscriber.
//
// The portal is where a customer updates their card, downloads invoices and
// cancels — the pricing page promises "Cancel in two taps", and without this
// there is no second tap. Stripe hosts and renders it; all this function does
// is mint a short-lived, single-customer session URL.
//
// Runs on the server because it needs STRIPE_SECRET_KEY. That key must never
// reach the browser: it can read every payment and cancel any subscription.
//
// TEST MODE. STRIPE_SECRET_KEY is the sk_test_ key already held in Supabase
// secrets. Nothing here reads a live key and no key is ever committed.

import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  ?? Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://claroniweb.vercel.app';

const stripe = new Stripe(STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-01-27.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!STRIPE_SECRET_KEY) {
    console.error('Missing STRIPE_SECRET_KEY.');
    return json({ error: 'Billing is not configured yet.' }, 500);
  }

  // ---- who is calling -----------------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Not signed in.' }, 401);

  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return json({ error: 'Not signed in.' }, 401);

  try {
    // The customer id is read server-side from the caller's own row. Taking it
    // from the request body instead would let anyone open the billing portal
    // for someone else's card by guessing a cus_ id.
    const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: row } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!row || !row.stripe_customer_id) {
      // Never subscribed, so there is no billing history to manage.
      return json({ error: 'No billing account yet.' }, 404);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${SITE_URL}/dashboard.html`,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('Portal session failed:', err);
    // The most common cause by far is the portal never being configured in the
    // Stripe dashboard for this mode — see supabase/STRIPE.md.
    return json({ error: 'Could not open the billing portal.' }, 500);
  }
});
