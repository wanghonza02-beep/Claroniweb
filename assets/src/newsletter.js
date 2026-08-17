import { subscribeToNewsletter } from './supabase-client.js';

/*
 * Footer newsletter form → Supabase (table newsletter_subscribers).
 *
 * Runs on every page, because the footer is site-wide. Feedback reuses the
 * .auth-alert styles from the login page so the two never drift apart.
 */
(function () {
  'use strict';

  const form = document.querySelector('.subscribe');
  if (!form) return;

  const input = form.querySelector('.subscribe__input');
  const button = form.querySelector('.subscribe__btn');
  if (!input || !button) return;

  // The alert is created here rather than sitting in every page's markup —
  // one footer, four copies, and this keeps them from drifting.
  const alertBox = document.createElement('div');
  alertBox.className = 'auth-alert';
  alertBox.setAttribute('role', 'status');
  alertBox.style.display = 'none';
  form.parentNode.insertBefore(alertBox, form.nextSibling);

  const isCzech = () => document.documentElement.lang === 'cs';

  function showAlert(type, en, cs) {
    alertBox.className = 'auth-alert auth-alert--' + type;
    alertBox.setAttribute('data-en', en);
    alertBox.setAttribute('data-cs', cs);
    alertBox.textContent = isCzech() ? cs : en;
    alertBox.style.display = 'flex';
  }

  function setLoading(loading) {
    button.disabled = loading;
    button.classList.toggle('is-loading', loading);
    input.disabled = loading;
  }

  // Deliberately loose: the server and the type="email" attribute do the real
  // validation. This only catches obvious nonsense before a round trip.
  function looksLikeEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = input.value.trim();
    if (!looksLikeEmail(email)) {
      showAlert('error',
        'Please enter a valid email address.',
        'Zadej prosím platnou e-mailovou adresu.');
      input.focus();
      return;
    }

    setLoading(true);
    try {
      const { error } = await subscribeToNewsletter(email);

      if (error) {
        // 23505 = unique_violation. Treated as success on purpose: telling a
        // stranger whether an address is already on the list would leak
        // whether that person subscribed.
        if (error.code === '23505') {
          showAlert('success',
            'You are on the list. We will email you once.',
            'Jsi na seznamu. Napíšeme ti jednou.');
          input.value = '';
        } else if (error.code === '42501' || /row-level security/i.test(error.message || '')) {
          showAlert('error',
            'Sign-ups are not accepting entries right now.',
            'Přihlášení k odběru teď nefunguje.');
          console.error('newsletter: RLS is rejecting the insert —',
            'the table needs a policy allowing INSERT for the anon role.', error);
        } else {
          showAlert('error',
            'Something went wrong. Please try again.',
            'Něco se pokazilo. Zkus to prosím znovu.');
          console.error('newsletter:', error);
        }
      } else {
        showAlert('success',
          'You are on the list. We will email you once.',
          'Jsi na seznamu. Napíšeme ti jednou.');
        input.value = '';
      }
    } catch (err) {
      showAlert('error',
        'Something went wrong. Please try again.',
        'Něco se pokazilo. Zkus to prosím znovu.');
      console.error('newsletter:', err);
    } finally {
      setLoading(false);
    }
  });

  // script.js snapshots [data-cs] elements once at load, so this alert — created
  // afterwards — is invisible to the language switcher and would freeze in
  // whichever language it first appeared in.
  new MutationObserver(function () {
    if (alertBox.style.display === 'none') return;
    const en = alertBox.getAttribute('data-en');
    const cs = alertBox.getAttribute('data-cs');
    if (en && cs) alertBox.textContent = isCzech() ? cs : en;
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
