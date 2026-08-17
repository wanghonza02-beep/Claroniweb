import {
  supabase,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  resetPasswordForEmail,
  updatePassword,
  getCurrentUser
} from './supabase-client.js';

(function () {
  'use strict';

  // DOM Elements
  const form = document.querySelector('.login__form');
  if (!form) return;

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const passwordField = passwordInput ? passwordInput.closest('.field') : null;
  const emailField = emailInput ? emailInput.closest('.field') : null;
  const loginRow = document.querySelector('.login__row');
  const submitBtn = document.querySelector('.login__submit');
  const divider = document.querySelector('.login__divider');
  const oauthBtn = document.querySelector('.login__oauth');
  const titleEl = document.querySelector('.login__title');
  const subEl = document.querySelector('.login__sub');
  const footEl = document.querySelector('.login__foot');

  // Create alert box if not present
  let alertBox = document.getElementById('authAlert');
  if (!alertBox) {
    alertBox = document.createElement('div');
    alertBox.id = 'authAlert';
    alertBox.className = 'auth-alert';
    alertBox.style.display = 'none';
    alertBox.setAttribute('role', 'alert');
    form.parentNode.insertBefore(alertBox, form);
  }

  // Modes: 'signin' | 'signup' | 'reset' | 'update'
  let currentMode = 'signin';

  /* Password recovery.
     The link in the reset email lands back here with #type=recovery, and
     Supabase turns that into a real session. Without this flag the
     "already signed in" check below would bounce the visitor straight to the
     dashboard and they would never get to set a new password. */
  let isRecovery = /type=recovery/.test(window.location.hash);

  /* Where to go once signed in.
     Defaults to the dashboard; ?next= overrides it so a visitor who started
     buying a plan, got asked to sign in, and did so ends up back at the
     purchase rather than staring at the dashboard.

     The pattern is deliberately narrow: a bare filename plus an optional query,
     nothing else. Anything with a scheme, a host or a slash is discarded, which
     is what stops ?next=https://evil.example from turning the login page into
     an open redirect that phishers can point at. */
  const NEXT_OK = /^[a-z0-9_-]+\.html(\?[a-z0-9=&_-]*)?$/i;

  function nextTarget() {
    const raw = new URLSearchParams(window.location.search).get('next');
    return raw && NEXT_OK.test(raw) ? raw : 'dashboard.html';
  }

  function isCzech() {
    return document.documentElement.lang === 'cs';
  }

  /* script.js collects [data-cs] elements once at load, so anything this file
     inserts later (the footer links swapped in by setMode) is invisible to the
     language switcher and would stay stuck in one language. Re-applying it to
     the freshly inserted subtree keeps them in step. */
  function applyLang(root) {
    (root || document).querySelectorAll('[data-cs][data-en]').forEach(function (el) {
      el.textContent = isCzech() ? el.getAttribute('data-cs') : el.getAttribute('data-en');
    });
  }

  function showAlert(type, enText, csText) {
    alertBox.className = `auth-alert auth-alert--${type}`;
    alertBox.setAttribute('data-en', enText);
    alertBox.setAttribute('data-cs', csText);
    alertBox.textContent = isCzech() ? csText : enText;
    alertBox.style.display = 'flex';
  }

  function hideAlert() {
    alertBox.style.display = 'none';
    alertBox.textContent = '';
  }

  function setLoading(loading) {
    if (loading) {
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      if (oauthBtn) oauthBtn.disabled = true;
    } else {
      submitBtn.classList.remove('is-loading');
      submitBtn.disabled = false;
      if (oauthBtn) oauthBtn.disabled = false;
    }
  }

  // Friendly error messages dictionary
  function translateError(error) {
    const msg = (error && error.message) ? error.message.toLowerCase() : '';
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      return {
        en: 'Invalid email or password. Please try again.',
        cs: 'Neplatný e-mail nebo heslo. Zkuste to prosím znovu.'
      };
    }
    if (msg.includes('user already registered') || msg.includes('already registered')) {
      return {
        en: 'An account with this email already exists.',
        cs: 'Účet s tímto e-mailem již existuje.'
      };
    }
    if (msg.includes('password should be at least 6 characters') || msg.includes('weak_password')) {
      return {
        en: 'Password must be at least 6 characters long.',
        cs: 'Heslo musí mít alespoň 6 znaků.'
      };
    }
    if (msg.includes('email not confirmed')) {
      return {
        en: 'Please verify your email address before signing in.',
        cs: 'Před přihlášením prosím potvrďte svůj e-mail.'
      };
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      return {
        en: 'Too many attempts. Please try again in a few moments.',
        cs: 'Příliš mnoho pokusů. Zkuste to prosím za chvíli.'
      };
    }
    return {
      en: error.message || 'An unexpected error occurred.',
      cs: error.message || 'Došlo k neočekávané chybě.'
    };
  }

  // UI state switcher
  function setMode(mode) {
    currentMode = mode;
    hideAlert();

    if (mode === 'signin') {
      if (titleEl) {
        titleEl.textContent = isCzech() ? 'Vítej' : 'Welcome';
        titleEl.setAttribute('data-cs', 'Vítej');
        titleEl.setAttribute('data-en', 'Welcome');
      }
      if (subEl) {
        subEl.textContent = isCzech() ? 'Přihlas se a uvidíš, na čem jsi.' : 'Sign in to see where you stand.';
        subEl.setAttribute('data-cs', 'Přihlas se a uvidíš, na čem jsi.');
        subEl.setAttribute('data-en', 'Sign in to see where you stand.');
      }
      if (passwordField) passwordField.style.display = 'flex';
      if (passwordInput) passwordInput.required = true;
      if (loginRow) loginRow.style.display = 'flex';
      if (divider) divider.style.display = 'flex';
      if (oauthBtn) oauthBtn.style.display = 'inline-flex';

      submitBtn.textContent = isCzech() ? 'Přihlásit se' : 'Sign In';
      submitBtn.setAttribute('data-cs', 'Přihlásit se');
      submitBtn.setAttribute('data-en', 'Sign In');

      if (footEl) {
        footEl.innerHTML = `
          <span data-en="New to our platform?" data-cs="Jsi tu poprvé?">${isCzech() ? 'Jsi tu poprvé?' : 'New to our platform?'}</span>
          <a class="login__link" href="#" id="toSignUpBtn" data-en="Create Account" data-cs="Vytvořit účet">${isCzech() ? 'Vytvořit účet' : 'Create Account'}</a>
        `;
        document.getElementById('toSignUpBtn').addEventListener('click', function (e) {
          e.preventDefault();
          setMode('signup');
        });
      }
    } else if (mode === 'signup') {
      if (titleEl) {
        titleEl.textContent = isCzech() ? 'Vytvořit účet' : 'Create Account';
        titleEl.setAttribute('data-cs', 'Vytvořit účet');
        titleEl.setAttribute('data-en', 'Create Account');
      }
      if (subEl) {
        subEl.textContent = isCzech() ? 'Začni s Claroni během několika sekund.' : 'Get started with Claroni in seconds.';
        subEl.setAttribute('data-cs', 'Začni s Claroni během několika sekund.');
        subEl.setAttribute('data-en', 'Get started with Claroni in seconds.');
      }
      if (passwordField) passwordField.style.display = 'flex';
      if (passwordInput) passwordInput.required = true;
      if (loginRow) loginRow.style.display = 'none';
      if (divider) divider.style.display = 'flex';
      if (oauthBtn) oauthBtn.style.display = 'inline-flex';

      submitBtn.textContent = isCzech() ? 'Zaregistrovat se' : 'Create Account';
      submitBtn.setAttribute('data-cs', 'Zaregistrovat se');
      submitBtn.setAttribute('data-en', 'Create Account');

      if (footEl) {
        footEl.innerHTML = `
          <span data-en="Already have an account?" data-cs="Už máš účet?">${isCzech() ? 'Už máš účet?' : 'Already have an account?'}</span>
          <a class="login__link" href="#" id="toSignInBtn" data-en="Sign In" data-cs="Přihlásit se">${isCzech() ? 'Přihlásit se' : 'Sign In'}</a>
        `;
        document.getElementById('toSignInBtn').addEventListener('click', function (e) {
          e.preventDefault();
          setMode('signin');
        });
      }
    } else if (mode === 'reset') {
      if (titleEl) {
        titleEl.textContent = isCzech() ? 'Obnova hesla' : 'Reset Password';
        titleEl.setAttribute('data-cs', 'Obnova hesla');
        titleEl.setAttribute('data-en', 'Reset Password');
      }
      if (subEl) {
        subEl.textContent = isCzech() ? 'Zadej svůj e-mail pro zaslání odkazu k obnově.' : 'Enter your email to receive a password reset link.';
        subEl.setAttribute('data-cs', 'Zadej svůj e-mail pro zaslání odkazu k obnově.');
        subEl.setAttribute('data-en', 'Enter your email to receive a password reset link.');
      }
      if (passwordField) passwordField.style.display = 'none';
      if (passwordInput) passwordInput.required = false;
      if (loginRow) loginRow.style.display = 'none';
      if (divider) divider.style.display = 'none';
      if (oauthBtn) oauthBtn.style.display = 'none';

      submitBtn.textContent = isCzech() ? 'Odeslat odkaz' : 'Send Reset Link';
      submitBtn.setAttribute('data-cs', 'Odeslat odkaz');
      submitBtn.setAttribute('data-en', 'Send Reset Link');

      if (footEl) {
        footEl.innerHTML = `
          <span data-en="Remembered your password?" data-cs="Vzpomněl sis na heslo?">${isCzech() ? 'Vzpomněl sis na heslo?' : 'Remembered your password?'}</span>
          <a class="login__link" href="#" id="backToSignInBtn" data-en="Back to Sign In" data-cs="Zpět na přihlášení">${isCzech() ? 'Zpět na přihlášení' : 'Back to Sign In'}</a>
        `;
        document.getElementById('backToSignInBtn').addEventListener('click', function (e) {
          e.preventDefault();
          setMode('signin');
        });
      }
    } else if (mode === 'update') {
      // Reached only from a recovery link. The session already exists; all
      // that is left is to write the new password.
      if (titleEl) {
        titleEl.textContent = isCzech() ? 'Nové heslo' : 'Set a new password';
        titleEl.setAttribute('data-cs', 'Nové heslo');
        titleEl.setAttribute('data-en', 'Set a new password');
      }
      if (subEl) {
        subEl.textContent = isCzech() ? 'Zvol si nové heslo, alespoň 6 znaků.' : 'Choose a new password, at least 6 characters.';
        subEl.setAttribute('data-cs', 'Zvol si nové heslo, alespoň 6 znaků.');
        subEl.setAttribute('data-en', 'Choose a new password, at least 6 characters.');
      }
      if (emailField) emailField.style.display = 'none';
      if (emailInput) emailInput.required = false;
      if (passwordField) passwordField.style.display = 'flex';
      if (passwordInput) {
        passwordInput.required = true;
        passwordInput.value = '';
        passwordInput.setAttribute('autocomplete', 'new-password');
      }
      if (loginRow) loginRow.style.display = 'none';
      if (divider) divider.style.display = 'none';
      if (oauthBtn) oauthBtn.style.display = 'none';

      submitBtn.textContent = isCzech() ? 'Uložit heslo' : 'Save password';
      submitBtn.setAttribute('data-cs', 'Uložit heslo');
      submitBtn.setAttribute('data-en', 'Save password');

      if (footEl) footEl.innerHTML = '';
    }

    // modes other than 'update' need the email field back
    if (mode !== 'update') {
      if (emailField) emailField.style.display = 'flex';
      if (emailInput) emailInput.required = true;
      if (passwordInput) passwordInput.setAttribute('autocomplete', 'current-password');
    }
  }

  // Handle Password Reset Link click
  const resetLink = document.getElementById('resetPasswordLink') || document.querySelector('.login__row .login__link');
  if (resetLink) {
    resetLink.id = 'resetPasswordLink';
    resetLink.addEventListener('click', function (e) {
      e.preventDefault();
      setMode('reset');
    });
  }

  // Handle initial footer link
  const initialFootLink = document.querySelector('.login__foot .login__link');
  if (initialFootLink) {
    initialFootLink.id = 'toSignUpBtn';
    initialFootLink.addEventListener('click', function (e) {
      e.preventDefault();
      setMode('signup');
    });
  }

  // Handle form submission
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideAlert();

    const email = emailInput.value.trim();
    const password = passwordInput ? passwordInput.value : '';

    // 'update' runs inside an existing recovery session, so there is no email
    // field to fill in
    if (!email && currentMode !== 'update') {
      showAlert('error', 'Please enter your email address.', 'Zadejte prosím svou e-mailovou adresu.');
      return;
    }

    setLoading(true);

    try {
      if (currentMode === 'signin') {
        const { data, error } = await signInWithEmail(email, password);
        if (error) {
          const t = translateError(error);
          showAlert('error', t.en, t.cs);
        } else {
          showAlert('success', 'Sign in successful! Redirecting...', 'Přihlášení proběhlo úspěšně! Přesměrovávám...');
          setTimeout(() => {
            window.location.href = nextTarget();
          }, 800);
        }
      } else if (currentMode === 'signup') {
        if (!password || password.length < 6) {
          showAlert('error', 'Password must be at least 6 characters.', 'Heslo musí mít alespoň 6 znaků.');
          setLoading(false);
          return;
        }

        const { data, error } = await signUpWithEmail(email, password);
        if (error) {
          const t = translateError(error);
          showAlert('error', t.en, t.cs);
        } else if (data && data.session) {
          showAlert('success', 'Account created successfully! Redirecting...', 'Účet byl úspěšně vytvořen! Přesměrovávám...');
          setTimeout(() => {
            window.location.href = nextTarget();
          }, 800);
        } else {
          showAlert(
            'success',
            'Registration successful! Please check your email to confirm your account.',
            'Registrace úspěšná! Zkontrolujte prosím svůj e-mail pro potvrzení účtu.'
          );
        }
      } else if (currentMode === 'reset') {
        const { error } = await resetPasswordForEmail(email);
        if (error) {
          const t = translateError(error);
          showAlert('error', t.en, t.cs);
        } else {
          showAlert(
            'success',
            'Password reset link has been sent to your email.',
            'Odkaz pro obnovení hesla byl odeslán na váš e-mail.'
          );
        }
      } else if (currentMode === 'update') {
        if (!password || password.length < 6) {
          showAlert('error', 'Password must be at least 6 characters.', 'Heslo musí mít alespoň 6 znaků.');
          setLoading(false);
          return;
        }
        const { error } = await updatePassword(password);
        if (error) {
          const t = translateError(error);
          showAlert('error', t.en, t.cs);
        } else {
          isRecovery = false;
          showAlert('success', 'Password updated. Redirecting...', 'Heslo bylo změněno. Přesměrovávám...');
          setTimeout(() => { window.location.replace('dashboard.html'); }, 900);
        }
      }
    } catch (err) {
      showAlert('error', 'An unexpected error occurred. Please try again.', 'Došlo k neočekávané chybě. Zkuste to prosím znovu.');
    } finally {
      setLoading(false);
    }
  });

  // Handle Google OAuth
  if (oauthBtn) {
    oauthBtn.addEventListener('click', async function () {
      hideAlert();
      setLoading(true);
      try {
        const { error } = await signInWithGoogle(nextTarget());
        if (error) {
          const t = translateError(error);
          showAlert('error', t.en, t.cs);
          setLoading(false);
        }
      } catch (err) {
        showAlert('error', 'Could not initiate Google sign-in.', 'Nepodařilo se spustit přihlášení přes Google.');
        setLoading(false);
      }
    });
  }

  /* Recovery link handling.
     Supabase fires PASSWORD_RECOVERY once it has parsed the token out of the
     URL. Catching both that event and the raw hash covers the case where the
     hash is cleared before this listener attaches. */
  supabase.auth.onAuthStateChange(function (event) {
    if (event === 'PASSWORD_RECOVERY') {
      isRecovery = true;
      setMode('update');
    }
  });

  if (isRecovery) setMode('update');

  // Already signed in? Skip the form entirely — the flow is always
  // "sign in, then land on the dashboard". replace() keeps the login page out
  // of the back-button history so returning does not bounce between the two.
  // Suppressed during recovery, where a session exists but the visitor still
  // has to choose a new password.
  getCurrentUser().then(user => {
    if (user && !isRecovery) window.location.replace(nextTarget());
  }).catch(() => {});

  // Observe language switcher changes to update dynamically inserted content
  const observer = new MutationObserver(() => {
    if (alertBox.style.display !== 'none') {
      const en = alertBox.getAttribute('data-en');
      const cs = alertBox.getAttribute('data-cs');
      if (en && cs) {
        alertBox.textContent = isCzech() ? cs : en;
      }
    }
    // footer links are replaced by setMode, so script.js never sees them
    if (footEl) applyLang(footEl);
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

})();
