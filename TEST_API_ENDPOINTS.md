# API Endpoints Testing Guide

## Testing the Smart Registration System

### Prerequisites
- API deployed and running
- Access to curl or Postman
- Test WordPress site or manual testing tools

---

## 1. Test Verification Endpoint

### Test 1.1: Valid Site and Token

```bash
# First, register a site to get a site_id and token
curl -X POST https://vision-privacy.vercel.app/api/sites/register \
  -H 'Content-Type: application/json' \
  -d '{
    "domain": "https://test-site.com",
    "wp_version": "6.4",
    "plugin_version": "1.0.5",
    "installed_plugins": ["test-plugin v1.0.0 (active)"],
    "detected_forms": []
  }'

# Save the site_id and api_token from the response

# Then verify it
curl -X GET https://vision-privacy.vercel.app/api/sites/verify/SITE_ID_HERE \
  -H 'Authorization: Bearer TOKEN_HERE' \
  -H 'Content-Type: application/json'
```

**Expected Response (200)**:
```json
{
  "success": true,
  "site_id": "site_xxx",
  "widget_url": "https://vision-privacy.vercel.app/api/widget/script",
  "status": "active",
  "domain": "https://test-site.com",
  "last_updated": "2025-11-13T..."
}
```

### Test 1.2: Missing Token

```bash
curl -X GET https://vision-privacy.vercel.app/api/sites/verify/site_test123 \
  -H 'Content-Type: application/json'
```

**Expected Response (401)**:
```json
{
  "success": false,
  "message": "Missing authorization token",
  "error": "UNAUTHORIZED"
}
```

### Test 1.3: Invalid Site ID

```bash
curl -X GET https://vision-privacy.vercel.app/api/sites/verify/site_invalid_id \
  -H 'Authorization: Bearer token_test123' \
  -H 'Content-Type: application/json'
```

**Expected Response (404)**:
```json
{
  "success": false,
  "message": "Site not found",
  "error": "SITE_NOT_FOUND"
}
```

### Test 1.4: Invalid Token

```bash
curl -X GET https://vision-privacy.vercel.app/api/sites/verify/SITE_ID_HERE \
  -H 'Authorization: Bearer wrong_token_here' \
  -H 'Content-Type: application/json'
```

**Expected Response (401)**:
```json
{
  "success": false,
  "message": "Invalid token for this site",
  "error": "UNAUTHORIZED"
}
```

---

## 2. Test Registration Endpoint (Create Mode)

### Test 2.1: New Site Registration

```bash
curl -X POST https://vision-privacy.vercel.app/api/sites/register \
  -H 'Content-Type: application/json' \
  -d '{
    "domain": "https://brand-new-site.com",
    "wp_version": "6.4",
    "plugin_version": "1.0.5",
    "site_name": "Brand New Site",
    "admin_email": "admin@brand-new-site.com",
    "installed_plugins": [
      "WordPress SEO v1.0.0 (active)",
      "Contact Form 7 v5.8 (active)"
    ],
    "detected_forms": [
      {
        "type": "contact-form-7",
        "count": 3,
        "plugin_name": "Contact Form 7"
      }
    ]
  }'
```

**Expected Response (201)**:
```json
{
  "success": true,
  "site_id": "site_new123",
  "api_token": "token_new456",
  "widget_url": "https://vision-privacy.vercel.app/api/widget/script",
  "created": true
}
```

### Test 2.2: Duplicate Domain (Should Return Existing)

```bash
# Register the same domain again
curl -X POST https://vision-privacy.vercel.app/api/sites/register \
  -H 'Content-Type: application/json' \
  -d '{
    "domain": "https://brand-new-site.com",
    "wp_version": "6.4",
    "plugin_version": "1.0.5"
  }'
```

**Expected Response (200)**:
```json
{
  "success": true,
  "site_id": "site_new123",
  "api_token": "token_new456",
  "widget_url": "https://vision-privacy.vercel.app/api/widget/script",
  "existing": true
}
```

---

## 3. Test Registration Endpoint (Update Mode)

### Test 3.1: Update Existing Site

```bash
# Use site_id and token from previous registration
curl -X POST https://vision-privacy.vercel.app/api/sites/register \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TOKEN_HERE' \
  -d '{
    "site_id": "SITE_ID_HERE",
    "domain": "https://brand-new-site.com",
    "wp_version": "6.4.1",
    "plugin_version": "1.0.5",
    "site_name": "Updated Site Name",
    "installed_plugins": [
      "WordPress SEO v1.1.0 (active)",
      "Contact Form 7 v5.9 (active)",
      "WooCommerce v8.0 (active)"
    ]
  }'
```

**Expected Response (200)**:
```json
{
  "success": true,
  "site_id": "SITE_ID_HERE",
  "api_token": "TOKEN_HERE",
  "widget_url": "https://vision-privacy.vercel.app/api/widget/script",
  "updated": true
}
```

### Test 3.2: Update with Wrong Token

```bash
curl -X POST https://vision-privacy.vercel.app/api/sites/register \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer wrong_token' \
  -d '{
    "site_id": "SITE_ID_HERE",
    "domain": "https://brand-new-site.com",
    "wp_version": "6.4.1",
    "plugin_version": "1.0.5"
  }'
```

**Expected Response (401)**:
```json
{
  "error": "Unauthorized",
  "message": "Invalid token for this site",
  "code": 1003
}
```

### Test 3.3: Update Non-Existent Site (Should Create New)

```bash
curl -X POST https://vision-privacy.vercel.app/api/sites/register \
  -H 'Content-Type: application/json' \
  -d '{
    "site_id": "site_nonexistent",
    "domain": "https://another-new-site.com",
    "wp_version": "6.4",
    "plugin_version": "1.0.5"
  }'
```

**Expected Response (201)**:
```json
{
  "success": true,
  "site_id": "site_generated_new",
  "api_token": "token_generated_new",
  "widget_url": "https://vision-privacy.vercel.app/api/widget/script",
  "created": true
}
```

---

## 4. Integration Test: Full WordPress Plugin Flow

### Scenario: Fresh Installation

```bash
# Step 1: Plugin activates, no site_id exists
# Plugin calls register without site_id

curl -X POST https://vision-privacy.vercel.app/api/sites/register \
  -H 'Content-Type: application/json' \
  -d '{
    "domain": "https://wordpress-test.com",
    "wp_version": "6.4",
    "plugin_version": "1.0.5",
    "site_name": "WordPress Test Site",
    "admin_email": "admin@wordpress-test.com"
  }'

# Expected: 201 Created with new site_id
# Plugin stores: site_id, api_token, widget_url
```

### Scenario: Re-activation

```bash
# Step 1: Plugin has site_id and token stored
# Plugin calls verify endpoint

curl -X GET https://vision-privacy.vercel.app/api/sites/verify/STORED_SITE_ID \
  -H 'Authorization: Bearer STORED_TOKEN' \
  -H 'Content-Type: application/json'

# Expected: 200 OK - site is valid
# Plugin reuses existing site_id, no registration needed
```

### Scenario: Manual Re-registration

```bash
# Step 1: User clicks "Register Site" button
# Plugin has site_id and token stored
# Plugin calls verify first

curl -X GET https://vision-privacy.vercel.app/api/sites/verify/STORED_SITE_ID \
  -H 'Authorization: Bearer STORED_TOKEN' \
  -H 'Content-Type: application/json'

# Expected: 200 OK - site is valid
# Plugin shows success, no new registration created
```

### Scenario: Domain Change

```bash
# Step 1: Site URL changed from https://old-domain.com to https://new-domain.com
# Plugin detects change, calls register with site_id

curl -X POST https://vision-privacy.vercel.app/api/sites/register \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer STORED_TOKEN' \
  -d '{
    "site_id": "STORED_SITE_ID",
    "domain": "https://new-domain.com",
    "wp_version": "6.4",
    "plugin_version": "1.0.5"
  }'

# Expected: 200 OK with updated: true
# Same site_id maintained, domain updated
```

---

## 5. Performance Testing

### Test 5.1: Rapid Verification Calls

```bash
# Simulate multiple rapid verification calls
for i in {1..10}; do
  curl -X GET https://vision-privacy.vercel.app/api/sites/verify/SITE_ID_HERE \
    -H 'Authorization: Bearer TOKEN_HERE' \
    -H 'Content-Type: application/json' &
done
wait

# Expected: All return 200 OK
# No duplicates created
# Response time < 1 second each
```

### Test 5.2: Rapid Registration Calls (Same Domain)

```bash
# Simulate clicking "Register" multiple times
for i in {1..5}; do
  curl -X POST https://vision-privacy.vercel.app/api/sites/register \
    -H 'Content-Type: application/json' \
    -d '{
      "domain": "https://rapid-test.com",
      "wp_version": "6.4",
      "plugin_version": "1.0.5"
    }' &
done
wait

# Expected: All return same site_id
# Only ONE site created in database
# Subsequent calls return existing: true
```

---

## 6. Error Handling Tests

### Test 6.1: Invalid JSON

```bash
curl -X POST https://vision-privacy.vercel.app/api/sites/register \
  -H 'Content-Type: application/json' \
  -d 'invalid json here'
```

**Expected Response (500)**:
```json
{
  "error": "Registration failed",
  "message": "Site registration failed due to an internal error",
  "code": 1005
}
```

### Test 6.2: Missing Required Fields

```bash
curl -X POST https://vision-privacy.vercel.app/api/sites/register \
  -H 'Content-Type: application/json' \
  -d '{
    "wp_version": "6.4"
  }'
```

**Expected Response (400)**:
```json
{
  "error": "Validation failed",
  "message": "Domain is required",
  "code": 1004
}
```

### Test 6.3: Invalid Domain Format

```bash
curl -X POST https://vision-privacy.vercel.app/api/sites/register \
  -H 'Content-Type: application/json' \
  -d '{
    "domain": "not-a-valid-url",
    "wp_version": "6.4",
    "plugin_version": "1.0.5"
  }'
```

**Expected Response (400)**:
```json
{
  "error": "Invalid domain format",
  "message": "The provided domain is not valid",
  "code": 1004
}
```

---

## 7. Database Verification

After running tests, verify in database:

```sql
-- Check for duplicate sites
SELECT domain, COUNT(*) as count
FROM sites
WHERE deleted_at IS NULL
GROUP BY domain
HAVING COUNT(*) > 1;

-- Should return 0 rows (no duplicates)

-- Check site updates
SELECT id, domain, updated_at, created_at
FROM sites
WHERE domain = 'https://brand-new-site.com'
ORDER BY updated_at DESC;

-- Should show updated_at > created_at for updated sites

-- Check all test sites
SELECT id, domain, status, created_at
FROM sites
WHERE domain LIKE '%test%'
ORDER BY created_at DESC;
```

---

## 8. Success Criteria

✅ **Verification Endpoint**:
- Returns 200 for valid site/token
- Returns 401 for missing/invalid token
- Returns 404 for non-existent site
- Response time < 1 second

✅ **Registration Endpoint (Create)**:
- Creates new site with 201
- Returns existing site for duplicate domain with 200
- Validates input correctly
- Handles errors gracefully

✅ **Registration Endpoint (Update)**:
- Updates existing site with 200
- Validates token for updates
- Falls back to create if site not found
- Maintains same site_id

✅ **Integration**:
- WordPress plugin can verify existing registration
- WordPress plugin can update registration
- No duplicate sites created
- Data continuity maintained

✅ **Performance**:
- Verification < 1 second
- Registration < 3 seconds
- No race conditions
- Handles concurrent requests

✅ **Database**:
- No duplicate sites for same domain
- Updated_at reflects changes
- Deleted sites excluded from queries
- Indexes working efficiently

---

## 9. Monitoring

After deployment, monitor:

1. **Verification Endpoint**:
   - Request count
   - Success rate (200 responses)
   - Average response time
   - Error rate (401, 404)

2. **Registration Endpoint**:
   - Create count (201 responses)
   - Update count (200 with updated: true)
   - Existing count (200 with existing: true)
   - Error rate

3. **Database**:
   - Total sites count
   - Duplicate sites (should be 0)
   - Average update frequency
   - Deleted sites count

4. **Plugin Behavior**:
   - Verification success rate
   - Registration attempts
   - Update frequency
   - Error reports

---

## 10. Rollback Procedure

If issues are found:

1. **Immediate**: Revert API deployment
2. **Database**: No cleanup needed (backward compatible)
3. **Plugin**: Old version still works
4. **Communication**: Notify affected users

---

**Testing Date**: 2025-11-13  
**API Version**: With Smart Registration  
**Plugin Version**: 1.0.5  
**Status**: Ready for Testing
