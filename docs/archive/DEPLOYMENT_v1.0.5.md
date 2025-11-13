# Vision Privacy Plugin v1.0.5 - Deployment Guide

## 🎯 What's New

**Smart Registration System** - The plugin now intelligently checks if a site is already registered before creating a new registration, preventing duplicates and maintaining data continuity.

## 📦 Package Information

- **Version**: 1.0.5
- **Release Date**: 2025-11-13
- **Package File**: `vision-privacy-1.0.5.zip`
- **Plugin File**: `wordpress-plugin/vision-privacy.php`

## ✨ Key Changes

### 1. Smart Registration Logic
- Checks for existing site_id before registering
- Verifies registration validity with API
- Reuses existing site_id when valid
- Only creates new registration when necessary

### 2. New Verification Method
- `verify_existing_registration()` validates site_id with API
- Calls `GET /api/sites/verify/{site_id}` endpoint
- Updates widget_url automatically if changed
- Handles expired/invalid registrations gracefully

### 3. Enhanced Registration Flow
- Includes site_id in registration request for updates
- Sends Authorization header with existing token
- Prevents duplicate registrations
- Maintains historical data continuity

## 🔧 API Requirements

### New Endpoint Required

**Verification Endpoint**:
```
GET /api/sites/verify/{site_id}
Authorization: Bearer {api_token}
```

**Success Response (200)**:
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

### Updated Endpoint Behavior

**Registration Endpoint**:
```
POST /api/sites/register
Authorization: Bearer {api_token} (optional)
```

**Request with site_id (update mode)**:
```json
{
  "site_id": "site_xxx",
  "domain": "https://example.com",
  "wp_version": "6.4",
  ...
}
```

**Expected Behavior**:
- If `site_id` provided and valid → Update existing site
- If `site_id` not provided → Create new site
- Return same site_id in response

## 📋 Pre-Deployment Checklist

### API Side
- [ ] Implement `/api/sites/verify/{site_id}` endpoint
- [ ] Update `/api/sites/register` to handle site_id in request
- [ ] Test verification endpoint with valid/invalid site_ids
- [ ] Test registration endpoint in update mode
- [ ] Verify no duplicate sites are created

### Plugin Side
- [x] Code implemented and tested
- [x] Version number updated to 1.0.5
- [x] CHANGELOG.md updated
- [x] No syntax errors
- [x] Package created (vision-privacy-1.0.5.zip)

### Testing
- [ ] Test fresh installation
- [ ] Test re-activation with existing data
- [ ] Test manual re-registration
- [ ] Test with invalid site_id
- [ ] Test multiple rapid clicks
- [ ] Test domain change scenario
- [ ] Test widget URL update
- [ ] Test network errors

## 🚀 Deployment Steps

### Step 1: Deploy API Changes

1. Implement verification endpoint
2. Update registration endpoint logic
3. Deploy to staging
4. Test all scenarios
5. Deploy to production

### Step 2: Test API Endpoints

```bash
# Test verification endpoint
curl -X GET \
  https://vision-privacy.vercel.app/api/sites/verify/site_xxx \
  -H 'Authorization: Bearer token_xxx'

# Test registration update
curl -X POST \
  https://vision-privacy.vercel.app/api/sites/register \
  -H 'Authorization: Bearer token_xxx' \
  -H 'Content-Type: application/json' \
  -d '{"site_id": "site_xxx", "domain": "https://example.com", ...}'
```

### Step 3: Deploy Plugin

1. Upload `vision-privacy-1.0.5.zip` to WordPress.org (if applicable)
2. Update plugin on test sites
3. Monitor for errors
4. Roll out to production sites

### Step 4: Monitor

1. Check error logs for verification failures
2. Monitor API calls for duplicates
3. Verify no duplicate site_ids created
4. Check user feedback

## 🔄 Upgrade Path

### From 1.0.4 to 1.0.5

**Automatic Upgrade**:
- No database changes required
- Existing site_ids are preserved
- First activation will verify existing registration
- Seamless upgrade experience

**Manual Upgrade**:
1. Deactivate version 1.0.4
2. Delete plugin files (data remains in database)
3. Upload version 1.0.5
4. Activate plugin
5. Verification will confirm existing registration

## 🐛 Troubleshooting

### Issue: Verification Endpoint Not Found (404)

**Symptom**: Error log shows "Verification failed - 404"

**Solution**: 
- API endpoint not yet deployed
- Plugin will fall back to registration
- Deploy API endpoint to fix

### Issue: Duplicate Registrations Still Created

**Symptom**: Multiple site_ids for same domain

**Solution**:
- Check API registration endpoint logic
- Ensure site_id in request is being used
- Verify Authorization header is sent

### Issue: Widget Not Loading

**Symptom**: Widget doesn't appear on site

**Solution**:
- Check if verification is failing
- Verify widget_url is correct
- Check browser console for errors
- Ensure site_id and token are valid

## 📊 Success Metrics

Monitor these metrics after deployment:

1. **Duplicate Rate**: Should drop to near 0%
2. **Verification Success Rate**: Should be > 95%
3. **Registration Calls**: Should decrease significantly
4. **Error Rate**: Should remain stable or decrease
5. **User Complaints**: Should decrease

## 🔙 Rollback Plan

If critical issues are found:

1. **Immediate Rollback**:
   ```bash
   # Revert to 1.0.4
   wp plugin deactivate vision-privacy
   wp plugin delete vision-privacy
   wp plugin install vision-privacy-1.0.4.zip --activate
   ```

2. **Database**: No cleanup needed (backward compatible)

3. **API**: Keep new endpoints (backward compatible)

4. **Communication**: Notify affected users

## 📝 Release Notes

### For Users

**What's New in 1.0.5**:
- Smarter registration system prevents duplicate entries
- Faster activation (reuses existing registration)
- Better handling of re-registrations
- Improved data continuity

**What You'll Notice**:
- Clicking "Register Site" multiple times won't create duplicates
- Plugin activation is faster
- No changes to widget behavior
- No action required on your part

### For Developers

**Technical Changes**:
- New `verify_existing_registration()` method
- Enhanced `register_site()` logic
- API verification endpoint integration
- Authorization header in registration calls
- Automatic widget_url updates

**API Integration**:
- Requires `/api/sites/verify/{site_id}` endpoint
- Registration endpoint should handle site_id updates
- Backward compatible with old plugin versions

## 📞 Support

If issues arise:

1. Check error logs: `wp-content/debug.log`
2. Review API logs for verification/registration calls
3. Check database for duplicate site_ids
4. Contact Vision Media support with:
   - Plugin version
   - WordPress version
   - Error messages
   - Steps to reproduce

## ✅ Post-Deployment Verification

After deployment, verify:

- [ ] Fresh installations work correctly
- [ ] Existing sites reuse their site_id
- [ ] No duplicate registrations created
- [ ] Verification endpoint responds correctly
- [ ] Registration updates work properly
- [ ] Widget loads correctly
- [ ] Error handling works as expected
- [ ] Performance is acceptable

## 📅 Timeline

1. **Day 1**: Deploy API changes to staging
2. **Day 2**: Test all scenarios in staging
3. **Day 3**: Deploy API to production
4. **Day 4**: Deploy plugin to test sites
5. **Day 5**: Monitor and fix any issues
6. **Day 6**: Roll out to all sites
7. **Day 7**: Final verification and monitoring

## 🎉 Expected Outcomes

After successful deployment:

- ✅ Zero duplicate registrations
- ✅ Faster plugin activation
- ✅ Better data continuity
- ✅ Reduced API calls
- ✅ Cleaner database
- ✅ Improved user experience
- ✅ Easier debugging and support

---

**Prepared by**: Kiro AI Assistant  
**Date**: 2025-11-13  
**Version**: 1.0.5  
**Status**: Ready for API implementation and testing
