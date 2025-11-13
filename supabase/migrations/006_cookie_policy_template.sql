-- Policy Templates (Swedish)
-- Comprehensive GDPR-compliant policy templates with dynamic placeholders

-- First, delete any existing policy templates to ensure clean state
DELETE FROM policy_templates WHERE template_type IN ('cookie_notice', 'policy');

-- Insert the comprehensive Swedish cookie policy template
INSERT INTO policy_templates (template_type, content, version, is_active, created_by) VALUES
('cookie_notice',
'<h1>Cookie Policy (Kakor)</h1>
<p><strong>Denna policy uppdaterades:</strong> {{LAST_UPDATED_DATE}}</p>

<h2>Inledning</h2>
<p>Denna policy kompletterar vår <button class="vp-policy-link" data-policy="privacy" type="button">Integritetspolicy</button> och förklarar hur vi använder cookies och liknande tekniker på {{DOMAIN_NAME}}.</p>

<h2>Vad är Cookies?</h2>
<p>En cookie är en liten textfil som lagras på din enhet (dator, surfplatta eller mobil) när du besöker en webbplats. De används för att få webbplatsen att fungera mer effektivt, ge oss information om ditt besök, och i vissa fall, samla in personuppgifter.</p>

<h2>Ditt samtycke</h2>
<p>Vi lagrar eller får tillgång till information på din utrustning endast om det är strikt nödvändigt för att tillhandahålla en tjänst som du uttryckligen har begärt (se Nödvändiga Cookies nedan). För alla övriga cookies, inklusive funktionalitet, analys och marknadsföring, inhämtar vi ditt uttryckliga samtycke i enlighet med Lagen om elektronisk kommunikation (LEK) och GDPR.</p>
<p>Du kan när som helst ändra eller återkalla ditt samtycke via vår <button class="vp-settings-link" type="button">inställningsmodul</button>.</p>

<h2>Vilka typer av Cookies använder vi?</h2>

<h3>Nödvändiga Cookies</h3>
<p><strong>Syfte och rättslig grund:</strong> Essentiella för webbplatsens grundläggande funktioner, såsom säker inloggning, varukorgsfunktionalitet eller säkerhet. Dessa kräver inte samtycke då de är nödvändiga för att tillhandahålla en tjänst du uttryckligen begärt.</p>
<p><strong>Rättslig grund:</strong> Berättigat Intresse, GDPR Art. 6.1 f</p>
<p><strong>Cookies och leverantörer:</strong></p>
{{ESSENTIAL_COOKIES_LIST}}

<h3>Funktionella Cookies</h3>
<p><strong>Syfte och rättslig grund:</strong> Förbättrar webbplatsens funktionalitet och personalisering, såsom språkval, videouppspelning (t.ex. YouTube/Vimeo) eller live-chatt. Kräver Samtycke enligt e-Privacy/LEK.</p>
<p><strong>Rättslig grund:</strong> Samtycke, GDPR Art. 6.1 a</p>
<p><strong>Cookies och leverantörer:</strong></p>
{{FUNCTIONAL_COOKIES_LIST}}

<h3>Analys Cookies</h3>
<p><strong>Syfte och rättslig grund:</strong> Hjälper oss att förstå hur besökare interagerar med webbplatsen (t.ex. vilka sidor som besöks, hur länge). Används för att förbättra webbplatsens prestanda. Kräver Samtycke enligt e-Privacy/LEK.</p>
<p><strong>Rättslig grund:</strong> Samtycke, GDPR Art. 6.1 a</p>
<p><strong>Cookies och leverantörer:</strong></p>
{{ANALYTICS_COOKIES_LIST}}

<h3>Marknadsföring Cookies</h3>
<p><strong>Syfte och rättslig grund:</strong> Spårar besökare över webbplatser för att visa relevanta och engagerande annonser. De bygger en profil av dina intressen för riktad annonsering. Kräver uttryckligt Samtycke enligt e-Privacy/LEK.</p>
<p><strong>Rättslig grund:</strong> Samtycke, GDPR Art. 6.1 a</p>
<p><strong>Cookies och leverantörer:</strong></p>
{{ADVERTISING_COOKIES_LIST}}

<h2>Hur kan jag hantera Cookies?</h2>
<p>Du kan när som helst ändra dina cookie-inställningar via <button class="vp-settings-link" type="button">inställningsmodulen</button>. Du kan också:</p>
<ul>
  <li>Radera cookies i din webbläsares historik</li>
  <li>Blockera cookies genom din webbläsares inställningar</li>
</ul>

<h2>Första- och tredjepartscookies</h2>
<p>Cookies delas in i följande kategorier beroende på vem som sätter dem:</p>
<ul>
  <li><strong>Förstapartscookies:</strong> Sätts av den webbplats du besöker, i detta fall {{DOMAIN_NAME}}. Dessa används oftast för nödvändiga funktioner och för att komma ihåg dina inställningar.</li>
  <li><strong>Tredjepartscookies:</strong> Sätts av en annan domän än den webbplats du besöker. Dessa används av våra partners för funktioner, analys och marknadsföring (t.ex. Google, Meta/Facebook, YouTube). Vi har ett avtal med dessa parter som reglerar hanteringen av dina uppgifter.</li>
</ul>

<h2>Överföring till tredje land</h2>
<p>I den mån Tredjepartscookies används kan personuppgifter (såsom IP-adresser och cookie-ID:n) överföras till länder utanför EU/EES, i synnerhet USA (via leverantörer som Google och Meta).</p>
<p>Vi säkerställer att dessa överföringar sker i enlighet med GDPR genom att använda EU:s standardavtalsklausuler (SCCs) och, vid behov, ytterligare skyddsåtgärder för att skydda din data. Genom att lämna samtycke till Marknadsföringscookies godkänner du denna överföring.</p>

<h2>Lagringstid (hur länge sparas kakorna?)</h2>
<p>Lagringstiden (livslängden) för varje cookie varierar beroende på dess syfte. Cookies kan vara:</p>
<ul>
  <li><strong>Sessionscookies:</strong> Dessa raderas automatiskt när du stänger din webbläsare.</li>
  <li><strong>Varaktiga cookies (Persistent):</strong> Dessa lagras på din enhet under en bestämd period eller tills du raderar dem manuellt.</li>
</ul>

<h3>Detaljerad cookielista</h3>
{{COOKIE_DETAILS_TABLE}}

<h2>Dina rättigheter</h2>
<p>Eftersom cookies ofta behandlar personuppgifter (som IP-adresser eller unika ID:n), har du som användare rättigheter enligt GDPR. Dessa rättigheter beskrivs mer i detalj i vår fullständiga <button class="vp-policy-link" data-policy="privacy" type="button">Integritetspolicy</button>, men inkluderar:</p>
<ul>
  <li><strong>Rätt till tillgång:</strong> Du kan begära ut vilka personuppgifter vi behandlar.</li>
  <li><strong>Rätt till rättelse:</strong> Rätt att få felaktiga uppgifter korrigerade.</li>
  <li><strong>Rätt till radering ("Rätten att bli glömd"):</strong> Rätt att få dina personuppgifter raderade, till exempel om du återkallar ditt samtycke.</li>
</ul>

<h2>Hur du kan återkalla eller ändra samtycke</h2>
<p>Ditt samtycke till cookies är helt frivilligt, och du har rätt att ändra dig när som helst.</p>
<ul>
  <li>Du kan återkalla eller ändra ditt val genom att klicka på <button class="vp-settings-link" type="button">inställningsmodulen</button></li>
  <li>Denna länk/ikon finns permanent tillgänglig på {{DOMAIN_NAME}}</li>
  <li>Du kan också radera cookies direkt via din webbläsares inställningar</li>
</ul>

<h2>Klagomål</h2>
<p>Om du anser att vi har brutit mot reglerna för cookies eller databehandling, har du rätt att lämna in ett klagomål till den nationella tillsynsmyndigheten:</p>
<p><strong>Integritetsskyddsmyndigheten (IMY)</strong><br>
Webbplats: <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer">www.imy.se</a></p>

<h2>Kontaktinformation</h2>
<p>För alla frågor rörande vår användning av cookies, vänligen kontakta:</p>
<ul>
  <li><strong>Företagsnamn:</strong> {{COMPANY_NAME}}</li>
  <li><strong>Kontaktperson:</strong> {{CONTACT_EMAIL}}</li>
  <li><strong>Adress:</strong> {{COMPANY_ADDRESS}}</li>
</ul>',
'1.0.0',
true,
'system');


-- Insert the comprehensive Swedish privacy policy template
INSERT INTO policy_templates (template_type, content, version, is_active, created_by) VALUES
('policy',
'<h1>Integritetspolicy</h1>
<p>{{COMPANY_NAME_OR_DOMAIN}} värnar om din integritet och är engagerade i att skydda dina personuppgifter. Denna Integritetspolicy förklarar hur vi samlar in, använder och skyddar dina personuppgifter i enlighet med EU:s Dataskyddsförordning (GDPR, Förordning (EU) 2016/679) och svensk lagstiftning.</p>
<p><strong>Denna policy uppdaterades:</strong> {{LAST_UPDATED_DATE}}</p>

<h2>Personuppgiftsansvarig och kontaktinformation</h2>
<p>Den juridiska person som ansvarar för behandlingen av dina personuppgifter är:</p>
<ul>
  <li><strong>Företagsnamn:</strong> {{COMPANY_NAME}}</li>
  <li><strong>Organisationsnummer:</strong> {{ORG_NUMBER}}</li>
  <li><strong>Adress:</strong> {{COMPANY_ADDRESS}}</li>
  <li><strong>E-post:</strong> {{CONTACT_EMAIL}}</li>
</ul>

<h2>Vilka personuppgifter behandlar vi?</h2>
<p>Vi behandlar personuppgifter som du lämnar direkt till oss (t.ex. vid köp eller kontakt) eller som samlas in automatiskt via din användning av vår webbplats.</p>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <thead>
    <tr style="background: #f5f5f5;">
      <th style="padding: 12px; text-align: left; border: 1px solid #e0e0e0;">Källa</th>
      <th style="padding: 12px; text-align: left; border: 1px solid #e0e0e0;">Exempel på data (Kategorier)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 12px; border: 1px solid #e0e0e0;"><strong>Direkt från dig</strong></td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Namn, E-postadress, Telefonnummer, Faktura- och Leveransadress, Betalningsinformation.</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e0e0e0;"><strong>Formulär och kommentarer</strong></td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Innehåll i meddelanden, formulärsvar, kommentarstext, användarnamn, tidpunkt.</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e0e0e0;"><strong>Automatiskt insamlad (Webbplatsdata)</strong></td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">IP-adress, Enhets-ID, Webbläsartyp, Geografisk plats, Besökshistorik, Cookie-ID.</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e0e0e0;"><strong>Från våra plugins</strong></td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Registreringsdata (om användarkonton finns), data från {{FORM_PLUGIN_NAME}}, data från {{ECOM_PLUGIN_NAME}}.</td>
    </tr>
  </tbody>
</table>

<h2>Ändamål och rättslig grund för behandlingen</h2>
<p>Vi behandlar dina personuppgifter för följande specifika ändamål och med stöd av de lagliga grunder som anges i GDPR (Artikel 6).</p>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <thead>
    <tr style="background: #f5f5f5;">
      <th style="padding: 12px; text-align: left; border: 1px solid #e0e0e0;">Ändamål med behandlingen</th>
      <th style="padding: 12px; text-align: left; border: 1px solid #e0e0e0;">Kategorier av data</th>
      <th style="padding: 12px; text-align: left; border: 1px solid #e0e0e0;">Rättslig grund (GDPR)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 12px; border: 1px solid #e0e0e0;"><strong>Fullgöra avtal (Köptransaktioner)</strong></td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Namn, adress, betalningsdata, orderhistorik.</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Avtal (Art. 6.1 b) – Nödvändigt för att slutföra ditt köp och leverera varan/tjänsten.</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e0e0e0;"><strong>Kundservice & frågor</strong></td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Namn, kontaktuppgifter, innehåll i korrespondens.</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Berättigat Intresse (Art. 6.1 f) – Vårt intresse av att svara på dina förfrågningar effektivt och ge dig god service.</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e0e0e0;"><strong>Marknadsföring & nyhetsbrev</strong></td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">E-post, namn, intresseområden, webbläsarhistorik (via cookies).</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Samtycke (Art. 6.1 a) – För riktad marknadsföring och nyhetsbrev. Du måste aktivt ha anmält dig.</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e0e0e0;"><strong>Webbplatsutveckling & analys</strong></td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">IP-adress, teknisk data, aktivitetsloggar (via cookies).</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Samtycke (Art. 6.1 a) – För analyscookies. Berättigat Intresse (Art. 6.1 f) – För nödvändiga funktioner och anonymiserad statistik.</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e0e0e0;"><strong>Lagkrav och rättsliga förpliktelser</strong></td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Bokföringsdata, finansiella transaktioner.</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Rättslig Förpliktelse (Art. 6.1 c) – Att uppfylla krav enligt Bokföringslagen och andra lagar.</td>
    </tr>
  </tbody>
</table>

<h2>Hur vi delar dina personuppgifter (Mottagare)</h2>
<p>Vi säljer aldrig dina uppgifter. Vi delar endast dina personuppgifter med pålitliga parter ("Personuppgiftsbiträden") som hjälper oss att leverera tjänsterna. Vi har ingått Personuppgiftsbiträdesavtal (PUB-avtal) med dessa parter för att säkerställa att de behandlar dina uppgifter enligt våra instruktioner och GDPR.</p>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <thead>
    <tr style="background: #f5f5f5;">
      <th style="padding: 12px; text-align: left; border: 1px solid #e0e0e0;">Kategori av mottagare</th>
      <th style="padding: 12px; text-align: left; border: 1px solid #e0e0e0;">Exempel på mottagare/tjänster</th>
      <th style="padding: 12px; text-align: left; border: 1px solid #e0e0e0;">Delade uppgifter</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 12px; border: 1px solid #e0e0e0;"><strong>Hosting & teknik</strong></td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Leverantörer av serverdrift, databaser och tekniska underhållstjänster.</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Tekniska loggar, backup-data.</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e0e0e0;"><strong>Betalning & ekonomi</strong></td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Betaltjänstleverantörer och system för fakturahantering.</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Namn, adress, ordernummer, betalningsinformation.</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e0e0e0;"><strong>Kommunikation & CRM</strong></td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Leverantörer av e-postutskick och kundrelationssystem (CRM).</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Namn, E-postadress (vid samtycke).</td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #e0e0e0;"><strong>Analys & marknadsföring</strong></td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">Plattformar för webbanalys, annonsnätverk och verktyg för målgruppsanpassning.</td>
      <td style="padding: 12px; border: 1px solid #e0e0e0;">IP-adresser, Cookie-ID, aktivitetsloggar (endast vid samtycke).</td>
    </tr>
  </tbody>
</table>

<h2>Överföring till tredje land (utanför EU/EES)</h2>
<p>I vissa fall kan dina personuppgifter komma att överföras till och behandlas i länder utanför EU/EES ("Tredje Land"), till exempel när vi använder molntjänster med serverdrift i USA (t.ex. Google, Meta).</p>
<ul>
  <li><strong>Skyddsåtgärder:</strong> Vi säkerställer att överföringen uppfyller kraven i GDPR. Detta sker genom att använda EU-kommissionens Standardavtalsklausuler (SCCs) eller genom att säkerställa att mottagarlandet har adekvat skyddsnivå (t.ex. EU-US Data Privacy Framework).</li>
  <li>Du har rätt att på begäran få tillgång till handlingar som visar på dessa skyddsåtgärder.</li>
</ul>

<h2>Lagringstid (hur länge sparas dina uppgifter?)</h2>
<p>Vi sparar dina personuppgifter endast så länge det är nödvändigt för det specifika ändamål de samlades in för, i enlighet med principen om lagringsminimering.</p>
<ul>
  <li><strong>Kunddata (avtal):</strong> Sparas under avtalstiden och därefter i 48 månader för att hantera reklamationer och garantier, om inte annan lagstiftning kräver längre tid.</li>
  <li><strong>Bokföringsunderlag:</strong> Sparas i sju (7) år plus innevarande år enligt Bokföringslagen.</li>
  <li><strong>Data baserad på Samtycke (t.ex. Marknadsföring, Analys):</strong> Sparas tills ditt samtycke återkallas eller tills du invänder mot behandlingen.</li>
  <li><strong>Formulärdata (Supportärenden/Kontakt):</strong> Sparas i upp till 48 månader efter att ärendet har avslutats.</li>
  <li><strong>Cookies:</strong> Lagringstiderna för cookies specificeras i vår separata <button class="vp-policy-link" data-policy="cookie" type="button">Cookiepolicy</button>.</li>
</ul>

<h2>Dina rättigheter som registrerad (GDPR Artikel 15–22)</h2>
<p>Du har följande rättigheter i förhållande till dina personuppgifter:</p>
<ol>
  <li><strong>Rätt till Tillgång (Registerutdrag):</strong> Du har rätt att få bekräftelse på om vi behandlar personuppgifter om dig och få en kopia av de uppgifterna (registerutdrag).</li>
  <li><strong>Rätt till rättelse:</strong> Du har rätt att få felaktiga eller ofullständiga uppgifter rättade.</li>
  <li><strong>Rätt till radering (Rätten att bli glömd):</strong> Du har rätt att begära radering av dina uppgifter under vissa omständigheter (t.ex. om uppgifterna inte längre behövs för de ändamål de samlades in för, eller om du återkallar ditt samtycke).</li>
  <li><strong>Rätt till begränsning:</strong> Du har rätt att begära att vår behandling begränsas.</li>
  <li><strong>Rätt att invända:</strong> Du har rätt att invända mot behandling som baseras på Berättigat Intresse (Art. 6.1 f).</li>
  <li><strong>Rätt till dataportabilitet:</strong> Du har rätt att få de uppgifter du lämnat till oss överförda till dig eller en annan personuppgiftsansvarig i ett strukturerat, allmänt använt och maskinläsbart format.</li>
  <li><strong>Rätt att återkalla samtycke:</strong> Om vår behandling baseras på ditt samtycke, har du rätt att återkalla det när som helst utan att det påverkar lagligheten av behandlingen innan återkallelsen.</li>
</ol>
<p>För att utöva dina rättigheter, vänligen kontakta oss via e-postadressen ovan.</p>

<h2>Automatiserat beslutsfattande och profilering</h2>
<p>Vi använder inte automatiserat beslutsfattande eller profilering som får rättsliga effekter eller på liknande sätt påverkar dig i betydande grad.</p>
<p>Det innebär att beslut som har juridiska eller betydande konsekvenser för dig (såsom nekad kredit, avslag på en ansökan eller liknande) inte fattas enbart baserat på automatisk behandling av dina personuppgifter.</p>
<p>Vi kan dock använda profilering för enklare marknadsföringssyften (till exempel för att visa dig relevanta annonser eller anpassat innehåll på webbplatsen), men sådan profilering har inga betydande konsekvenser för dig.</p>

<h2>Källan till personuppgifterna</h2>
<p>Personuppgifterna som behandlas kommer i första hand direkt från dig som registrerad (t.ex. genom formulär, registreringar och e-postkorrespondens).</p>
<p><strong>Teknisk insamling:</strong> Vi samlar också in teknisk data och aktivitetsdata automatiskt (t.ex. IP-adresser och cookie-ID) när du använder vår webbplats. Denna data genereras av ditt besök, men samlas inte in från externa källor.</p>

<h2>Ändringar i policyn</h2>
<p>Vi förbehåller oss rätten att uppdatera denna Integritetspolicy. Den senaste versionen finns alltid tillgänglig här. Större ändringar kommer att meddelas i förväg på vår webbplats eller via e-post, om det rör ändringar som påverkar hur vi behandlar dina personuppgifter.</p>

<h2>Klagomål till Tillsynsmyndigheten</h2>
<p>Om du anser att vår behandling av dina personuppgifter strider mot GDPR, har du rätt att lämna in ett klagomål till den svenska tillsynsmyndigheten:</p>
<p><strong>Integritetsskyddsmyndigheten (IMY)</strong><br>
Postadress: Box 8114, 104 20 Stockholm<br>
Webbplats: <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer">www.imy.se</a></p>',
'1.0.0',
true,
'system');
