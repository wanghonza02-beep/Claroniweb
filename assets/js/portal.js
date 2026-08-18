import { createPortalSession } from './supabase-client.js';

/*
 * Sends a subscriber to the Stripe Billing Portal.
 *
 * Binds every [data-portal] control, so the button beside the plan and the one
 * in the account menu share this single implementation.
 *
 * Visibility is not decided here — dashboard-auth.js and nav-profile.js reveal
 * these controls only for paying accounts. This file assumes it is only ever
 * clicked by someone who has a billing account, and reports plainly when the
 * server disagrees.
 */
(function () {
  'use strict';

  const controls = document.querySelectorAll('[data-portal]');
  if (!controls.length) return;

  function isCzech() {
    return document.documentElement.lang === 'cs';
  }

  const notes = new WeakMap();

  function notice(el, type, en, cs) {
    let note = notes.get(el);
    if (!note) {
      note = document.createElement('p');
      note.setAttribute('role', 'status');
      el.parentNode.insertBefore(note, el.nextSibling);
      notes.set(el, note);
    }
    note.className = `checkout-note checkout-note--${type}`;
    note.setAttribute('data-en', en);
    note.setAttribute('data-cs', cs);
    note.textContent = isCzech() ? cs : en;
  }

  let inFlight = false;

  async function open(el) {
    if (inFlight) return;
    inFlight = true;
    el.classList.add('is-loading');
    el.setAttribute('aria-busy', 'true');

    try {
      const { url, error } = await createPortalSession();

      if (error || !url) {
        console.error('Billing portal failed:', error);
        notice(
          el,
          'error',
          'Could not open billing. Please try again in a moment.',
          'Fakturaci se nepodařilo otevřít. Zkus to prosím za chvíli.',
        );
        return;
      }

      window.location.href = url;
    } catch (err) {
      console.error('Billing portal failed:', err);
      notice(
        el,
        'error',
        'Could not open billing. Please try again in a moment.',
        'Fakturaci se nepodařilo otevřít. Zkus to prosím za chvíli.',
      );
    } finally {
      inFlight = false;
      el.classList.remove('is-loading');
      el.setAttribute('aria-busy', 'false');
    }
  }

  controls.forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      open(el);
    });
  });
})();
