import { supabase, getCurrentUser, signOut } from './supabase-client.js';

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
