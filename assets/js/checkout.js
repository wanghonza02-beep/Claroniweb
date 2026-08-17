import {
  getCurrentUser,
  createCheckoutSession,
  getSubscriptionCached,
  isPayingSubscription,
} from './supabase-client.js';

/*
 * Stripe Checkout for every [data-checkout] control on the page.
 *
 * Two of them exist: the paid plan's button on the pricing page, and the
 * Subscribe button beside "Plan: Free" on the dashboard. They behave the same,
 * so they share this file rather than growing a second near-copy that drifts.
 *
 * On the pricing page the control keeps a real href to login.html, so with
 * JavaScript off — or before this module loads — it still goes somewhere
 * sensible instead of doing nothing.
 *
 * Signed out, a click is not a dead end either: it carries the intent through
 * the login page and comes back to finish, rather than stranding the visitor on
 * the dashboard wondering what happened to their purchase.
 */
(async function () {
  'use strict';

  const ctas = document.querySelectorAll('[data-checkout]');
  if (!ctas.length) return;

  const params = new URLSearchParams(window.location.search);

  function isCzech() {
    return document.documentElement.lang === 'cs';
  }

  // ---- feedback -----------------------------------------------------------
  // One note per control, parked right after it, so a page with two buttons
  // reports against whichever one was actually pressed.
  const notes = new WeakMap();

  function notice(cta, type, en, cs) {
    let el = notes.get(cta);
    if (!el) {
      el = document.createElement('p');
      el.setAttribute('role', 'status');
      cta.parentNode.insertBefore(el, cta.nextSibling);
      notes.set(cta, el);
    }
    el.className = `checkout-note checkout-note--${type}`;
    // script.js reads [data-en]/[data-cs] when the language toggle fires, so
    // setting both keeps this message in step with the rest of the page.
    el.setAttribute('data-en', en);
    el.setAttribute('data-cs', cs);
    el.textContent = isCzech() ? cs : en;
  }

  function failed(cta) {
    notice(
      cta,
      'error',
      'Could not open checkout. Please try again in a moment.',
      'Platbu se nepodařilo otevřít. Zkus to prosím za chvíli.',
    );
  }

  function setBusy(cta, busy) {
    cta.classList.toggle('is-loading', busy);
    cta.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  // ---- start checkout -----------------------------------------------------
  let inFlight = false;

  async function start(cta, resumed) {
    if (inFlight) return;
    // Already relabelled as the current plan — the handler is still attached,
    // so this is what stops a second click getting through.
    if (cta.classList.contains('is-current')) return;
    inFlight = true;
    setBusy(cta, true);

    try {
      /* The subscriber lookup may still be running if the click beat it.
         Waiting here rather than before binding is what lets an early click
         work while still keeping a subscriber from opening a second checkout
         that Stripe would bill separately. */
      if (await subscriberCheck) return;

      const user = await getCurrentUser();

      if (!user) {
        /* Already came back from the login page and still no session — sending
           the visitor there again would bounce them between the two pages
           forever. Stop and say so instead. */
        if (resumed) {
          notice(
            cta,
            'info',
            'Please sign in again to continue.',
            'Pro pokračování se prosím přihlas znovu.',
          );
          return;
        }
        // Come back here afterwards and pick up where we left off.
        const back = encodeURIComponent('pricing.html?checkout=start');
        window.location.href = `login.html?next=${back}`;
        return;
      }

      const { url, error } = await createCheckoutSession();

      if (error || !url) {
        console.error('Checkout failed:', error);
        failed(cta);
        return;
      }

      window.location.href = url;
    } catch (err) {
      console.error('Checkout failed:', err);
      failed(cta);
    } finally {
      inFlight = false;
      setBusy(cta, false);
    }
  }

  // ---- already subscribed? ------------------------------------------------
  /* Stripe will happily open a second checkout for a plan the visitor already
     pays for, and then bill them for both. So a subscriber is never handed a
     working buy button: the CTA becomes a statement of what they have.

     Only the pricing page reaches this — the dashboard's Subscribe button is
     already hidden for subscribers. A failed lookup falls through to normal
     behaviour rather than locking anyone out of paying. */
  function markCurrent(cta) {
    const en = 'Your current plan';
    const cs = 'Tvůj současný plán';
    cta.setAttribute('data-en', en);
    cta.setAttribute('data-cs', cs);
    cta.textContent = isCzech() ? cs : en;
    cta.removeAttribute('href');
    cta.setAttribute('aria-disabled', 'true');
    cta.classList.add('is-current');
  }

  /* Started now, awaited only where it changes an outcome.
     Binding the click handlers behind this would leave the button inert while
     two requests are in the air, and on a slow connection a click in that gap
     falls through to the href — sending a signed-in buyer to the login page,
     which sees their session and forwards them to the dashboard. They wanted
     to pay and quietly ended up somewhere else. */
  const subscriberCheck = (async function () {
    try {
      const user = await getCurrentUser();
      if (!user) return false;
      const res = await getSubscriptionCached();
      return isPayingSubscription(res && res.data);
    } catch (e) {
      // A failed lookup must not lock anyone out of paying.
      console.warn('Could not read subscription:', e);
      return false;
    }
  })();

  subscriberCheck.then(function (paying) {
    if (paying) ctas.forEach(markCurrent);
  });

  ctas.forEach(function (cta) {
    cta.addEventListener('click', function (e) {
      e.preventDefault();
      start(cta, false);
    });
  });

  // ---- returning visitors -------------------------------------------------
  const first = ctas[0];

  if (params.get('checkout') === 'cancelled') {
    notice(
      first,
      'info',
      'Checkout cancelled. Nothing was charged.',
      'Platba zrušena. Nic jsme ti nestrhli.',
    );
  }

  // Sent back by the login page after signing in mid-purchase.
  if (params.get('checkout') === 'start') start(first, true);
})();
