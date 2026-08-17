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
export async function signInWithGoogle(redirectPath) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/${redirectPath || 'dashboard.html'}`,
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

// ============================================================================
// Stripe
// ============================================================================

/**
 * Vyžádá si Checkout Session od edge funkce a vrátí URL, kam se má prohlížeč
 * přesměrovat. invoke() přiloží access token přihlášeného uživatele; bez
 * session funkce vrátí 401, takže volat ji smí jen přihlášený.
 */
export async function createCheckoutSession() {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    method: 'POST',
  });
  return { url: data && data.url, error: error || (data && data.error) || null };
}

/**
 * Řádek předplatného pro přihlášeného uživatele, nebo null.
 *
 * Tabulka má RLS jen na SELECT vlastního řádku a zapisuje do ní pouze webhook
 * přes service role klíč — z prohlížeče si nikdo předplatné nenastaví.
 */
export async function getSubscription() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, cancel_at_period_end')
    .maybeSingle();
  return { data, error };
}

/**
 * Totéž, ale dotaz proběhne jednou za načtení stránky.
 *
 * Na dashboardu se na plán ptají dvě věci najednou — řádek „Plan:" a profil
 * v navigaci. Bez tohohle by to byly dva shodné dotazy jen proto, že jde
 * o dva moduly.
 *
 * Nezneplatňuje se: přihlášení, odhlášení i návrat z platby stránku znovu
 * načtou, takže není co zestárnout.
 */
let subscriptionOnce = null;

export function getSubscriptionCached() {
  if (!subscriptionOnce) subscriptionOnce = getSubscription();
  return subscriptionOnce;
}

/**
 * Platí uživatel? trialing i past_due se počítají jako „má plán“: jeden ještě
 * nebyl účtován, druhý je v odkladu, který Stripe dává, než to vzdá.
 */
export function isPayingSubscription(sub) {
  return !!sub && ['trialing', 'active', 'past_due'].indexOf(sub.status) !== -1;
}

/**
 * Jméno k zobrazení. Google vrací celé jméno v metadatech, e-mailová
 * registrace nic — pak zbývá e-mail.
 */
export function displayName(user) {
  if (!user) return '';
  const meta = user.user_metadata || {};
  return meta.full_name || meta.name || user.email || '';
}
