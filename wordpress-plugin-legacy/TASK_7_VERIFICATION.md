# Task 7: Update API Communication to Report Legacy Version

## Implementation Summary

This task has been completed. All API communication endpoints now correctly report the legacy version identifier.

## Changes Made

### 1. User-Agent Header Updates

All API calls now include the User-Agent header: `VisionPrivacy-WP-Legacy/1.0.5-legacy`

**Updated endpoints:**
- ✅ `/api/sites/register` - Already had correct User-Agent
- ✅ `/api/sites/verify/{site_id}` - Already had correct User-Agent  
- ✅ `/api/sites/deactivate` - **ADDED** User-Agent header
- ✅ `/api/health` - **ADDED** User-Agent header

### 2. Plugin Version in Registration Data

The `plugin_version` field in registration data is set to: `1.0.5-legacy`

**Location:** Line 197 in `vision-privacy-legacy.php`
```php
'plugin_version' => VISION_PRIVACY_LEGACY_VERSION,
```

**Constant Definition:** Line 24 in `vision-privacy-legacy.php`
```php
define('VISION_PRIVACY_LEGACY_VERSION', '1.0.5-legacy');
```

## Verification Steps

### Manual Verification

1. **Check Registration Data:**
   - Activate the plugin on a WordPress site
   - Check the API logs on the Vision Privacy server
   - Verify the registration request contains:
     - `plugin_version: "1.0.5-legacy"`
     - User-Agent header: `VisionPrivacy-WP-Legacy/1.0.5-legacy`

2. **Check Test Connection:**
   - Go to Settings > Vision Privacy Legacy
   - Click "Test Connection" button
   - Check server logs to verify User-Agent header is sent

3. **Check Deactivation:**
   - Deactivate the plugin
   - Check server logs to verify deactivation request includes User-Agent header

### Code Verification

All API calls in the plugin now include the User-Agent header:

```php
// Registration (line 217)
$response = wp_remote_post($this->api_endpoint . '/api/sites/register', array(
    'headers' => array(
        'User-Agent' => 'VisionPrivacy-WP-Legacy/' . VISION_PRIVACY_LEGACY_VERSION,
        // ...
    )
));

// Verification (line 285)
$response = wp_remote_get(
    $this->api_endpoint . '/api/sites/verify/' . $this->site_id,
    array(
        'headers' => array(
            'User-Agent' => 'VisionPrivacy-WP-Legacy/' . VISION_PRIVACY_LEGACY_VERSION,
            // ...
        )
    )
);

// Deactivation (line 596) - UPDATED
wp_remote_post($this->api_endpoint . '/api/sites/deactivate', array(
    'headers' => array(
        'User-Agent' => 'VisionPrivacy-WP-Legacy/' . VISION_PRIVACY_LEGACY_VERSION,
        // ...
    )
));

// Health Check (line 721) - UPDATED
$response = wp_remote_get($this->api_endpoint . '/api/health', array(
    'headers' => array(
        'User-Agent' => 'VisionPrivacy-WP-Legacy/' . VISION_PRIVACY_LEGACY_VERSION
    )
));
```

## Requirements Validation

✅ **Requirement 1.3:** Plugin sends identical data structure as main plugin
- The `plugin_version` field correctly identifies this as the legacy version

✅ **Requirement 6.3:** Plugin reports version "1.0.5-legacy" to the API
- All API calls include the legacy version identifier in both:
  - The `plugin_version` field in request body
  - The User-Agent header

## API Acceptance

The Vision Privacy API should accept the legacy version identifier because:

1. The API endpoint structure is identical to the main plugin
2. The data structure is identical (only the version string differs)
3. The User-Agent header provides additional context for server-side logging
4. The version format follows semantic versioning with a suffix

## Next Steps

To fully verify this implementation:

1. Deploy the legacy plugin to a test WordPress site with PHP 7.3
2. Monitor API logs during:
   - Initial registration
   - Domain change re-registration
   - Test connection
   - Plugin deactivation
3. Confirm all requests show the legacy version identifier
4. Verify the API processes requests correctly

## Files Modified

- `wordpress-plugin-legacy/vision-privacy-legacy.php`
  - Line 596-610: Added User-Agent to `notify_deactivation()`
  - Line 716-738: Added User-Agent to `ajax_test_connection()`
