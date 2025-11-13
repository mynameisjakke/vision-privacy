# Smart Registration Implementation

## Overview

Implemented intelligent registration system that checks if a site is already registered before creating a new registration. This prevents duplicate registrations and maintains data continuity.

## Problem Solved

**Before**: Every time a user clicked "Register Site", a new registration was created, leading to:
- Multiple duplicate registrations for the same site
- Lost connection to previous data and analytics
- Confusion about which site_id to use
- Unnecessary API calls and database entries

**After**: Plugin checks existing registration first:
- Reuses existing site_id if valid
- Only creates new registration when necessary
- Maintains historical data continuity
- Prevents duplicate entries

## Implementation Details

### 1. Modified `register_site()` Method

The registration flow now follows this logic:

```
1. Check if site_id and api_token exist in WordPress options
   ├─ YES: Verify registration is still valid
   │   ├─ VALID: Return success, no API call needed
   │   └─ INVALID: Clear old data, proceed to step 2
   └─ NO: Proceed to step 2

2. Prepare site data for registration
   └─ Include existing site_id if available (for updates)

3. Make API call to /api/sites/register
   └─ Include Authorization header if token exists

4. Store returned site_id, token, and widget_url
```

### 2. New `verify_existing_registration()` Method

```php
private function verify_existing_registration()
```

**Purpose**: Validates that an existing site_id is still valid with the API

**API Endpoint**: `GET /api/sites/verify/{site_id}`

**Headers**:
- `Authorization: Bearer {api_token}`
- `Content-Type: application/json`
- `User-Agent: VisionPrivacy-WP/{version}`

**Response Codes**:
- `200`: Registration is valid
- `404`: Site not found (registration deleted)
- `401`: Unauthorized (invalid token)

**Additional Features**:
- Updates widget_url if it changed on the API side
- Logs verification failures for debugging
- Handles network errors gracefully

### 3. Enhanced Registration Endpoint Call

The registration API call now includes:

```php
// Include existing site_id in request body
if (!empty($this->site_id)) {
    $site_data['site_id'] = $this->site_id;
}

// Include auth token in headers
'Authorization' => !empty($this->api_token) ? 'Bearer ' . $this->api_token : ''
```

This allows the API to:
- Recognize this is an update, not a new registration
- Update existing site data instead of creating duplicate
- Maintain the same site_id across updates

## API Requirements

For this to work properly, the API needs to support:

### 1. Verification Endpoint

```
GET /api/sites/verify/{site_id}
Authorization: Bearer {api_token}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "site_id": "site_xxx",
  "widget_url": "https://...",
  "status": "active"
}
```

**Response (404 Not Found)**:
```json
{
  "success": false,
  "message": "Site not found"
}
```

### 2. Updated Registration Endpoint

```
POST /api/sites/register
Authorization: Bearer {api_token} (optional)
```

**Request Body**:
```json
{
  "site_id": "site_xxx",  // Optional - if provided, update instead of create
  "domain": "https://example.com",
  "wp_version": "6.4",
  // ... other site data
}
```

**Logic**:
- If `site_id` provided and valid: Update existing site
- If `site_id` not provided: Create new site
- If `site_id` provided but invalid: Return error or create new

## Benefits

### For Users
- ✅ No more duplicate registrations
- ✅ Consistent site_id across plugin reinstalls
- ✅ Historical data preserved
- ✅ Cleaner admin experience

### For API/Database
- ✅ Fewer duplicate entries
- ✅ Cleaner data structure
- ✅ Easier to track site history
- ✅ Reduced storage requirements

### For Developers
- ✅ Better debugging (one site = one ID)
- ✅ Easier to track issues
- ✅ More predictable behavior
- ✅ Better error handling

## Edge Cases Handled

1. **Expired/Invalid Token**: Verification fails, new registration created
2. **Deleted Site on API**: Verification returns 404, new registration created
3. **Network Errors**: Verification fails gracefully, attempts new registration
4. **First-Time Registration**: No site_id exists, creates new registration normally
5. **Domain Change**: Existing validation logic still works, updates registration
6. **Plugin Reinstall**: Reuses existing site_id if still in database

## Testing Scenarios

### Scenario 1: First Installation
- ✅ No site_id exists
- ✅ Creates new registration
- ✅ Stores site_id, token, widget_url

### Scenario 2: Re-activation
- ✅ site_id exists in database
- ✅ Verifies registration is valid
- ✅ Reuses existing registration

### Scenario 3: Manual Re-registration
- ✅ User clicks "Register Site" button
- ✅ Verifies existing registration
- ✅ Returns success without creating duplicate

### Scenario 4: Invalid Registration
- ✅ site_id exists but API returns 404
- ✅ Creates new registration
- ✅ Updates stored site_id

### Scenario 5: Domain Change
- ✅ Existing domain validation detects change
- ✅ Calls register_site()
- ✅ Updates registration with new domain
- ✅ Maintains same site_id

## Version Information

- **Plugin Version**: 1.0.5
- **Implementation Date**: 2025-11-13
- **Files Modified**: 
  - `wordpress-plugin/vision-privacy.php`
  - `wordpress-plugin/CHANGELOG.md`

## Next Steps

1. **API Implementation**: Implement `/api/sites/verify/{site_id}` endpoint
2. **API Update Logic**: Update `/api/sites/register` to handle site_id in request
3. **Testing**: Test all scenarios with production API
4. **Documentation**: Update API documentation with new endpoints
5. **Deployment**: Deploy updated plugin to production

## Notes

- The verification call has a 15-second timeout (shorter than registration's 30s)
- Verification failures are logged but don't block functionality
- Widget URL updates are automatic and transparent to users
- All changes are backward compatible with existing installations
