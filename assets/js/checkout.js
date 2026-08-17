import { getCurrentUser, createCheckoutSession } from './supabase-client.js';

/*
 * Pricing page: turns the paid plan's CTA into a Stripe Checkout redirect.
 *
 * The link keeps a real href to login.html, so with JavaScript off — or before
 * this module loads — the button still goes somewhere sensible instead of
 * doing nothing.
 *
 * Signed out, the click is not a dead end either: it carries the intent through
 * the login page and comes back here to finish, rather than stranding the
 * visitor on the dashboard wondering what happened to their purchase.
 */
(function () {
  'use strict';

  const cta = document.querySelector('[data-checkout]');
  if (!cta) return;

  const params = new URLSearchParams(window.location.search);

  function isCzech() {
    return document.documentElement.lang === 'cs';
  }

  // ---- feedback -----------------------------------------------------------
  let noticeEl = null;

  function notice(type, en, cs) {
    if (!noticeEl) {
      noticeEl = document.createElement('p');
      noticeEl.className = 'checkout-note';
      noticeEl.setAttribute('role', 'status');
      cta.parentNode.insertBefore(noticeEl, cta.nextSibling);
    }
    noticeEl.className = `checkout-note checkout-note--${type}`;
    // script.js reads [data-en]/[data-cs] when the language toggle fires, so
    // setting both keeps this message in step with the rest of the page.
    noticeEl.setAttribute('data-en', en);
    noticeEl.setAttribute('data-cs', cs);
    noticeEl.textContent = isCzech() ? cs : en;
  }

  function setBusy(busy) {
    cta.classList.toggle('is-loading', busy);
    cta.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  // ---- start checkout -----------------------------------------------------
  let inFlight = false;

  async function start(resumed) {
    if (inFlight) return;
    inFlight = true;
    setBusy(true);

    try {
      const user = await getCurrentUser();

      if (!user) {
        /* Already came back from the login page and still no session — sending
           the visitor there again would bounce them between the two pages
           forever. Stop and say so instead. */
        if (resumed) {
          notice(
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
        notice(
          'error',
          'Could not open checkout. Please try again in a moment.',
          'Platbu se nepodařilo otevřít. Zkus to prosím za chvíli.',
        );
        return;
      }

      window.location.href = url;
    } catch (err) {
      console.error('Checkout failed:', err);
      notice(
        'error',
        'Could not open checkout. Please try again in a moment.',
        'Platbu se nepodařilo otevřít. Zkus to prosím za chvíli.',
      );
    } finally {
      inFlight = false;
      setBusy(false);
    }
  }

  cta.addEventListener('click', function (e) {
    e.preventDefault();
    start();
  });

  // ---- returning visitors -------------------------------------------------
  if (params.get('checkout') === 'cancelled') {
    notice(
      'info',
      'Checkout cancelled. Nothing was charged.',
      'Platba zrušena. Nic jsme ti nestrhli.',
    );
  }

  // Sent back by the login page after signing in mid-purchase.
  if (params.get('checkout') === 'start') start(true);
})();
