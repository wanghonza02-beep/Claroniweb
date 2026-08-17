import {
  supabase,
  getCurrentUser,
  signOut,
  getSubscription,
  getSubscriptionCached,
  isPayingSubscription,
} from './supabase-client.js';

/*
 * Dashboard auth gate.
 *
 * The page starts with .auth-pending on <html> (set in the document head before
 * first paint) so nothing is visible until a session is confirmed. This module
 * either clears that class or sends the visitor to the login page.
 *
 * This is a UX gate, not a security boundary — the markup is public and anyone
 * can unhide it from devtools. Real protection has to come from Row Level
 * Security on Supabase, so no per-user data may be rendered here until RLS is
 * confirmed enabled.
 */
(async function () {
  'use strict';

  const root = document.documentElement;

  function toLogin() {
    // replace() so the protected page does not sit in the back-button history
    window.location.replace('login.html');
  }

  function reveal() {
    root.classList.remove('auth-pending');
  }

  // ---- gate ---------------------------------------------------------------
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
    // Unreachable or misconfigured Supabase. Failing closed is the safe
    // direction: show the login page rather than an unverified dashboard.
    console.warn('Session check failed:', err);
    toLogin();
    return;
  }

  if (!user) {
    toLogin();
    return;
  }

  // ---- signed in ----------------------------------------------------------
  const emailDisplay = document.getElementById('userEmailDisplay');
  if (emailDisplay) emailDisplay.textContent = user.email || 'User';

  reveal();

  // ---- plan ---------------------------------------------------------------
  // Read-only: the row is written by the Stripe webhook using the service role
  // key. RLS gives the browser SELECT on its own row and nothing else, so this
  // line reports the subscription rather than deciding it.
  const planRow = document.getElementById('dashPlan');
  const planName = document.getElementById('dashPlanName');

  /* Upgrade prompts: the nav CTA and the Subscribe button next to the plan.
     They start hidden in the markup and are revealed only once the plan is
     known — a paying customer should never be shown, even for a frame, a
     button asking them to buy what they already have. */
  const freeOnly = document.querySelectorAll('[data-free-only]');

  function showUpgrade(show) {
    freeOnly.forEach(function (el) { el.hidden = !show; });
  }

  function isCzech() {
    return document.documentElement.lang === 'cs';
  }

  function setPlan(en, cs) {
    if (!planRow || !planName) return;
    planName.setAttribute('data-en', en);
    planName.setAttribute('data-cs', cs);
    planName.textContent = isCzech() ? cs : en;
    planRow.hidden = false;
  }

  function describe(sub) {
    if (!sub || !sub.status) return { en: 'Free', cs: 'Zdarma' };

    const until = sub.current_period_end
      ? new Date(sub.current_period_end).toLocaleDateString(isCzech() ? 'cs-CZ' : 'en-US',
          { day: 'numeric', month: 'short', year: 'numeric' })
      : null;

    switch (sub.status) {
      case 'trialing':
        return {
          en: until ? `Pro — trial until ${until}` : 'Pro — trial',
          cs: until ? `Pro — zkušební do ${until}` : 'Pro — zkušební',
        };
      case 'active':
        if (sub.cancel_at_period_end) {
          return {
            en: until ? `Pro — ends ${until}` : 'Pro — ending',
            cs: until ? `Pro — končí ${until}` : 'Pro — končí',
          };
        }
        return {
          en: until ? `Pro — renews ${until}` : 'Pro',
          cs: until ? `Pro — obnoví se ${until}` : 'Pro',
        };
      case 'past_due':
      case 'unpaid':
        return { en: 'Pro — payment failed', cs: 'Pro — platba selhala' };
      default:
        // canceled, incomplete, incomplete_expired, paused
        return { en: 'Free', cs: 'Zdarma' };
    }
  }

  /* fresh=true skips the shared per-page cache.
     The first read can share the one nav-profile.js already makes. The polling
     after a payment cannot: the cache hands back the very answer we are waiting
     to see change, so it would spin five times and still report Free. */
  async function refreshPlan(fresh) {
    try {
      const { data } = fresh ? await getSubscription() : await getSubscriptionCached();
      const t = describe(data);
      setPlan(t.en, t.cs);
      showUpgrade(!isPayingSubscription(data));
      return data;
    } catch (e) {
      // Failing to read the plan is not proof the visitor is on Free. Leaving
      // the upgrade buttons hidden is the honest default: worst case someone
      // pays a click later, rather than a paying customer being nagged.
      console.warn('Could not read subscription:', e);
      return null;
    }
  }

  await refreshPlan();

  /* Just back from Stripe.
     success_url is reached the instant the card clears, but the webhook that
     writes the row is a separate request and can land a second or two later.
     Without this the page would show "Free" right after a successful payment.
     Give up after a few tries — the row will be there on the next visit.

     Deliberately not awaited: everything below this point wires up the page,
     and making the sign-out button dead for seven seconds is a worse bug than
     a plan label that settles late. */
  if (new URLSearchParams(window.location.search).get('checkout') === 'success') {
    (async function () {
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 1500));
        const sub = await refreshPlan(true);
        if (sub && sub.status) break;
      }
    })();
  }

  // The plan text is written by this file, so the language switcher in
  // script.js never saw it at load. Re-render it when the language changes.
  new MutationObserver(function () {
    if (!planName) return;
    const en = planName.getAttribute('data-en');
    const cs = planName.getAttribute('data-cs');
    if (en && cs) planName.textContent = isCzech() ? cs : en;
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  // ---- mobile app banner --------------------------------------------------
  // A real button rather than a label, but there is no app to send anyone to
  // yet, so it says that instead of linking nowhere. Swap this for the store
  // link once the app ships.
  const appBtn = document.getElementById('dashAppBtn');
  const appNote = document.getElementById('dashAppNote');
  if (appBtn && appNote) {
    appBtn.addEventListener('click', function () {
      appNote.hidden = false;
    });
  }

  // ---- sign out -----------------------------------------------------------
  const logoutBtn = document.getElementById('dashLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      logoutBtn.disabled = true;
      logoutBtn.classList.add('is-loading');
      try {
        await signOut();
      } catch (e) {
        console.error('Sign out error:', e);
      } finally {
        toLogin();
      }
    });
  }

  // ---- session lost while the page is open --------------------------------
  // Covers signing out in another tab and an expired refresh token.
  if (supabase && supabase.auth) {
    supabase.auth.onAuthStateChange(function (event, session) {
      if (event === 'SIGNED_OUT' || !session) toLogin();
    });
  }
})();
