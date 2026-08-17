import { getCurrentUser } from './supabase-client.js';

(async function () {
  'use strict';
  try {
    const user = await getCurrentUser();
    if (user) {
      const loginLinks = document.querySelectorAll('.nav__login');
      loginLinks.forEach(link => {
        link.href = 'dashboard.html';
        link.textContent = 'Dashboard';
        link.setAttribute('data-en', 'Dashboard');
        link.setAttribute('data-cs', 'Dashboard');
      });
    }
  } catch (e) {}
})();
