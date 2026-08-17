// Creates a Stripe Checkout Session for the signed-in user.
//
// This runs on the server because it needs STRIPE_SECRET_KEY. That key must
// never reach the browser — it can read every payment, issue refunds and cancel
// subscriptions.
//
// The browser calls it with Authorization: Bearer <access_token>. The token is
// verified against Supabase Auth before anything is charged; without that check
// anyone could open a checkout against someone else's account.

import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const STRIPE_PRICE_ID = Deno.env.get('STRIPE_PRICE_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
// Supabase injects these; the publishable name is the newer one, kept first so
// a project issuing sb_publishable_ keys does not fall back to an empty string.
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  ?? Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Where Stripe returns the visitor. Set to the production domain; override with
// http://localhost:8123 when testing locally.
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://claroniweb.vercel.app';

// Unset means no trial: the card is charged as soon as checkout completes,
// which is what the pricing page now says ("Continue to payment"). Setting
// STRIPE_TRIAL_DAYS adds a free period — but then the button has to say so, or
// it is taking money the visitor was not told about.
const TRIAL_DAYS = Number(Deno.env.get('STRIPE_TRIAL_DAYS') ?? '0');

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

  if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
    console.error('Missing STRIPE_SECRET_KEY or STRIPE_PRICE_ID.');
    return json({ error: 'Payments are not configured yet.' }, 500);
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
    // ---- Stripe customer --------------------------------------------------
    // One customer per user. Letting a user accumulate several would scatter
    // their subscriptions across profiles and make "is this person paying?"
    // unanswerable.
    const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: existing } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let customerId = existing?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    // ---- session ----------------------------------------------------------
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      // The webhook receives a session, not a logged-in user. Without these two
      // fields there is no way to tie the payment back to an account.
      client_reference_id: user.id,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
        ...(TRIAL_DAYS > 0 ? { trial_period_days: TRIAL_DAYS } : {}),
      },
      success_url: `${SITE_URL}/dashboard.html?checkout=success`,
      cancel_url: `${SITE_URL}/pricing.html?checkout=cancelled`,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('Checkout session failed:', err);
    return json({ error: 'Could not start checkout.' }, 500);
  }
});
