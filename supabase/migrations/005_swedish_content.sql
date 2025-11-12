-- Swedish Content for Vision Privacy
-- Updates all templates and categories to Swedish

-- Update Cookie Categories to Swedish
UPDATE cookie_categories SET 
  name = 'Nödvändiga',
  description = 'Nödvändiga cookies för grundläggande webbplatsfunktionalitet. Dessa kan inte stängas av.'
WHERE name = 'essential';

UPDATE cookie_categories SET 
  name = 'Funktionella',
  description = 'Cookies som förbättrar webbplatsfunktionalitet och personalisering.'
WHERE name = 'functional';

UPDATE cookie_categories SET 
  name = 'Analys',
  description = 'Cookies för webbplatsanalys och prestandaövervakning.'
WHERE name = 'analytics';

UPDATE cookie_categories SET 
  name = 'Marknadsföring',
  description = 'Cookies som används för reklam och marknadsföring.'
WHERE name = 'advertising';

UPDATE cookie_categories SET 
  name = 'Sociala medier',
  description = 'Cookies från sociala medieplattformar och delningswidgets.'
WHERE name = 'social';

-- Update Banner Template to Swedish
UPDATE policy_templates 
SET content = '<div class="vision-privacy-banner">
  <div class="banner-content">
    <h3>🍪 Vi värnar om din integritet</h3>
    <p>Vi använder cookies för att ge dig den bästa upplevelsen på vår webbplats. Genom att klicka på "Acceptera alla" godkänner du vår användning av cookies.</p>
    <div class="banner-buttons">
      <button class="btn-accept-all" data-action="accept-all">Acceptera alla</button>
      <button class="btn-reject-all" data-action="reject-all">Avvisa alla</button>
      <button class="btn-customize" data-action="customize">Anpassa</button>
    </div>
    <div class="banner-links">
      <button class="banner-link" data-policy="privacy" type="button">Integritetspolicy</button>
      <span class="separator">•</span>
      <button class="banner-link" data-policy="cookie" type="button">Cookiepolicy</button>
    </div>
  </div>
</div>'
WHERE template_type = 'banner';

-- Swedish Cookie Policy Template
UPDATE policy_templates 
SET content = '# Cookiepolicy

## Om denna policy
Senast uppdaterad: {{last_updated}}

Denna cookiepolicy förklarar hur {{company_name}} ({{site_domain}}) använder cookies och liknande tekniker.

## Vad är cookies?
Cookies är små textfiler som lagras på din enhet när du besöker en webbplats. De hjälper webbplatsen att komma ihåg dina preferenser och förbättra din upplevelse.

## Hur vi använder cookies

### Nödvändiga Cookies
Dessa cookies är nödvändiga för att webbplatsen ska fungera korrekt. De kan inte stängas av.

**Cookies vi använder:**
{{#each essential_cookies}}
- **{{name}}**: {{description}} (Giltighetstid: {{duration}})
{{/each}}

### Funktionella Cookies
Dessa cookies förbättrar webbplatsens funktionalitet och personalisering.

{{#each functional_cookies}}
- **{{name}}**: {{description}} (Giltighetstid: {{duration}})
{{/each}}

### Analys Cookies
Vi använder dessa cookies för att förstå hur besökare använder vår webbplats.

{{#each analytics_cookies}}
- **{{name}}**: {{description}} (Giltighetstid: {{duration}})
{{/each}}

### Marknadsföring Cookies
Dessa cookies används för att visa relevanta annonser.

{{#each advertising_cookies}}
- **{{name}}**: {{description}} (Giltighetstid: {{duration}})
{{/each}}

### Sociala Medier Cookies
Cookies från sociala medieplattformar för delning och integration.

{{#each social_cookies}}
- **{{name}}**: {{description}} (Giltighetstid: {{duration}})
{{/each}}

## Upptäckta cookies på denna webbplats

Vi har automatiskt upptäckt följande cookies på {{site_domain}}:

{{#each detected_cookies}}
- **{{name}}** ({{category}}) - {{description}}
{{/each}}

## Dina val och rättigheter

Du kan när som helst ändra dina cookie-inställningar genom att klicka på "Cookie-inställningar" längst ner på sidan.

### Dina rättigheter enligt GDPR:
- Rätt att acceptera eller avvisa cookies
- Rätt att ändra dina preferenser när som helst
- Rätt att radera dina cookie-preferenser
- Rätt till information om vilka cookies som används

## Hur länge sparas cookies?

- **Sessionscookies**: Raderas när du stänger webbläsaren
- **Permanenta cookies**: Sparas enligt angiven giltighetstid
- **Ditt medgivande**: Sparas i 12 månader

## Tredjepartscookies

Vissa cookies sätts av tredjepartstjänster som visas på våra sidor:

{{#each third_party_services}}
- **{{name}}**: {{description}}
{{/each}}

## Kontakta oss

Om du har frågor om vår användning av cookies, kontakta oss:

**{{company_name}}**
E-post: {{contact_email}}
Webbplats: {{site_domain}}

## Ändringar av denna policy

Vi kan uppdatera denna cookiepolicy från tid till annan. Senaste uppdateringen gjordes: {{last_updated}}
'
WHERE template_type = 'policy';

-- Swedish Privacy Policy Template
INSERT INTO policy_templates (template_type, content, version, is_active, created_by) VALUES
('privacy_policy',
'# Integritetspolicy

## Introduktion
Senast uppdaterad: {{last_updated}}

{{company_name}} ("vi", "oss", "vår") respekterar din integritet och är engagerade i att skydda dina personuppgifter.

**Webbplats:** {{site_domain}}
**Kontakt:** {{contact_email}}

## Personuppgiftsansvarig

{{company_name}} är personuppgiftsansvarig för behandlingen av dina personuppgifter.

## Vilka personuppgifter samlar vi in?

### Automatiskt insamlade uppgifter:
- **IP-adress** (hashad för integritet)
- **Cookie-preferenser**
- **Webbläsarinformation** (typ, version, språk)
- **Tidsstämpel** för ditt besök
- **Enhetstyp** (dator, mobil, surfplatta)

### Uppgifter du tillhandahåller:
- Kontaktinformation (om du fyller i formulär)
- Meddelanden (om du kontaktar oss)

## Hur använder vi dina personuppgifter?

Vi behandlar dina personuppgifter för att:

1. **Respektera dina cookie-preferenser** (Rättslig grund: Samtycke)
2. **Förbättra vår webbplats** (Rättslig grund: Berättigat intresse)
3. **Följa lagkrav** (Rättslig grund: Rättslig förpliktelse)
4. **Säkerhet och bedrägeriförebyggande** (Rättslig grund: Berättigat intresse)

## Rättslig grund för behandling

Vi behandlar dina personuppgifter baserat på:
- **Samtycke**: För cookies och spårning
- **Berättigat intresse**: För webbplatsförbättring och säkerhet
- **Rättslig förpliktelse**: För att följa GDPR och andra lagar

## Hur länge sparar vi dina uppgifter?

- **Cookie-medgivanden**: 12 månader
- **Hashad IP-adress**: 30 dagar
- **Anonymiserad statistik**: Obegränsat
- **Kontaktförfrågningar**: 24 månader

## Dina rättigheter enligt GDPR

Du har följande rättigheter:

### 1. Rätt till tillgång (Artikel 15)
Du har rätt att få information om vilka personuppgifter vi behandlar om dig.

### 2. Rätt till rättelse (Artikel 16)
Du har rätt att få felaktiga uppgifter rättade.

### 3. Rätt till radering (Artikel 17)
Du har rätt att få dina uppgifter raderade ("rätten att bli glömd").

### 4. Rätt till begränsning (Artikel 18)
Du har rätt att begära begränsad behandling av dina uppgifter.

### 5. Rätt till dataportabilitet (Artikel 20)
Du har rätt att få ut dina uppgifter i ett strukturerat format.

### 6. Rätt att invända (Artikel 21)
Du har rätt att invända mot behandling av dina uppgifter.

### 7. Rätt att återkalla samtycke
Du kan när som helst återkalla ditt samtycke för cookies.

## Hur utövar du dina rättigheter?

Kontakta oss på: {{contact_email}}

Vi svarar på din begäran inom 30 dagar.

## Cookies och spårning

Vi använder cookies enligt vår [Cookiepolicy](/cookiepolicy).

Du kan ändra dina cookie-inställningar när som helst genom att klicka på "Cookie-inställningar" på webbplatsen.

## Delning av personuppgifter

Vi delar INTE dina personuppgifter med tredje part, förutom:

- **Tekniska leverantörer**: För hosting och drift (Vercel, Supabase)
- **Analystjänster**: Om du har godkänt analys-cookies
- **Lagkrav**: Om vi är skyldiga enligt lag

Alla våra leverantörer är GDPR-kompatibla och har databehandlingsavtal.

## Internationella överföringar

Dina uppgifter kan behandlas inom EU/EES. Om uppgifter överförs utanför EU/EES säkerställer vi adekvat skyddsnivå genom:
- EU:s standardavtalsklausuler
- Adequacy decisions
- Privacy Shield (där tillämpligt)

## Säkerhet

Vi skyddar dina personuppgifter genom:
- **Kryptering**: HTTPS/TLS för all datatrafik
- **Hashning**: IP-adresser hashas för integritet
- **Åtkomstkontroll**: Begränsad åtkomst till personuppgifter
- **Regelbundna säkerhetsgranskningar**

## Barn

Vår webbplats riktar sig inte till barn under 16 år. Vi samlar inte medvetet in personuppgifter från barn.

## Ändringar av denna policy

Vi kan uppdatera denna integritetspolicy. Väsentliga ändringar meddelas på webbplatsen.

**Senast uppdaterad:** {{last_updated}}

## Klagomål

Om du är missnöjd med hur vi behandlar dina personuppgifter har du rätt att lämna klagomål till:

**Integritetsskyddsmyndigheten (IMY)**
Box 8114
104 20 Stockholm
E-post: imy@imy.se
Telefon: 08-657 61 00

## Kontakta oss

Om du har frågor om denna integritetspolicy eller vår behandling av personuppgifter:

**{{company_name}}**
E-post: {{contact_email}}
Webbplats: {{site_domain}}

---

*Denna integritetspolicy är upprättad i enlighet med EU:s dataskyddsförordning (GDPR) och svensk dataskyddslagstiftning.*
',
'1.0.0',
true,
'system');

-- Add Swedish button labels to banner config
INSERT INTO policy_templates (template_type, content, version, is_active, created_by) VALUES
('banner_config',
'{
  "title": "Vi värnar om din integritet",
  "description": "Vi använder cookies för att ge dig den bästa upplevelsen på vår webbplats.",
  "buttons": {
    "accept_all": "Acceptera alla",
    "reject_all": "Avvisa alla",
    "customize": "Anpassa",
    "save_preferences": "Spara inställningar",
    "close": "Stäng"
  },
  "links": {
    "privacy_policy": "Integritetspolicy",
    "cookie_policy": "Cookiepolicy"
  },
  "modal": {
    "title": "Anpassa cookie-inställningar",
    "description": "Välj vilka typer av cookies du vill tillåta",
    "essential_badge": "Krävs",
    "essential_note": "Nödvändiga cookies kan inte stängas av"
  },
  "floating_button": {
    "text": "Cookie-inställningar",
    "aria_label": "Ändra cookie-inställningar"
  }
}',
'1.0.0',
true,
'system');