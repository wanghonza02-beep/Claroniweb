// Receives Stripe events and records subscription state in the database.
//
// Without this the payment succeeds and the site never finds out. Landing on
// success_url is not proof of payment — anyone can type that address. This
// webhook is the only trustworthy source.
//
// Stripe calls it, not a signed-in user, so it is deployed with --no-verify-jwt.
// The stripe-signature header takes the place of the JWT; without checking it,
// anyone could POST "paid" and unlock the paid plan for themselves.

import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const stripe = new Stripe(STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-01-27.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

// Deno has no synchronous crypto, which is what the Stripe SDK reaches for by
// default when verifying signatures.
const cryptoProvider = Stripe.createSubtleCryptoProvider();

// The service role key bypasses RLS. That is correct here: the writer is the
// server acting on a verified signature, not a user. It must never leave this
// function.
const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

function iso(seconds: number | null | undefined) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

/** Overwrites the subscription row with the current state held by Stripe. */
async function upsert(userId: string, sub: Stripe.Subscription) {
  const item = sub.items.data[0];

  // Stripe moved current_period_end from the subscription onto its items in the
  // 2025-03-31 API version. Reading both keeps this working either side of that
  // change instead of silently storing null and losing the renewal date.
  const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end
    ?? (item as unknown as { current_period_end?: number } | undefined)?.current_period_end
    ?? null;

  const { error } = await admin.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    stripe_price_id: item?.price?.id ?? null,
    status: sub.status,
    current_period_end: iso(periodEnd),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  if (error) throw error;
}

/**
 * Finds the user behind a subscription. Checkout carries client_reference_id,
 * but later events (renewal, cancellation) only have metadata or the row we
 * already stored.
 */
async function resolveUserId(sub: Stripe.Subscription): Promise<string | null> {
  const fromMetadata = sub.metadata?.supabase_user_id;
  if (fromMetadata) return fromMetadata;

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const { data } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  return data?.user_id ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('Missing STRIPE_WEBHOOK_SECRET.');
    return new Response('Not configured', { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  // The signature covers the raw body. Parsing JSON first would break
  // verification — and would let unverified data into the code path.
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error('Invalid signature:', err instanceof Error ? err.message : err);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      // The user just finished paying.
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription' || !session.subscription) break;

        const userId = session.client_reference_id;
        if (!userId) {
          console.error('Checkout session with no client_reference_id:', session.id);
          break;
        }

        const subId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;

        await upsert(userId, await stripe.subscriptions.retrieve(subId));
        break;
      }

      // Renewal, plan change, cancellation, failed payment.
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(sub);
        if (!userId) {
          console.error('Subscription with no known user:', sub.id);
          break;
        }
        await upsert(userId, sub);
        break;
      }

      default:
        // Everything else is ignored, but still has to answer 200 or Stripe
        // keeps redelivering it.
        break;
    }
  } catch (err) {
    // A 500 tells Stripe to retry, so a database blip does not lose a paid
    // subscription.
    console.error(`Handling ${event.type} failed:`, err);
    return new Response('Handler failed', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
