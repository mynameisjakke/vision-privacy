# Widget Fix Guide - Floating Button & Cookie Detection

## Fix 1: Inject Floating Button JS/CSS

**Location**: After `fetchConfig()` successfully loads config

**Add this code** in the `fetchConfig()` method, after `this.config = data;`:

```javascript
// Inject floating button JavaScript
if (data.floating_button_js) {
  const floatingScript = document.createElement('script');
  floatingScript.id = 'vp-floating-button-script';
  floatingScript.textContent = data.floating_button_js;
  if (!document.getElementById('vp-floating-button-script')) {
    document.head.appendChild(floatingScript);
  }
}

// Inject floating button CSS
if (data.floating_button_css) {
  const floatingStyle = document.createElement('style');
  floatingStyle.id = 'vp-floating-button-styles';
  floatingStyle.textContent = data.floating_button_css;
  if (!document.getElementById('vp-floating-button-styles')) {
    document.head.appendChild(floatingStyle);
  }
}
```

---

## Fix 2: Always Include VP Cookie in Scans

**Location**: `scanCookies()` method

**Replace the VP cookie detection section** with this:

```javascript
// ALWAYS include Vision Privacy consent cookie
// This ensures it shows in policies even before user consents
const consentKey = this.CONSENT_KEY; // vp_consent_{siteId}
const vpConsentCookie = {
  name: consentKey,
  domain: window.location.hostname,
  category: 'essential',
  detected_at: new Date().toISOString(),
  has_value: true,
  storage_type: 'localStorage',
  description: 'Lagrar dina cookie-preferenser för denna webbplats',
  duration: '12 månader'
};

cookies.push(vpConsentCookie);
```

**Remove the try-catch block** that only adds it if localStorage has it.

---

## Fix 3: Show Floating Button After Consent

**Location**: `saveConsent()` method, at the very end

**Add this code** after `this.dispatchEvent('vp:consent_saved', { categories });`:

```javascript
// Show floating settings button after consent is saved
setTimeout(() => {
  if (window.VisionPrivacyFloatingButton && typeof window.VisionPrivacyFloatingButton.show === 'function') {
    window.VisionPrivacyFloatingButton.show();
  }
}, 500); // Small delay to ensure button script is loaded
```

---

## Alternative: Create New Widget File

If modifying the existing file is complex, we can create a **new simplified widget** that:
1. Loads config
2. Injects all scripts/styles from config
3. Shows banner
4. Handles consent
5. Shows floating button

Would you like me to create a new, cleaner widget file instead?
