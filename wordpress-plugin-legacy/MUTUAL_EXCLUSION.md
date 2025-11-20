# Mutual Exclusion Implementation

## Overview

The Vision Privacy plugin system implements mutual exclusion to prevent both the main plugin and legacy plugin from being active simultaneously. This ensures that only one version of the plugin can be active at any given time.

## Implementation Details

### Legacy Plugin (vision-privacy-legacy.php)

The legacy plugin checks for the main plugin during activation:

```php
private function is_main_plugin_active() {
    if (!function_exists('is_plugin_active')) {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
    }
    return is_plugin_active('vision-privacy/vision-privacy.php');
}
```

If the main plugin is detected as active during activation, the legacy plugin:
1. Deactivates itself using `deactivate_plugins()`
2. Displays a user-friendly error message via `wp_die()`
3. Provides a link back to the plugins page

### Main Plugin (vision-privacy.php)

The main plugin checks for the legacy plugin during activation:

```php
private function is_legacy_plugin_active() {
    if (!function_exists('is_plugin_active')) {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
    }
    return is_plugin_active('vision-privacy-legacy/vision-privacy-legacy.php');
}
```

If the legacy plugin is detected as active during activation, the main plugin:
1. Deactivates itself using `deactivate_plugins()`
2. Displays a user-friendly error message via `wp_die()`
3. Provides a link back to the plugins page

## User Experience

### Scenario 1: Main Plugin Active, Attempting to Activate Legacy

1. User has Vision Privacy (main) plugin active
2. User attempts to activate Vision Privacy Legacy
3. System displays error: "Vision Privacy Legacy cannot be activated because Vision Privacy is already active"
4. User is instructed to deactivate the main plugin first
5. Legacy plugin remains inactive

### Scenario 2: Legacy Plugin Active, Attempting to Activate Main

1. User has Vision Privacy Legacy plugin active
2. User attempts to activate Vision Privacy (main)
3. System displays error: "Vision Privacy cannot be activated because Vision Privacy Legacy is already active"
4. User is instructed to deactivate the legacy plugin first
5. Main plugin remains inactive

## Error Messages

### Legacy Plugin Error Message

```
Plugin Activation Error

Vision Privacy Legacy cannot be activated because Vision Privacy is already active.

You can only have one version of Vision Privacy active at a time.

If you need to use the legacy version (PHP 7.3 compatible), please deactivate the main Vision Privacy plugin first.

[Return to Plugins]
```

### Main Plugin Error Message

```
Plugin Activation Error

Vision Privacy cannot be activated because Vision Privacy Legacy is already active.

You can only have one version of Vision Privacy active at a time.

If you need to use the main version (requires PHP 7.4+), please deactivate the Vision Privacy Legacy plugin first.

[Return to Plugins]
```

## Testing

To test the mutual exclusion:

1. **Test Case 1: Activate Legacy When Main is Active**
   - Activate Vision Privacy (main)
   - Attempt to activate Vision Privacy Legacy
   - Expected: Error message displayed, legacy plugin not activated

2. **Test Case 2: Activate Main When Legacy is Active**
   - Activate Vision Privacy Legacy
   - Attempt to activate Vision Privacy (main)
   - Expected: Error message displayed, main plugin not activated

3. **Test Case 3: Switch from Main to Legacy**
   - Activate Vision Privacy (main)
   - Deactivate Vision Privacy (main)
   - Activate Vision Privacy Legacy
   - Expected: Legacy plugin activates successfully

4. **Test Case 4: Switch from Legacy to Main**
   - Activate Vision Privacy Legacy
   - Deactivate Vision Privacy Legacy
   - Activate Vision Privacy (main)
   - Expected: Main plugin activates successfully

## Requirements Validation

This implementation satisfies **Requirement 6.4**:

> WHEN both plugins are present THEN the System SHALL prevent simultaneous activation

The mutual exclusion check ensures that:
- ✅ Both plugins can be installed simultaneously
- ✅ Only one plugin can be active at a time
- ✅ Clear error messages guide users on how to switch between versions
- ✅ No data loss occurs when switching between versions (both use same option names)
