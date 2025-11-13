# Testing Smart Registration System

## Test Plan for Version 1.0.5

### Prerequisites
- WordPress test environment
- Access to Vision Privacy API
- Ability to modify database options

---

## Test Case 1: Fresh Installation

**Scenario**: Plugin installed for the first time

**Steps**:
1. Install plugin on fresh WordPress site
2. Activate plugin
3. Check database for `vision_privacy_site_id`

**Expected Result**:
- ✅ Plugin activates successfully
- ✅ `register_site()` is called
- ✅ No verification call (no existing site_id)
- ✅ New registration created
- ✅ site_id, token, and widget_url stored
- ✅ Success notice displayed

**Database Check**:
```sql
SELECT option_name, option_value 
FROM wp_options 
WHERE option_name LIKE 'vision_privacy%';
```

---

## Test Case 2: Re-activation with Valid Registration

**Scenario**: Plugin deactivated and reactivated (data still in database)

**Steps**:
1. Deactivate plugin (data remains in database)
2. Reactivate plugin
3. Monitor API calls

**Expected Result**:
- ✅ Plugin activates successfully
- ✅ `register_site()` is called
- ✅ `verify_existing_registration()` is called
- ✅ Verification returns 200 OK
- ✅ No new registration created
- ✅ Existing site_id reused
- ✅ Success notice displayed

**API Calls**:
- `GET /api/sites/verify/{site_id}` → 200 OK
- No call to `POST /api/sites/register`

---

## Test Case 3: Manual Re-registration

**Scenario**: User clicks "Register Site" button in admin

**Steps**:
1. Go to Settings → Vision Privacy
2. Click "Register Site" button
3. Monitor API calls

**Expected Result**:
- ✅ AJAX call initiated
- ✅ `verify_existing_registration()` is called
- ✅ Verification returns 200 OK
- ✅ No new registration created
- ✅ Success message displayed
- ✅ No duplicate site_id created

**API Calls**:
- `GET /api/sites/verify/{site_id}` → 200 OK
- No call to `POST /api/sites/register`

---

## Test Case 4: Invalid/Expired Registration

**Scenario**: site_id exists but is invalid on API

**Steps**:
1. Manually set invalid site_id in database
2. Activate plugin or click "Register Site"
3. Monitor API calls

**Expected Result**:
- ✅ `verify_existing_registration()` is called
- ✅ Verification returns 404 or 401
- ✅ New registration is created
- ✅ New site_id stored
- ✅ Success notice displayed

**API Calls**:
- `GET /api/sites/verify/{site_id}` → 404 or 401
- `POST /api/sites/register` → 201 Created
- New site_id returned and stored

---

## Test Case 5: Multiple Rapid Clicks

**Scenario**: User clicks "Register Site" button multiple times quickly

**Steps**:
1. Go to Settings → Vision Privacy
2. Click "Register Site" button 5 times rapidly
3. Check database for duplicate entries

**Expected Result**:
- ✅ First click: Verification or registration
- ✅ Subsequent clicks: Verification returns valid
- ✅ Only ONE site_id in database
- ✅ No duplicate registrations created
- ✅ All clicks return success

**Database Check**:
```sql
-- Should return only ONE row
SELECT COUNT(*) FROM wp_options WHERE option_name = 'vision_privacy_site_id';
```

---

## Test Case 6: Domain Change

**Scenario**: Site URL changes (staging to production, etc.)

**Steps**:
1. Change site URL in WordPress settings
2. Load any page (triggers `check_site_url_change()`)
3. Monitor API calls

**Expected Result**:
- ✅ Domain change detected
- ✅ `validate_domain()` is called
- ✅ `register_site()` is called
- ✅ Verification checks existing site_id
- ✅ Registration updates with new domain
- ✅ Same site_id maintained
- ✅ Success notice displayed

**API Calls**:
- `GET /api/sites/verify/{site_id}` → 200 OK or 404
- `POST /api/sites/register` with site_id → 200 OK

---

## Test Case 7: Widget URL Update

**Scenario**: API changes widget URL for existing site

**Steps**:
1. Manually change widget_url on API side
2. Trigger verification (reactivate or manual register)
3. Check stored widget_url

**Expected Result**:
- ✅ Verification called
- ✅ API returns new widget_url
- ✅ Plugin updates stored widget_url
- ✅ New widget_url used for injection
- ✅ No new registration created

**Database Check**:
```sql
SELECT option_value 
FROM wp_options 
WHERE option_name = 'vision_privacy_widget_url';
```

---

## Test Case 8: Network Error During Verification

**Scenario**: API is unreachable during verification

**Steps**:
1. Block API endpoint temporarily
2. Activate plugin or click "Register Site"
3. Monitor behavior

**Expected Result**:
- ✅ Verification attempt fails
- ✅ Error logged to error_log
- ✅ Falls back to registration attempt
- ✅ Registration also fails (API blocked)
- ✅ Error message displayed
- ✅ No data corruption

**Error Log**:
```
Vision Privacy: Verification failed - [error message]
Vision Privacy Registration Error: [error message]
```

---

## Test Case 9: Plugin Reinstall

**Scenario**: Plugin deleted and reinstalled (database cleared)

**Steps**:
1. Uninstall plugin (clears all options)
2. Reinstall plugin
3. Activate plugin

**Expected Result**:
- ✅ No site_id in database
- ✅ No verification call
- ✅ New registration created
- ✅ New site_id stored
- ✅ Success notice displayed

**Note**: This creates a NEW site_id since old data was deleted

---

## Test Case 10: Company Info Update

**Scenario**: User updates company information

**Steps**:
1. Go to Settings → Vision Privacy
2. Update company information
3. Save changes

**Expected Result**:
- ✅ Company info saved
- ✅ `register_site()` is called
- ✅ Verification checks existing site_id
- ✅ Registration updates with new company info
- ✅ Same site_id maintained
- ✅ Success message displayed

**API Calls**:
- `GET /api/sites/verify/{site_id}` → 200 OK
- `POST /api/sites/register` with site_id → 200 OK

---

## API Endpoint Testing

### Verify Endpoint

**Request**:
```bash
curl -X GET \
  https://vision-privacy.vercel.app/api/sites/verify/site_xxx \
  -H 'Authorization: Bearer token_xxx' \
  -H 'Content-Type: application/json'
```

**Expected Responses**:

**Success (200)**:
```json
{
  "success": true,
  "site_id": "site_xxx",
  "widget_url": "https://...",
  "status": "active"
}
```

**Not Found (404)**:
```json
{
  "success": false,
  "message": "Site not found"
}
```

**Unauthorized (401)**:
```json
{
  "success": false,
  "message": "Invalid token"
}
```

### Register Endpoint (Update Mode)

**Request**:
```bash
curl -X POST \
  https://vision-privacy.vercel.app/api/sites/register \
  -H 'Authorization: Bearer token_xxx' \
  -H 'Content-Type: application/json' \
  -d '{
    "site_id": "site_xxx",
    "domain": "https://example.com",
    "wp_version": "6.4",
    ...
  }'
```

**Expected Response (200)**:
```json
{
  "success": true,
  "site_id": "site_xxx",
  "api_token": "token_xxx",
  "widget_url": "https://...",
  "message": "Site updated successfully"
}
```

---

## Performance Testing

### Metrics to Monitor

1. **Verification Call Time**: Should be < 1 second
2. **Registration Call Time**: Should be < 3 seconds
3. **Database Queries**: Should not increase significantly
4. **Memory Usage**: Should remain stable

### Load Testing

Test with:
- 10 simultaneous activations
- 50 rapid "Register Site" clicks
- 100 page loads with widget injection

**Expected**:
- No duplicate registrations
- No database deadlocks
- Consistent response times
- No memory leaks

---

## Rollback Plan

If issues are found:

1. **Immediate**: Revert to version 1.0.4
2. **Database**: No cleanup needed (backward compatible)
3. **API**: Old version still works with new API
4. **Users**: No action required

---

## Success Criteria

✅ All test cases pass
✅ No duplicate registrations created
✅ Existing site_ids are reused
✅ Performance is acceptable
✅ Error handling works correctly
✅ API endpoints respond correctly
✅ Database remains clean
✅ User experience is improved

---

## Notes

- Test in staging environment first
- Monitor error logs during testing
- Check database for duplicate entries
- Verify API call counts
- Test with different WordPress versions
- Test with different PHP versions (7.4, 8.0, 8.1, 8.2)
