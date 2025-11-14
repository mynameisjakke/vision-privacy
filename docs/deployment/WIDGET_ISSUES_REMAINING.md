# Remaining Widget Issues - Production

## Status: Multiple Issues Found

Testing on production WordPress site revealed several issues that need fixing.

---

## ✅ Working Features

- Cookie banner appears with Swedish text
- Policy links open modals
- Policy content loads and displays correctly
- Accept/Decline buttons close banner
- Settings button opens modal

---

## ❌ Issues Found

### 1. Settings Modal - Wrong Data & Duplicates

**Issue**: Settings modal shows:
- Wrong title (English)
- Wrong intro text (English)
- Duplicate categories:
  - 2x Essential
  - 2x Functional
  - 2x Analytics
  - 1x Marketing
  - 1x Advertising
  - 1x Social
- All text in English, not Swedish
- No accordion/expandable sections

**Expected** (from demo):
- Title: "Cookie-inställningar"
- 4 categories only:
  - Nödvändiga (Essential)
  - Funktionella (Functional)
  - Analys (Analytics)
  - Marknadsföring (Advertising)
- Swedish text throughout

**Root Cause**: 
- Database `cookie_categories` table has wrong/duplicate data
- Widget.js has hardcoded English text in `generateCategoryToggles()`

**Fix Needed**:
1. Clean up database - remove duplicates, ensure only 4 Swedish categories
2. Widget.js should use Swedish text (or get text from API)

---

### 2. Floating Button - Not Appearing

**Issue**: After accepting/declining cookies, floating button doesn't appear

**Expected**: White button with cookie icon in bottom-left corner

**Root Cause**: Unknown - need to check:
- Is floating button JS being loaded?
- Is consent being saved correctly?
- Is button being created but hidden?

**Debug**:
```javascript
// Check if consent is saved
localStorage.getItem('vision-privacy-consent')

// Check if floating button exists
document.getElementById('vision-privacy-floating-btn')

// Check if floating button script loaded
window.VisionPrivacyFloatingButton
```

---

### 3. Policy Dynamic Fields - Not Populated

**Issue**: Policies don't show:
- Company info from WordPress admin panel
- Detected cookies
- Plugin data

**Expected**: 
- Company name, address, email from WP admin
- List of detected cookies
- Information about installed plugins

**Root Cause**: 
- Template variables not being replaced
- Scan data not available
- Company info not saved in database

**Fix Needed**:
- Check if company info is saved when site registers
- Ensure template variable replacement works
- Add detected cookies to policy

---

### 4. Cookie List Empty in Policy

**Issue**: Cookie policy doesn't show ANY cookies, not even VP's own consent cookie

**Expected**: Should show at least:
- `vision-privacy-consent` - Our consent storage cookie
- Any other cookies detected on the site

**Root Cause**:
- No cookies detected/scanned
- Cookie list not being populated in template
- Scan endpoint failing (see console error)

---

### 5. Settings Link Styling in Policy

**Issue**: Settings links in policy text show as UI buttons instead of inline text links

**Expected**: Should look like underlined text links, not buttons

**Fix**: CSS issue - settings links need different styling

---

### 6. Scan Endpoint - 401 Unauthorized

**Console Error**:
```
POST https://vision-privacy.vercel.app/api/scan 401 (Unauthorized)
Failed to report scan: Error: HTTP 401
```

**Issue**: Widget trying to report scan results but getting 401

**Root Cause**: 
- Scan endpoint requires authentication
- Widget not sending auth token
- Or endpoint has wrong auth requirements

**Fix Needed**:
- Make scan endpoint accept requests from registered sites
- Or widget needs to send site token

---

### 7. Accept/Decline - No Visible Effect

**Issue**: Buttons close banner but unclear if consent is actually saved/enforced

**How to Verify**:
```javascript
// Check localStorage
localStorage.getItem('vision-privacy-consent')

// Should show something like:
// {"categories":{"essential":true,"functional":true,"analytics":true,"advertising":true},"timestamp":"..."}
```

**Possible Issue**: Consent might be saved but not enforced (cookies not blocked)

---

## 🔧 Priority Fixes

### Priority 1: Database - Cookie Categories

**Action**: Clean up `cookie_categories` table

```sql
-- Check current categories
SELECT id, name, is_essential, is_active, sort_order 
FROM cookie_categories 
WHERE is_active = true 
ORDER BY sort_order;

-- Expected: 4 rows with Swedish names
-- If more or wrong names, need to fix

-- Delete all and recreate with correct data
DELETE FROM cookie_categories;

INSERT INTO cookie_categories (id, name, description, is_essential, sort_order, is_active) VALUES
('essential', 'Nödvändiga', 'Nödvändiga cookies för grundläggande webbplatsfunktionalitet. Dessa kan inte stängas av.', true, 1, true),
('functional', 'Funktionella', 'Cookies som förbättrar webbplatsfunktionalitet och personalisering.', false, 2, true),
('analytics', 'Analys', 'Cookies för webbplatsanalys och prestandaövervakning.', false, 3, true),
('advertising', 'Marknadsföring', 'Cookies som används för reklam och marknadsföring.', false, 4, true);
```

### Priority 2: Floating Button

**Action**: Debug why button isn't appearing

1. Check if floating button JS is loaded
2. Check if consent is saved
3. Check browser console for errors
4. Verify button creation logic

### Priority 3: Scan Endpoint Auth

**Action**: Fix 401 error on `/api/scan`

Options:
1. Make endpoint public (accept from any registered site)
2. Widget sends site token in request
3. Disable scanning if not critical

---

## 🧪 Testing Checklist

After fixes:

- [ ] Settings modal shows 4 categories (Swedish names)
- [ ] No duplicate categories
- [ ] All modal text in Swedish
- [ ] Floating button appears after consent
- [ ] Floating button in bottom-left
- [ ] Policy shows company info
- [ ] Policy shows detected cookies
- [ ] No 401 errors in console
- [ ] Consent is saved correctly
- [ ] Accept/Decline actually work

---

## 📝 Notes

### Widget.js vs API HTML

There's a mismatch:
- API sends complete HTML with Swedish text
- Widget.js generates its own HTML with English text
- Widget.js overwrites API HTML

**Solution**: Widget.js should use HTML from API, not generate its own

### Database Schema

Need to verify:
- `cookie_categories` table structure
- `sites` table has company info fields
- Scan results are stored somewhere

---

**Created**: 2025-11-13  
**Status**: Issues Identified, Fixes Needed  
**Priority**: HIGH - Core functionality broken
