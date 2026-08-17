import {
  getCurrentUser,
  getSubscriptionCached,
  isPayingSubscription,
  displayName,
  signOut,
} from './supabase-client.js';

/*
 * Account menu in the header, for subscribers.
 *
 * A paying customer was still being shown "Get started" on every page — an
 * invitation to buy what they already own. For them that slot becomes who they
 * are: avatar, name, and a menu holding Sign Out.
 *
 * Free plans keep the CTA. It is their only route to the paid plan from the
 * landing page, so replacing it would take the upgrade path away from exactly
 * the people it is for.
 *
 * Everything starts hidden in the markup and is revealed only once the plan is
 * known, so nothing about the account flashes before it is true.
 */
(async function () {
  'use strict';

  const wrap = document.querySelector('.nav__profile');
  if (!wrap) return;

  const btn = wrap.querySelector('.nav__profile-btn');
  const menu = wrap.querySelector('.nav__menu');
  if (!btn || !menu) return;

  // ---- is this a subscriber? ----------------------------------------------
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (e) {
    return;
  }
  if (!user) return;

  let sub = null;
  try {
    const res = await getSubscriptionCached();
    sub = res && res.data;
  } catch (e) {
    // Can't read the plan: leave the CTA alone. Treating a failed read as
    // "subscriber" would hide the upgrade path from paying-nobody.
    return;
  }
  if (!isPayingSubscription(sub)) return;

  // ---- swap the CTA for the account menu ----------------------------------
  // Two places: beside the avatar, and at the top of the open menu. On narrow
  // screens the first is hidden for want of room, which is why the second
  // exists — the account is still identifiable, just one tap further in.
  const name = displayName(user);
  wrap.querySelectorAll('[data-profile-name]').forEach(function (el) {
    el.textContent = name;
    el.title = name;
  });
  btn.setAttribute('aria-label', name ? `Account: ${name}` : 'Account menu');

  document.querySelectorAll('[data-hide-when-pro]').forEach(function (el) {
    el.hidden = true;
  });
  wrap.hidden = false;

  // ---- menu ---------------------------------------------------------------
  function open() {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onOutside);
  }

  function close(refocus) {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onOutside);
    if (refocus) btn.focus();
  }

  function isOpen() {
    return !menu.hidden;
  }

  function onKey(e) {
    if (e.key === 'Escape') close(true);
  }

  function onOutside(e) {
    if (!wrap.contains(e.target)) close(false);
  }

  btn.addEventListener('click', function () {
    if (isOpen()) close(false); else open();
  });

  // Tabbing out of the menu closes it. relatedTarget is where focus went, so a
  // move between the button and its own items does not count as leaving.
  wrap.addEventListener('focusout', function (e) {
    if (!wrap.contains(e.relatedTarget)) close(false);
  });

  // ---- sign out -----------------------------------------------------------
  const out = menu.querySelector('[data-signout]');
  if (out) {
    out.addEventListener('click', async function () {
      out.disabled = true;
      try {
        await signOut();
      } catch (e) {
        console.error('Sign out error:', e);
      } finally {
        window.location.replace('login.html');
      }
    });
  }
})();
