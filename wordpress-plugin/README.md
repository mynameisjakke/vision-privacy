# Vision Privacy WordPress Plugin

A WordPress plugin that integrates with the Vision Privacy service to provide centralized privacy and cookie policy management for GDPR/IMY compliance.

## Features

- **Automatic Site Registration**: Registers your WordPress site with the Vision Privacy service upon activation
- **Widget Injection**: Automatically injects the Vision Privacy widget script into your site's header
- **Form Detection**: Automatically detects popular form plugins (Contact Form 7, Gravity Forms, WPForms, Ninja Forms)
- **Plugin Monitoring**: Tracks installed and active plugins for privacy policy generation
- **Domain Validation**: Ensures the widget only loads on the registered domain
- **Admin Interface**: Provides a settings page for configuration and monitoring
- **Error Handling**: Comprehensive error handling with admin notifications
- **Debug Information**: Built-in debug tools for troubleshooting

## Requirements

- WordPress 5.0 or higher
- PHP 7.4 or higher
- Active internet connection for API communication
- No account setup required - automatic registration

## Installation

1. **Upload the Plugin**
   - Download the plugin files
   - Upload the `vision-privacy` folder to your `/wp-content/plugins/` directory
   - Or install via WordPress admin by uploading the plugin ZIP file

2. **Activate the Plugin**
   - Go to the WordPress admin area
   - Navigate to Plugins → Installed Plugins
   - Find "Vision Privacy" and click "Activate"

3. **Automatic Registration**
   - The plugin will automatically attempt to register your site with the Vision Privacy service
   - Check the admin notice for registration status
   - If registration fails, you can retry from the settings page

## Configuration

### Settings Page

Access the plugin settings at **Settings → Vision Privacy** in your WordPress admin.

The settings page provides:

- **Registration Status**: Shows whether your site is successfully registered
- **Site Information**: Displays your site details sent to the Vision Privacy service
- **Detected Forms**: Lists form plugins found on your site
- **Advanced Settings**: Configure API endpoint and manual mode
- **Debug Information**: Technical details for troubleshooting

### Manual Registration

If automatic registration fails:

1. Go to **Settings → Vision Privacy**
2. Click the "Register Site" button
3. Check for any error messages
4. Use the "Test Connection" button to verify API connectivity

### Advanced Options

- **API Endpoint**: Change the Vision Privacy API URL (for testing or custom deployments)
- **Manual Mode**: Disable automatic widget injection if you want to control placement manually

## How It Works

### **Automatic Setup (No Account Required)**
1. **Install & Activate**: Simply install the plugin - no signup needed
2. **Automatic Registration**: Plugin automatically registers your site with Vision Privacy
3. **Instant Widget**: Cookie banner and privacy tools work immediately
4. **Policy Generation**: Fill in company details to enable automatic policy creation

### **Behind the Scenes**
1. **Plugin Activation**: 
   - Collects site information (domain, WordPress version, plugins, forms)
   - Automatically registers with Vision Privacy API
   - Receives unique site credentials and widget configuration

2. **Widget Injection**:
   - Adds privacy widget to all pages automatically
   - Handles cookie consent and privacy policy display
   - Works with detected forms and tracking services

3. **Smart Monitoring**:
   - Detects domain changes and re-registers automatically
   - Monitors installed plugins and forms
   - Updates privacy policies when site changes

4. **Company Integration**:
   - Collects company information for legal compliance
   - Generates GDPR/IMY compliant policies
   - Customizes widget based on your business type

## Supported Form Plugins

The plugin automatically detects these form plugins:

- **Contact Form 7** (`contact-form-7/wp-contact-form-7.php`)
- **Gravity Forms** (class `GFForms`)
- **WPForms** (function `wpforms`)
- **Ninja Forms** (class `Ninja_Forms`)

## Troubleshooting

### Registration Failed

If site registration fails:

1. Check your internet connection
2. Verify the API endpoint is correct
3. Look for error messages in the admin interface
4. Check the debug information for details
5. Try the "Test Connection" button

### Widget Not Appearing

If the cookie banner doesn't show:

1. Verify registration status is "Registered"
2. Check that Manual Mode is disabled
3. Ensure the widget URL is set
4. Look for JavaScript errors in browser console
5. Verify domain matches registration

### Domain Changes

If you change your site's domain:

1. The plugin will automatically detect the change
2. It will attempt to re-register with the new domain
3. Check the settings page for registration status
4. Manually re-register if automatic registration fails

## Security Features

- **Input Validation**: All user inputs are validated and sanitized
- **Nonce Protection**: AJAX requests use WordPress nonces
- **Capability Checks**: Admin functions require proper user capabilities
- **Secure Communication**: All API communication uses HTTPS
- **Token-based Auth**: Site authentication uses secure API tokens

## Data Collected

The plugin sends this information to the Vision Privacy service:

- Site domain and URL
- WordPress version
- Plugin version
- Site name and admin email
- List of installed plugins (name, version, active status)
- Detected form plugins and counts

No personal visitor data is collected by the plugin itself.

## Uninstallation

When you delete the plugin:

1. All plugin options are removed from the database
2. Transient data is cleaned up
3. The Vision Privacy service is notified of deactivation
4. No data remains in your WordPress installation

## Support

For support with the Vision Privacy plugin:

1. Check the debug information in the settings page
2. Review error messages and admin notices
3. Contact Vision Media support with your site ID and error details

## Changelog

### Version 1.0.0
- Initial release
- Automatic site registration
- Widget injection
- Form detection
- Admin interface
- Error handling and debugging tools