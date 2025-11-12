# 🎨 Client-Facing Customization Guide

## Overview

This guide covers all client-facing customizations needed for Swedish market deployment.

---

## 📋 Your Requirements Checklist

### ✅ What You Need:

1. **Swedish Language** - Banner, plugin UI, policies
2. **Accurate Policy Templates** - Cookie & Privacy policies with dynamic data
3. **Stunning Visual Design** - Modern, professional banner and settings modal
4. **Persistent Settings Button** - Floating button to change preferences anytime
5. **WordPress Plugin UI** - Swedish admin interface

---

## 🇸🇪 1. Swedish Language Translation

### Where to Change Language:

#### A. Cookie Banner Text
**File:** `supabase/migrations/004_seed_data.sql`

Current (English):
```sql
INSERT INTO policy_templates (template_type, content, version, is_active, created_by) VALUES
('banner', 
'<div class="vision-privacy-banner">
  <div class="banner-content">
    <h3>Cookie Consent</h3>
    <p>We use cookies to enhance your browsing experience...</p>
```

**Update to Swedish:**
```sql
INSERT INTO policy_templates (template_type, content, version, is_active, created_by) VALUES
('banner', 
'<div class="vision-privacy-banner">
  <div class="banner-content">
    <h3>Cookie-medgivande</h3>
    <p>Vi använder cookies för att förbättra din upplevelse...</p>
```

#### B. Cookie Categories
**File:** `supabase/migrations/004_seed_data.sql`

Update to Swedish:
```sql
INSERT INTO cookie_categories (name, description, is_essential, sort_order, is_active) VALUES
('essential', 'Nödvändiga cookies för grundläggande webbplatsfunktionalitet', true, 1, true),
('functional', 'Cookies som förbättrar webbplatsfunktionalitet', false, 2, true),
('analytics', 'Cookies för webbplatsanalys och prestandaövervakning', false, 3, true),
('advertising', 'Cookies för reklam och marknadsföring', false, 4, true),
('social', 'Cookies från sociala medieplattformar', false, 5, true);
```

---

## 📄 2. Policy Templates with Dynamic Data

### Current System:

Policies are stored in `policy_templates` table and support dynamic fields.

### Where Policies Are Generated:

**File:** `src/app/api/policy/[site_id]/route.ts`

### Dynamic Fields Available:

```typescript
{
  site_domain: "example.com",
  site_name: "Example Site",
  company_name: "Your Company",
  contact_email: "privacy@example.com",
  last_updated: "2024-01-15",
  detected_cookies: [...],
  detected_scripts: [...],
  cookie_categories: [...]
}
```

### How to Update Policy Templates:

#### Option 1: Via Database Migration
Create: `supabase/migrations/005_swedish_policies.sql`

`
``sql
-- Swedish Cookie Policy Template
UPDATE policy_templates 
SET content = '
# Cookiepolicy

## Om Cookies
Denna webbplats använder cookies för att förbättra din upplevelse.

## Webbplats Information
- **Webbplats:** {{site_domain}}
- **Företag:** {{company_name}}
- **Kontakt:** {{contact_email}}
- **Senast uppdaterad:** {{last_updated}}

## Cookie-kategorier

### Nödvändiga Cookies
Dessa cookies är nödvändiga för att webbplatsen ska fungera.

{{#each essential_cookies}}
- **{{name}}**: {{description}}
{{/each}}

### Funktionella Cookies
{{#each functional_cookies}}
- **{{name}}**: {{description}}
{{/each}}

### Analys Cookies
{{#each analytics_cookies}}
- **{{name}}**: {{description}}
{{/each}}

## Dina Rättigheter
Du kan när som helst ändra dina cookie-inställningar.

## Kontakta Oss
För frågor om denna policy, kontakta oss på {{contact_email}}.
'
WHERE template_type = 'policy';

-- Swedish Privacy Policy Template
INSERT INTO policy_templates (template_type, content, version, is_active, created_by) VALUES
('privacy_policy',
'# Integritetspolicy

## Introduktion
{{company_name}} respekterar din integritet.

## Personuppgifter Vi Samlar In
- IP-adress (hashad för integritet)
- Cookie-preferenser
- Webbläsarinformation

## Hur Vi Använder Data
Vi använder denna information för att:
- Respektera dina cookie-preferenser
- Förbättra vår tjänst
- Följa lagkrav (GDPR)

## Dina Rättigheter (GDPR)
Du har rätt att:
- Få tillgång till dina data
- Radera dina data
- Ändra dina preferenser
- Invända mot behandling

## Datalagring
- Cookie-medgivanden: 12 månader
- Hashad IP: 30 dagar
- Anonymiserad statistik: Obegränsat

## Kontakt
{{company_name}}
E-post: {{contact_email}}
Webbplats: {{site_domain}}

Senast uppdaterad: {{last_updated}}
',
'1.0.0',
true,
'system');
```

#### Option 2: Via Admin API
```bash
curl -X POST https://your-app.vercel.app/api/admin/templates \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template_type": "policy",
    "content": "Swedish policy content here...",
    "version": "1.1.0"
  }'
```

---

## 🎨 3. Stunning Visual Design

### Current Banner Design

The banner is basic. Let's create a modern, Swedish-style design.

### Create Enhanced Banner Template

**File to create:** `supabase/migrations/006_enhanced_swedish_banner.sql`

```sql
-- Modern Swedish Cookie Banner
UPDATE policy_templates 
SET content = '
<div class="vision-privacy-banner" data-banner-version="2.0">
  <div class="banner-overlay"></div>
  <div class="banner-container">
    <div class="banner-content">
      <div class="banner-icon">
        🍪
      </div>
      <div class="banner-text">
        <h3>Vi värnar om din integritet</h3>
        <p>Vi använder cookies för att ge dig den bästa upplevelsen på vår webbplats. Genom att fortsätta godkänner du vår användning av cookies.</p>
      </div>
    </div>
    <div class="banner-actions">
      <button class="btn btn-primary" data-action="accept-all">
        <span class="btn-icon">✓</span>
        Acceptera alla
      </button>
      <button class="btn btn-secondary" data-action="reject-all">
        <span class="btn-icon">✕</span>
        Avvisa alla
      </button>
      <button class="btn btn-outline" data-action="customize">
        <span class="btn-icon">⚙</span>
        Anpassa
      </button>
    </div>
    <div class="banner-footer">
      <a href="/integritetspolicy" class="banner-link">Integritetspolicy</a>
      <span class="banner-separator">•</span>
      <a href="/cookiepolicy" class="banner-link">Cookiepolicy</a>
    </div>
  </div>
</div>
'
WHERE template_type = 'banner';
```

### Enhanced CSS Styling

**File to create:** `public/vision-privacy-banner.css`

```css
/* Modern Swedish Cookie Banner Styles */
.vision-privacy-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  animation: slideUp 0.4s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.banner-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
  z-index: -1;
}

.banner-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  border-radius: 20px 20px 0 0;
}

.banner-content {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.banner-icon {
  font-size: 3rem;
  line-height: 1;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.banner-text h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.banner-text p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  opacity: 0.95;
}

.banner-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 1rem;
}

.btn {
  padding: 0.875rem 2rem;
  border: none;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.btn-primary {
  background: white;
  color: #667eea;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
}

.btn-outline {
  background: transparent;
  color: white;
  border: 2px solid white;
}

.btn-icon {
  font-size: 1.2rem;
}

.banner-footer {
  text-align: center;
  font-size: 0.875rem;
  opacity: 0.9;
}

.banner-link {
  color: white;
  text-decoration: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  transition: border-color 0.3s;
}

.banner-link:hover {
  border-bottom-color: white;
}

.banner-separator {
  margin: 0 0.75rem;
  opacity: 0.5;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .banner-container {
    padding: 1.5rem;
  }
  
  .banner-content {
    flex-direction: column;
    text-align: center;
  }
  
  .banner-icon {
    font-size: 2.5rem;
  }
  
  .banner-text h3 {
    font-size: 1.25rem;
  }
  
  .banner-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}
```

---

## ⚙️ 4. Settings Modal Design

**File to create:** `public/vision-privacy-modal.css`

``
`css
/* Modern Settings Modal */
.vision-privacy-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000000;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: white;
  border-radius: 20px;
  max-width: 600px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 20px 20px 0 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
}

.modal-header p {
  margin: 0.5rem 0 0 0;
  opacity: 0.95;
}

.modal-body {
  padding: 2rem;
}

.cookie-category {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  transition: all 0.3s ease;
}

.cookie-category:hover {
  background: #e9ecef;
  transform: translateX(5px);
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  font-size: 1.1rem;
}

.category-icon {
  font-size: 1.5rem;
}

.toggle-switch {
  position: relative;
  width: 60px;
  height: 30px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 30px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

input:checked + .toggle-slider:before {
  transform: translateX(30px);
}

input:disabled + .toggle-slider {
  opacity: 0.5;
  cursor: not-allowed;
}

.category-description {
  color: #6c757d;
  font-size: 0.9rem;
  line-height: 1.5;
}

.essential-badge {
  display: inline-block;
  background: #28a745;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.5rem;
}

.modal-footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid #e9ecef;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.modal-footer .btn {
  padding: 0.75rem 2rem;
  border-radius: 50px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-save {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.btn-cancel {
  background: #f8f9fa;
  color: #495057;
  border: 2px solid #dee2e6;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1.5rem;
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .modal-footer .btn {
    width: 100%;
  }
}
```

---

## 🔘 5. Floating Settings Button

This is the persistent button that appears after user makes a choice.

**File to create:** `public/vision-privacy-floating-button.js`

```javascript
// Floating Cookie Settings Button
(function() {
  'use strict';
  
  // Check if user has made a consent choice
  function hasConsent() {
    return localStorage.getItem('vision-privacy-consent') !== null;
  }
  
  // Create floating button
  function createFloatingButton() {
    if (!hasConsent()) return;
    
    const button = document.createElement('button');
    button.className = 'vision-privacy-floating-btn';
    button.innerHTML = `
      <span class="floating-btn-icon">🍪</span>
      <span class="floating-btn-text">Cookie-inställningar</span>
    `;
    button.setAttribute('aria-label', 'Ändra cookie-inställningar');
    button.setAttribute('title', 'Ändra cookie-inställningar');
    
    // Add click handler to reopen settings
    button.addEventListener('click', function() {
      // Trigger the customize modal
      if (window.VisionPrivacy && window.VisionPrivacy.showSettings) {
        window.VisionPrivacy.showSettings();
      }
    });
    
    document.body.appendChild(button);
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingButton);
  } else {
    createFloatingButton();
  }
})();
```

**CSS for Floating Button:** `public/vision-privacy-floating-button.css`

```css
/* Floating Cookie Settings Button */
.vision-privacy-floating-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  z-index: 999998;
  transition: all 0.3s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
}

.vision-privacy-floating-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
}

.floating-btn-icon {
  font-size: 1.5rem;
  animation: wiggle 2s infinite;
}

@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-10deg); }
  75% { transform: rotate(10deg); }
}

.floating-btn-text {
  white-space: nowrap;
}

/* Mobile: Show only icon */
@media (max-width: 768px) {
  .vision-privacy-floating-btn {
    padding: 1rem;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    justify-content: center;
  }
  
  .floating-btn-text {
    display: none;
  }
  
  .floating-btn-icon {
    font-size: 1.75rem;
  }
}

/* Accessibility */
.vision-privacy-floating-btn:focus {
  outline: 3px solid #667eea;
  outline-offset: 3px;
}

/* Hide when banner is visible */
.vision-privacy-banner-visible .vision-privacy-floating-btn {
  display: none;
}
```

---

## 🔧 6. WordPress Plugin UI (Swedish)

### Plugin Admin Interface

**File:** `wp-plugin/admin/settings-page.php` (in your WordPress plugin)

```php
<div class="wrap vision-privacy-admin">
    <h1><?php echo esc_html__('Vision Privacy Inställningar', 'vision-privacy'); ?></h1>
    
    <div class="vision-privacy-card">
        <h2><?php echo esc_html__('Anslutningsstatus', 'vision-privacy'); ?></h2>
        <p class="status-connected">
            ✓ <?php echo esc_html__('Ansluten till Vision Privacy', 'vision-privacy'); ?>
        </p>
        <p>
            <strong><?php echo esc_html__('Webbplats-ID:', 'vision-privacy'); ?></strong> 
            <?php echo esc_html(get_option('vision_privacy_site_id')); ?>
        </p>
    </div>
    
    <div class="vision-privacy-card">
        <h2><?php echo esc_html__('Cookie-banner', 'vision-privacy'); ?></h2>
        <p><?php echo esc_html__('Cookie-bannern visas automatiskt för besökare.', 'vision-privacy'); ?></p>
        
        <table class="form-table">
            <tr>
                <th><?php echo esc_html__('Aktivera banner', 'vision-privacy'); ?></th>
                <td>
                    <label>
                        <input type="checkbox" name="banner_enabled" checked>
                        <?php echo esc_html__('Visa cookie-banner', 'vision-privacy'); ?>
                    </label>
                </td>
            </tr>
            <tr>
                <th><?php echo esc_html__('Position', 'vision-privacy'); ?></th>
                <td>
                    <select name="banner_position">
                        <option value="bottom"><?php echo esc_html__('Botten', 'vision-privacy'); ?></option>
                        <option value="top"><?php echo esc_html__('Topp', 'vision-privacy'); ?></option>
                    </select>
                </td>
            </tr>
        </table>
    </div>
    
    <div class="vision-privacy-card">
        <h2><?php echo esc_html__('Statistik', 'vision-privacy'); ?></h2>
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-number">1,234</div>
                <div class="stat-label"><?php echo esc_html__('Totalt medgivanden', 'vision-privacy'); ?></div>
            </div>
            <div class="stat-box">
                <div class="stat-number">87%</div>
                <div class="stat-label"><?php echo esc_html__('Acceptansgrad', 'vision-privacy'); ?></div>
            </div>
        </div>
    </div>
</div>
```

---

## 📝 7. Implementation Checklist

### Phase 1: Swedish Translation
- [ ] Update banner template in database
- [ ] Update cookie categories to Swedish
- [ ] Create Swedish policy templates
- [ ] Update WordPress plugin UI strings
- [ ] Test all Swedish text

### Phase 2: Enhanced Design
- [ ] Implement new banner CSS
- [ ] Create settings modal design
- [ ] Add animations and transitions
- [ ] Test responsive design
- [ ] Browser compatibility testing

### Phase 3: Floating Button
- [ ] Create floating button component
- [ ] Add show/hide logic
- [ ] Integrate with settings modal
- [ ] Test persistence
- [ ] Mobile optimization

### Phase 4: Dynamic Policies
- [ ] Review policy templates
- [ ] Add all dynamic fields
- [ ] Test data population
- [ ] Legal review (GDPR compliance)
- [ ] Client approval

### Phase 5: WordPress Plugin
- [ ] Translate admin interface
- [ ] Add Swedish help text
- [ ] Update documentation
- [ ] Create Swedish screenshots
- [ ] Test installation flow

---

## 🚀 Quick Implementation Steps

### Step 1: Update Database with Swedish Content
```bash
# Create new migration file
supabase/migrations/005_swedish_content.sql

# Run migration
supabase db push
```

### Step 2: Add CSS Files
```bash
# Add to your public folder
public/vision-privacy-banner.css
public/vision-privacy-modal.css
public/vision-privacy-floating-button.css
public/vision-privacy-floating-button.js
```

### Step 3: Update Widget API
Ensure the widget API includes all CSS/JS files in the response.

### Step 4: Test Everything
```bash
# Start dev server
npm run dev

# Visit demo page
http://localhost:3000/demo
```

---

## ✅ What You Haven't Missed

You've covered all the essentials! Here's what's in place:

✅ **Backend API** - Fully functional
✅ **Database** - Schema and migrations ready
✅ **Monitoring** - Comprehensive system
✅ **Deployment** - Scripts and CI/CD ready

### What Needs Customization:

⚠️ **Swedish Language** - Templates need translation
⚠️ **Visual Design** - Enhanced styling needed
⚠️ **Floating Button** - Needs to be added
⚠️ **Policy Content** - Needs legal review and Swedish translation
⚠️ **WordPress Plugin** - UI needs Swedish translation

---

## 📞 Next Steps

1. **Review the Swedish translations** I provided
2. **Customize the visual design** to match your brand
3. **Get legal review** of policy templates
4. **Implement floating button**
5. **Update WordPress plugin** with Swedish UI
6. **Test everything** thoroughly

Would you like me to create the actual migration files and CSS files for you?