# Supabase — nastavení pro Claroni

Kontrolní seznam k proklikání. Bez bodů 1 a 2 přihlášení přes Google spadne.

---

## 1. Authentication → URL Configuration

**Site URL**

```
https://claroniweb.vercel.app
```

**Redirect URLs** — musí tam být všech šest. Bez nich Supabase odmítne
uživatele vrátit zpět a OAuth i reset hesla skončí chybou.

```
https://claroniweb.vercel.app/dashboard.html
https://claroniweb.vercel.app/login.html
https://claroniweb.vercel.app/pricing.html
http://localhost:8123/dashboard.html
http://localhost:8123/login.html
http://localhost:8123/pricing.html
```

> Pokud si lokálně pouštíš web na jiném portu než 8123, přidej i ten. Port musí
> sedět přesně — Supabase porovnává celou URL, ne jen doménu.

Kam se ty adresy berou v kódu:

| URL | odkud |
|---|---|
| `.../dashboard.html` | `signInWithGoogle()` v `assets/js/supabase-client.js` |
| `.../login.html` | `resetPasswordForEmail()` tamtéž |
| `.../pricing.html` | návrat k nedokončenému nákupu, `assets/js/checkout.js` |

---

## 2. Google Cloud Console → Credentials → OAuth 2.0 Client

Tohle je jiná adresa než výše a plete se to. Google musí vracet na **Supabase**,
ne na tvůj web — přesměrování na `dashboard.html` řeší až Supabase.

**Authorized redirect URIs**

```
https://dxqmcweieanhxnpqkdqa.supabase.co/auth/v1/callback
```

Client ID a Client Secret odtud patří do Supabase → Authentication → Providers →
Google.

---

## 3. Authentication → Providers → Email

Rozhodni, jestli chceš **Confirm email** zapnuté:

- **Zapnuté** (bezpečnější) — po registraci přijde potvrzovací e-mail a session
  vznikne až po kliknutí. Kód to zvládá: ukáže „Zkontroluj si e-mail" místo
  přesměrování na dashboard.
- **Vypnuté** — registrace rovnou přihlásí a pošle na dashboard. Rychlejší na
  testování, ale kdokoliv se zaregistruje na cizí e-mail.

---

## 4. Row Level Security

Spusť [`rls-setup.sql`](rls-setup.sql) v SQL Editoru. Pro platby navíc
[`stripe-setup.sql`](stripe-setup.sql) — postup je v [`STRIPE.md`](STRIPE.md).

**Proč to není volitelné:** klíč v `assets/js/supabase-client.js` je
*publishable* — je veřejný záměrně a do klientského kódu patří. Jediné, co dělí
tvoje tabulky od kohokoliv na internetu, je RLS. Tabulka bez RLS je pro každého
návštěvníka webu čitelná i zapisovatelná.

Zatím na dashboardu svítí natvrdo napsaná čísla, takže není co chránit.
**Kritické to bude v okamžiku, kdy vytvoříš první tabulku se skutečnými daty.**

První dotaz v tom souboru je audit — vypíše každou tabulku a jestli má RLS
zapnutou. Pouštěj ho pokaždé, když přidáš tabulku.

---

## 5. Ruční test toku

Kód pokrývá všechny tyhle cesty, ale odzkoušené v prohlížeči zatím nejsou:

- [ ] registrace e-mailem → potvrzovací e-mail → přihlášení
- [ ] přihlášení e-mailem a heslem → dashboard
- [ ] přihlášení přes Google → dashboard
- [ ] **reset hesla** → odkaz z e-mailu → formulář na nové heslo → dashboard
- [ ] odhlášení → login
- [ ] `/dashboard.html` odhlášený → hodí na login, obsah neproblikne
- [ ] `/login.html` přihlášený → hodí na dashboard

Ten reset je čerstvě přepsaný, protože ho rozbilo automatické přesměrování
přihlášeného uživatele — odkaz z e-mailu totiž taky vytvoří session. Zaslouží
si projít první.
