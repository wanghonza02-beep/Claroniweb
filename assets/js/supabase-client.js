import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Supabase Konfigurace
// ============================================================================
// Tyto údaje najdete ve svém projektu na https://supabase.com/dashboard
// -> Project Settings (ozubené kolečko) -> API
// ----------------------------------------------------------------------------
export const SUPABASE_URL = 'https://dxqmcweieanhxnpqkdqa.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_X6dJQrOaQMx4njFJdPxE3Q_wgJyf5-W';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// Autentizační pomocné funkce (Auth Helpers)
// ============================================================================

/**
 * Přihlášení uživatele pomocí e-mailu a hesla
 */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

/**
 * Registrace nového uživatele pomocí e-mailu a hesla
 */
export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

/**
 * Přihlášení přes Google OAuth
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard.html`,
    },
  });
  return { data, error };
}

/**
 * Odhlášení uživatele
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Získání aktuálně přihlášeného uživatele
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Odeslání odkazu pro obnovení hesla na e-mail
 */
export async function resetPasswordForEmail(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login.html`,
  });
  return { data, error };
}

/**
 * Nastavení nového hesla pro právě přihlášeného uživatele.
 * Používá se na konci obnovy hesla: odkaz z e-mailu vytvoří dočasnou session
 * a teprve v ní lze heslo přepsat.
 */
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
}

/**
 * Posluchač změn stavu přihlášení (přihlášen, odhlášen, token refreshed)
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

// ============================================================================
// Newsletter
// ============================================================================

/**
 * Zapsání e-mailu do tabulky newsletter_subscribers (sloupce: id, email,
 * created_at). Zapisuje se anonymně, takže tabulka musí mít RLS politiku
 * povolující INSERT roli anon — a naopak NESMÍ povolovat SELECT, jinak by si
 * kdokoliv stáhl celý seznam odběratelů.
 */
export async function subscribeToNewsletter(email) {
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .insert({ email });
  return { data, error };
}
