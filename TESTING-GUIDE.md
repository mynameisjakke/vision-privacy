# 🧪 Testing Guide - Swedish Version

## ✅ What's Now Working

### 1. Swedish Banner ✅
- Title: "🍪 Vi värnar om din integritet"
- Description in Swedish
- Buttons: "Acceptera alla", "Avvisa alla", "Anpassa"

### 2. Swedish Cookie Categories ✅
- Nödvändiga (Essential)
- Funktionella (Functional)
- Analys (Analytics)
- Marknadsföring (Advertising)

### 3. Swedish Modal ✅
- Title: "Anpassa cookie-inställningar"
- Description: "Välj vilka typer av cookies du vill tillåta"
- Buttons: "Avbryt", "Spara inställningar"
- Required badge: "(Krävs)"

### 4. Floating Settings Button ✅
- **IMPORTANT**: Only appears AFTER you make a consent choice!

---

## 🎯 How to Test

### Step 1: Visit Demo Page
```
http://localhost:3000/demo
```

### Step 2: You Should See
✅ Swedish banner at the bottom
✅ Swedish text and buttons
✅ Professional styling

### Step 3: Make a Consent Choice
Click ONE of these buttons:
- "Acceptera alla" (Accept All)
- "Avvisa alla" (Reject All)  
- "Anpassa" (Customize) → then save

### Step 4: Floating Button Appears! 🎉
**After you click a button**, look at the **bottom-right corner**.

You should see:
```
[🍪 Cookie-inställningar]
```

The button:
- Has a purple gradient background
- Shows wiggling cookie icon
- Says "Cookie-inställningar" on desktop
- Shows only 🍪 on mobile

### Step 5: Test Floating Button
Click the floating button → Settings modal reopens!

---

## 🐛 Troubleshooting

### "I don't see the floating button!"

**This is normal!** The floating button only appears AFTER you:
1. Make a consent choice (click any button)
2. The banner disappears
3. Then the floating button appears

**Why?** 
- GDPR requires users to make an initial choice
- After they choose, they need a way to change settings
- That's what the floating button is for!

### "The banner is still in English!"

Refresh the page (Cmd+R or Ctrl+R). The changes should be live now.

### "The modal is in English!"

The modal text is now in Swedish. If you see English:
1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. Clear browser cache
3. Restart the dev server

---

## 📱 Mobile Testing

### Desktop (> 768px):
```
[🍪 Cookie-inställningar]  ← Full text visible
```

### Mobile (< 768px):
```
[🍪]  ← Icon only, circular button
```

**To test mobile:**
1. Open Chrome DevTools (F12)
2. Click device toolbar icon (Cmd+Shift+M)
3. Select a mobile device
4. Refresh page

---

## ✅ Complete Test Checklist

### Banner Test:
- [ ] Banner appears at bottom
- [ ] Title is "Vi värnar om din integritet"
- [ ] Description is in Swedish
- [ ] Three buttons visible
- [ ] Buttons say "Acceptera alla", "Avvisa alla", "Anpassa"

### Modal Test:
- [ ] Click "Anpassa" button
- [ ] Modal opens
- [ ] Title is "Anpassa cookie-inställningar"
- [ ] Four categories shown
- [ ] "Nödvändiga" is checked and disabled
- [ ] Other categories can be toggled
- [ ] "(Krävs)" badge on essential cookies
- [ ] Buttons say "Avbryt" and "Spara inställningar"

### Floating Button Test:
- [ ] Click "Acceptera alla" (or any choice)
- [ ] Banner disappears
- [ ] **Floating button appears bottom-right**
- [ ] Button shows "🍪 Cookie-inställningar"
- [ ] Cookie icon wiggles
- [ ] Purple gradient background
- [ ] Click button → modal reopens
- [ ] On mobile: button is circular with icon only

### Persistence Test:
- [ ] Make a choice
- [ ] Refresh page (F5)
- [ ] Banner doesn't appear (consent remembered)
- [ ] Floating button IS visible
- [ ] Click "Reset Consent" button
- [ ] Banner appears again
- [ ] Floating button disappears

---

## 🎨 Visual Expectations

### Banner:
- White background
- Bottom of screen
- Shadow effect
- Responsive layout
- Swedish text

### Floating Button:
- **Position**: Bottom-right corner (20px from edges)
- **Color**: Purple gradient (#667eea → #764ba2)
- **Size**: ~150px wide on desktop, 60px circle on mobile
- **Animation**: Slides in from right, cookie wiggles
- **Shadow**: Soft purple glow

### Modal:
- Centered overlay
- White background
- Rounded corners
- Scrollable if needed
- Swedish text throughout

---

## 🔍 Browser Console

Open console (F12) and you should see:
```
✅ Floating button script loaded
```

If you see:
```
⚠️ No floating button JS in widget data
```
Then there's an issue with the API response.

---

## 📊 Expected Behavior Flow

```
1. User visits page
   ↓
2. Banner appears (Swedish)
   ↓
3. User clicks "Acceptera alla"
   ↓
4. Consent saved to localStorage
   ↓
5. Banner disappears
   ↓
6. Floating button appears (bottom-right)
   ↓
7. User can click button anytime to change settings
```

---

## 🚀 Next Steps

Once you verify everything works:

1. ✅ Swedish translation working
2. ✅ Floating button working
3. ✅ Mobile responsive
4. ⚠️ Run database migration for production
5. ⚠️ Deploy to Vercel
6. ⚠️ Update WordPress plugin

---

## 💡 Quick Fixes

### Force Floating Button to Show (for testing):
Open browser console and run:
```javascript
localStorage.setItem('vision-privacy-consent', JSON.stringify({
  siteId: 'demo-site-123',
  categories: ['essential'],
  timestamp: new Date().toISOString()
}));
location.reload();
```

This simulates having made a consent choice.

### Clear Everything:
```javascript
localStorage.clear();
location.reload();
```

---

**Everything should now be in Swedish and the floating button should work!** 🎉

**Remember**: The floating button ONLY appears after making a consent choice. This is by design!