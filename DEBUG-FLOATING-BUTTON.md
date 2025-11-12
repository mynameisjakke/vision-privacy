# 🐛 Debug Floating Button - Step by Step

## 🧪 Test Pages

### **Test 1: Standalone Test**
Visit: `http://localhost:3000/test-floating-button.html`

This is a simple HTML page that tests ONLY the floating button.

**Steps:**
1. Click "Simulate Accept All Click"
2. Look at bottom-right corner
3. You should see the purple button with 🍪

**If you see it here but not on /demo**, the issue is with the demo page integration.

### **Test 2: Demo Page**
Visit: `http://localhost:3000/demo`

**Steps:**
1. Open Browser Console (F12)
2. Click "Acceptera alla"
3. Watch console logs
4. Look at bottom-right corner

---

## 🔍 What to Check in Console

After clicking "Acceptera alla", you should see:

```
✅ Floating button CSS loaded
✅ Floating button script loaded
Consent submitted successfully
✅ Floating button script initialized
🔍 Checking floating button conditions: {hasConsent: true, ...}
🎉 Creating floating button!
✅ Floating button added to page
✅ Button element exists in DOM: <button>...</button>
📊 Button styles: {display: "flex", position: "fixed", ...}
```

---

## ❌ Common Issues & Solutions

### **Issue 1: Button exists but not visible**

**Check in console:**
```javascript
const btn = document.getElementById('vision-privacy-floating-btn');
console.log('Button:', btn);
console.log('Styles:', window.getComputedStyle(btn));
```

**Possible causes:**
- `display: none` → Button is hidden
- `z-index` too low → Button is behind other elements
- `opacity: 0` → Button is transparent
- Wrong `position` → Button is off-screen

**Solution:**
```javascript
// Force button to be visible
const btn = document.getElementById('vision-privacy-floating-btn');
if (btn) {
    btn.style.display = 'flex';
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.zIndex = '999999';
    btn.style.background = 'red'; // Make it obvious
}
```

### **Issue 2: Button not created**

**Check:**
```javascript
console.log('Has consent:', localStorage.getItem('vision-privacy-consent'));
console.log('API available:', window.VisionPrivacyFloatingButton);
```

**Solution:**
```javascript
// Manually trigger button creation
if (window.VisionPrivacyFloatingButton) {
    window.VisionPrivacyFloatingButton.show();
}
```

### **Issue 3: CSS not loaded**

**Check:**
```javascript
const styles = document.querySelectorAll('style');
const hasFloatingCSS = Array.from(styles).some(s => 
    s.textContent.includes('vision-privacy-floating-btn')
);
console.log('Floating CSS loaded:', hasFloatingCSS);
```

**Solution:**
Manually add CSS:
```javascript
const style = document.createElement('style');
style.textContent = `
.vision-privacy-floating-btn {
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    z-index: 999999 !important;
    display: flex !important;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    color: white !important;
    padding: 1rem 1.5rem !important;
    border-radius: 50px !important;
    border: none !important;
    cursor: pointer !important;
}
`;
document.head.appendChild(style);
```

---

## 🔧 Manual Testing Commands

### **Open Console (F12) and run these:**

### **1. Check if button exists:**
```javascript
document.getElementById('vision-privacy-floating-btn')
```

### **2. Check consent:**
```javascript
localStorage.getItem('vision-privacy-consent')
```

### **3. Force create button:**
```javascript
if (window.VisionPrivacyFloatingButton) {
    window.VisionPrivacyFloatingButton.show();
} else {
    console.error('API not available');
}
```

### **4. Create button manually:**
```javascript
const btn = document.createElement('button');
btn.id = 'vision-privacy-floating-btn';
btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 50px;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
`;
btn.innerHTML = '🍪 Cookie-inställningar';
document.body.appendChild(btn);
console.log('Button created:', btn);
```

### **5. Check all elements at bottom-right:**
```javascript
const elements = document.elementsFromPoint(
    window.innerWidth - 100, 
    window.innerHeight - 100
);
console.log('Elements at bottom-right:', elements);
```

---

## 📊 Expected Console Output

### **On Page Load:**
```
✅ Floating button CSS loaded
✅ Floating button script loaded
✅ Floating button script initialized
🔍 Checking floating button conditions: {hasConsent: false, buttonExists: false, bannerVisible: true}
⏸️ No consent yet, button will not appear
```

### **After Clicking "Acceptera alla":**
```
Consent submitted successfully
🔍 Checking floating button conditions: {hasConsent: true, buttonExists: false, bannerVisible: false}
🎉 Creating floating button!
✅ Floating button added to page
✅ Button element exists in DOM: <button id="vision-privacy-floating-btn">...</button>
📊 Button styles: {
    display: "flex",
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "999998",
    visibility: "visible",
    opacity: "1"
}
```

---

## 🎯 Quick Diagnosis

Run this in console after clicking "Accept":

```javascript
// Comprehensive check
const diagnosis = {
    buttonElement: document.getElementById('vision-privacy-floating-btn'),
    hasConsent: !!localStorage.getItem('vision-privacy-consent'),
    apiAvailable: !!window.VisionPrivacyFloatingButton,
    cssLoaded: Array.from(document.querySelectorAll('style')).some(s => 
        s.textContent.includes('vision-privacy-floating-btn')
    ),
    jsLoaded: Array.from(document.querySelectorAll('script')).some(s => 
        s.textContent.includes('VisionPrivacyFloatingButton')
    )
};

if (diagnosis.buttonElement) {
    const styles = window.getComputedStyle(diagnosis.buttonElement);
    diagnosis.buttonStyles = {
        display: styles.display,
        position: styles.position,
        bottom: styles.bottom,
        right: styles.right,
        zIndex: styles.zIndex,
        visibility: styles.visibility,
        opacity: styles.opacity,
        background: styles.background
    };
}

console.table(diagnosis);
```

---

## ✅ What Should Happen

1. **Page loads** → Banner appears (Swedish)
2. **Click "Acceptera alla"** → Consent saved
3. **Banner disappears** → Floating button appears
4. **Bottom-right corner** → Purple button with 🍪
5. **Click button** → Settings modal reopens

---

## 🚨 If Nothing Works

Try this nuclear option in console:

```javascript
// Clear everything and start fresh
localStorage.clear();
location.reload();

// Then after page loads, run:
localStorage.setItem('vision-privacy-consent', JSON.stringify({
    siteId: 'demo-site-123',
    categories: ['essential'],
    timestamp: new Date().toISOString()
}));

// Force create button
const btn = document.createElement('button');
btn.id = 'test-floating-btn';
btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;background:red;color:white;padding:20px;border:none;border-radius:50px;cursor:pointer;font-size:20px;';
btn.innerHTML = '🍪 TEST BUTTON';
btn.onclick = () => alert('Button works!');
document.body.appendChild(btn);
```

If you see the RED test button, then the issue is with the actual floating button code.
If you DON'T see the RED test button, then there's a browser/CSS issue.

---

## 📞 Report Back

After testing, report:
1. ✅ or ❌ Can you see button on `/test-floating-button.html`?
2. ✅ or ❌ Can you see button on `/demo` after clicking Accept?
3. What do you see in console after clicking Accept?
4. What does the diagnosis script show?

This will help identify exactly where the issue is!