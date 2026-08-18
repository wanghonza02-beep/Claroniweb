# Stripe — platby pro Claroni

Kód je hotový. Zbývá ho propojit s tvým Stripe účtem. Projdi body po řadě;
zkušební platba je až na konci a bez předchozích kroků neproběhne.

**Všechno dělej v testovacím režimu.** Přepínač **Test mode** je vpravo nahoře
ve Stripe Dashboardu. V testu se nepohnou žádné skutečné peníze a klíče začínají
`sk_test_`. Jakmile uvidíš `sk_live_`, jsi v ostrém provozu.

---

## Co je součástí

| Soubor | Co dělá |
|---|---|
| `stripe-setup.sql` | tabulka `subscriptions` + RLS |
| `functions/create-checkout-session/` | založí platbu pro přihlášeného uživatele |
| `functions/stripe-webhook/` | zapíše výsledek platby do databáze |
| `functions/create-portal-session/` | otevře zákaznický portál pro předplatitele |
| `assets/js/checkout.js` | tlačítko na pricing stránce a na dashboardu |
| `assets/js/portal.js` | tlačítka *Manage billing* |
| `assets/js/dashboard-auth.js` | řádek „Plan:" na dashboardu |

---

## 1. Databáze

Supabase → SQL Editor → New query → vlož obsah [`stripe-setup.sql`](stripe-setup.sql) → Run.

Poslední dotaz v souboru vypíše politiky. Musí být **právě jeden řádek** a v něm
`SELECT`. Kdyby tam svítilo `INSERT` nebo `UPDATE`, znamená to, že si kdokoliv
z prohlížeče nastaví předplatné zadarmo — v tom případě to nepouštěj dál a řekni
mi to.

---

## 2. Produkt a cena ve Stripe

Stripe Dashboard → **Product catalogue** → **Add product**

- Name: `Claroni Pro`
- Price: `9.99` USD, **Recurring**, **Monthly**

Ulož a v detailu ceny zkopíruj **Price ID** — vypadá jako `price_1Q...`.
Není to ID produktu (`prod_...`), to je jiné a nefunguje.

---

## 3. Klíče do Supabase

Nikam je nevkládej do souborů v repozitáři — repozitář je veřejný. Patří jen
sem, jako secrets edge funkcí.

Nejdřív si otevři secret key: Stripe → **Developers → API keys** → u řádku
**Secret key** klikni na **Reveal test key** a zkopíruj ho. Začíná `sk_test_`.

> Zobrazí se jen jednou. Když ho zavřeš, nic se neděje — dá se vygenerovat nový.

Pak v Supabase: **Edge Functions** v levém menu → záložka **Secrets** →
**Add new secret**. Přidej postupně tyhle tři:

| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` ze Stripe |
| `STRIPE_PRICE_ID` | `price_1Q...` z bodu 2 |
| `SITE_URL` | `https://claroniweb.vercel.app` |

Názvy musí sedět přesně, včetně velkých písmen — funkce si je hledá pod nimi.

---

## 4. Nasazení funkcí

**Funkce jsou tři, takže tenhle bod uděláš třikrát.** Každá pokrývá jiný kus
životního cyklu předplatného:

| Funkce | Kdy běží | Kdo ji volá |
|---|---|---|
| `create-checkout-session` | návštěvník klikne na *Continue to payment* | přihlášený uživatel |
| `stripe-webhook` | Stripe potvrdí, že platba prošla | Stripe, sám od sebe |
| `create-portal-session` | předplatitel klikne na *Manage billing* | přihlášený uživatel |

První je cesta k pokladně, druhá účtenka zpátky, třetí dveře zpět dovnitř —
změna karty, faktury, zrušení. Sloučit je nejde: webhook nesmí vyžadovat
přihlášení, protože Stripe žádný účet na tvém webu nemá, a jedna funkce má jen
jedno nastavení.

Všechny tři jsou jednosouborové, takže je stačí vložit do editoru v dashboardu.

Supabase → **Edge Functions** → **Deploy a new function** → **Via editor**.

### 4a. create-checkout-session

1. Name: `create-checkout-session` — musí sedět přesně, pod tímhle jménem ji
   volá `assets/js/checkout.js`.
2. Smaž ukázkový kód v editoru.
3. Otevři [`functions/create-checkout-session/index.ts`](functions/create-checkout-session/index.ts),
   zkopíruj **celý** obsah a vlož ho tam.
4. **Deploy**.

### 4b. stripe-webhook

Stejně, jen s obsahem [`functions/stripe-webhook/index.ts`](functions/stripe-webhook/index.ts)
a jménem `stripe-webhook`.

### 4c. create-portal-session

Stejně, s obsahem [`functions/create-portal-session/index.ts`](functions/create-portal-session/index.ts)
a jménem `create-portal-session`. Volá ji `assets/js/portal.js`.

### 4d. Vypnout „Verify JWT" — u VŠECH TŘÍ funkcí

**Kde:** Supabase → **Edge Functions** → klikni na název funkce → v nastavení
funkce najdeš přepínač **Verify JWT with legacy secret**. Přepni na **vypnuto**.
Pak totéž u zbylých dvou.

> V některých verzích dashboardu se ten přepínač nabízí už při deploji v editoru,
> pod polem s kódem. Pokud ho tam vidíš, můžeš to vyřešit rovnou.

**Proč u všech, i u těch, které volá přihlášený uživatel:** tenhle projekt používá
nový formát klíče (`sb_publishable_...`). Brána Supabase u něj odmítá i požadavky
od přihlášeného uživatele hláškou „JWT is invalid" a doporučení Supabase je
kontrolu na bráně vypnout a ověřovat uvnitř funkce.

**Přihlášení se tím neobchází.** Každá funkce si volajícího ověřuje sama:

- `create-checkout-session` zavolá `auth.getUser()` na přiložený token a
  kohokoliv, koho nedokáže identifikovat, odmítne 401. Platbu tedy nelze založit
  na cizí účet.
- `stripe-webhook` ověří podpis v hlavičce `stripe-signature` proti
  `STRIPE_WEBHOOK_SECRET`. Událost s neplatným podpisem zahodí, takže si nikdo
  nepošle „zaplaceno" sám.
- `create-portal-session` si `cus_` ID nebere z požadavku, ale dohledá si ho
  v databázi podle ověřeného uživatele. Jinak by si kdokoliv otevřel cizí
  fakturaci prostě tím, že by cizí ID poslal.

> **Pozor, tohle kousne.** Supabase má známou chybu: přepínač se sám zapne
> zpátky pokaždé, když funkci znovu nasadíš. Po každé úpravě kódu ho zkontroluj,
> jinak platby tiše přestanou chodit.

Adresa, na které pak webhook běží — zkopíruj si ji, potřebuješ ji v dalším bodě:

```
https://dxqmcweieanhxnpqkdqa.supabase.co/functions/v1/stripe-webhook
```

---

## 5. Webhook ve Stripe

Stripe → **Developers → Webhooks → Add endpoint**

- **Endpoint URL:** adresa z předchozího bodu
- **Events to send** — vyber tyhle čtyři:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Po uložení klikni v detailu endpointu na **Signing secret → Reveal** a zkopíruj
hodnotu (`whsec_...`).

Ulož ji stejně jako v bodě 3: Supabase → **Edge Functions → Secrets → Add new
secret**, name `STRIPE_WEBHOOK_SECRET`, value `whsec_...`.

Secrets se načítají za běhu, takže funkci není potřeba nasazovat znovu.

---

## 6. Zákaznický portál

Tohle je ta druhá půlka slibu „Cancel in two taps". Portál hostuje Stripe — je
to hotová stránka, kde si zákazník změní kartu, stáhne faktury a zruší
předplatné. My na něj jen pošleme odkaz.

**Musíš ho ale nejdřív zapnout, jinak funkce spadne.** Stripe si bez konfigurace
neví rady, co má na té stránce ukázat.

Stripe (**Test mode!**) → **Settings → Billing → Customer portal** → **Activate**.

Pak zapni aspoň tohle:

- **Cancel subscriptions** — bez toho zákazník nemá jak odejít a pricing stránka
  by lhala
- **Update payment method** — když karta propadne, opraví si to sám
- **Invoice history** — faktury ke stažení

Do **Business information** doplň odkazy na podmínky a zásady:

```
https://claroniweb.vercel.app/terms.html
https://claroniweb.vercel.app/privacy.html
```

> **Konfigurace se nesdílí mezi režimy.** Zapnutí portálu v testu neznamená, že
> bude zapnutý i naostro — v ostrém režimu se nastavuje znovu.

### Kde to na webu je

| Kde | Komu |
|---|---|
| Dashboard, tlačítko *Manage billing* vedle plánu | jen předplatitelům |
| Menu účtu v navigaci, položka *Manage billing* | jen předplatitelům |

Uživatel na tarifu zdarma tlačítko nevidí — nemá co spravovat. Kdyby se funkce
zavolala bez existujícího zákazníka ve Stripu, vrátí 404 a nic nerozbije.

### Ověření

Přihlas se jako předplatitel, klikni na **Manage billing**. Musí tě to pustit na
`billing.stripe.com` s pruhem **TEST MODE**. Zkus tam zrušit předplatné a vrátit
se — na dashboardu se do pár sekund musí objevit `Pro — ends …`, protože
zrušení pošle webhook `customer.subscription.updated`.

---

## 7. Přesměrování zpátky na pricing

Supabase → Authentication → URL Configuration → **Redirect URLs**. K těm čtyřem
ze [`SETUP.md`](SETUP.md) přidej ještě:

```
https://claroniweb.vercel.app/pricing.html
http://localhost:8123/pricing.html
```

Proč: když někdo klikne na placený plán odhlášený, pošleme ho na login a po
přihlášení zpátky na pricing dokončit nákup. Bez těchhle dvou adres Supabase
návrat přes Google odmítne.

---

## 8. Zkušební platba

1. Otevři `/pricing.html` a přihlas se.
2. Klikni na **Continue to payment** u placeného plánu.
3. Otevře se Stripe Checkout. Vyplň:

   | Pole | Hodnota |
   |---|---|
   | Číslo karty | `4242 4242 4242 4242` |
   | Expirace | cokoliv v budoucnu, např. `12 / 30` |
   | CVC | libovolné tři číslice, např. `123` |
   | Jméno / PSČ | cokoliv |

4. Zaplať. Vrátí tě to na `/dashboard.html?checkout=success`.

**Co má být vidět, když to sedí:**

- na dashboardu se do pár sekund objeví řádek `Plan: Pro — renews …`
- Stripe → **Payments** ukazuje platbu `$9.99` se štítkem **TEST**
- Supabase → Table Editor → `subscriptions` má jeden řádek se `status = active`

Další testovací karty (zamítnutí, nutné 3D Secure) najdeš na
<https://docs.stripe.com/testing>.

---

## 9. Když to nefunguje

Nejdřív se podívej do logů — Supabase → Edge Functions → vyber funkci → **Logs**.
Skoro každá chyba je tam pojmenovaná.

| Příznak | Příčina |
|---|---|
| Tlačítko hlásí „Could not open checkout" | chybí `STRIPE_SECRET_KEY` nebo `STRIPE_PRICE_ID`, případně nesedí Price ID |
| V konzoli prohlížeče 401 „JWT is invalid" | u `create-checkout-session` se zapnul zpátky Verify JWT (bod 4d) |
| Klik vede na login, i když jsi přihlášený | vypršela session — přihlas se znovu |
| Platba prošla, ale dashboard ukazuje `Free` | webhook nedoběhl: Stripe → Webhooks → záložka **Attempts** ukáže odpověď |
| Webhook vrací 401 | u funkce `stripe-webhook` se zapnulo zpátky Verify JWT (bod 4d) |
| Webhook vrací 400 „Invalid signature" | `STRIPE_WEBHOOK_SECRET` je z jiného endpointu, nebo z ostrého režimu místo testovacího |

Pozor na tlačítko **Send test event** u webhooku ve Stripe. Pošle vymyšlenou
událost bez `client_reference_id`, takže funkce nemá koho k platbě přiřadit a
napíše do logu chybu. **Není to porucha.** Jediný platný test je proklikat
platbu na webu.

---

## 10. Přechod do ostrého režimu

**Zatím tudy nechoď.** Web je záměrně v testovacím režimu. Tahle sekce je pro
den, kdy budeš chtít vybírat skutečné peníze — projdeme ji spolu.

### Kde teď stojíš

V testovacím režimu **nikdo nezaplatí**, ani kdyby chtěl. Stripe skutečné karty
odmítá; projde jen `4242 4242 4242 4242` a spol. Reálný návštěvník uvidí přes
celý checkout pruh **TEST MODE**, zadá svoji kartu a dostane chybu.

Web tedy platby **předvádí, ale nevybírá**. Než to změníš, ber pricing stránku
jako ukázku, ne jako prodejní místo.

### Past, o kterou se lidi nejčastěji seknou

**Test a live jsou dvě oddělené databáze.** Nesdílí produkty, ceny, zákazníky,
odběry ani webhooky. Tvoje `price_...` z testu v ostrém režimu **neexistuje** —
funkce s ním spadne na „No such price".

Proto se nemění jeden secret, ale **tři**:

| Secret | Proč se mění |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_` → `sk_live_` |
| `STRIPE_PRICE_ID` | produkt se zakládá znovu, dostane nové ID |
| `STRIPE_WEBHOOK_SECRET` | ostrý webhook je jiný endpoint s vlastním `whsec_` |

### Postup

1. **Aktivovat Stripe účet.** Stripe → **Activate account**. Chce údaje
   o podnikání, doklad totožnosti a bankovní účet. Bez schválení ostrý režim
   vůbec nepustí. Trvá to od pár minut po několik dní, takže tímhle začni.
2. **Přepnout na Live mode** (přepínač vpravo nahoře) a **založit produkt znovu**
   — `Claroni Pro`, `9.99` USD, Recurring / Monthly. Zkopírovat **nové Price ID**.
3. **Založit webhook znovu** v ostrém režimu, na stejnou adresu a se stejnými
   čtyřmi událostmi (bod 5). Zkopírovat jeho vlastní **Signing secret**.
4. **Přepsat všechny tři secrets** v Supabase → Edge Functions → Secrets.
5. **Zapnout Customer portal** — Stripe → Settings → Billing → Customer portal.
   Konfiguruje se pro každý režim zvlášť, takže zapnutí v testu tady neplatí.
   Bez něj nemá zákazník jak zrušit odběr, přestože pricing slibuje „Cancel in
   two taps".
6. **Zkontrolovat `SITE_URL`**, aby mířila na finální doménu.
7. **Ověřit skutečnou kartou.** Vlastní kartou, malou částkou, a hned si ji vrátit
   přes Stripe → Payments → Refund. Testovací karty v ostrém režimu nefungují,
   takže tohle je jediný způsob, jak si potvrdit, že řetěz drží.

### Ještě předtím

- [ ] **Terms of Service** a **Privacy Policy** — teď oba odkazy v patičce míří
      na `#`. Stripe se na ně při aktivaci ptá a u placené služby se vyžadují.
- [ ] **Zkušební doba** je vypnutá a tlačítko tomu odpovídá — říká „Continue to
      payment" a karta se strhne hned. Kdybys ji chtěl zapnout, přidej secret
      `STRIPE_TRIAL_DAYS` s hodnotou `30` — a **musí se s ní změnit i text
      tlačítka**, jinak bereš peníze za něco, co jsi slíbil zdarma.

### Kdyby ses chtěl vrátit do testu

Přepsat ty tři secrets zpátky na testovací hodnoty. Nic dalšího se nemění — kód
ani jedna hodnota v repozitáři o režimu neví, pozná ho jen podle klíčů.
