# Vision Privacy WordPress Plugin - Changelog

All notable changes to the Vision Privacy WordPress plugin will be documented in this file.

## [1.0.5] - 2025-11-13

### Added
- **Smart Registration System**: Plugin now checks if site is already registered before creating new registration
- **Registration Verification**: New `verify_existing_registration()` method validates existing site_id with API
- **Automatic Updates**: Widget URL automatically updates when verification detects changes

### Changed
- **Prevent Duplicates**: Registration now reuses existing site_id instead of creating duplicate entries
- **Update Instead of Create**: Registration endpoint now includes site_id and auth token for updates
- **Improved Flow**: Better registration logic prevents multiple registrations of the same site

### Fixed
- **Duplicate Prevention**: Fixed issue where clicking "Register Site" multiple times created duplicate registrations
- **Data Continuity**: Maintains consistent site_id across re-registrations, preserving historical data
- **Lost Connections**: Prevents loss of connection to previous site data and analytics

### Technical Details
- Registration checks for existing site_id before making API call
- Verification endpoint validates registration status (200 = valid, 404 = not found, 401 = unauthorized)
- Includes Authorization header with existing token for update operations
- Gracefully handles invalid/expired registrations by creating new ones

## [1.0.4] - 2025-11-13

### Added
- **Clear Error Button**: Added button to clear old error messages from admin interface
- **Better UX**: Users can now easily clear stale error messages without database access

### Improved
- **Error Handling**: Better handling of stale error messages
- **Admin Interface**: Cleaner error display with clear action button

## [1.0.3] - 2025-11-13

### Fixed
- **HTTP Status Codes**: Now accepts both HTTP 200 and 201 as successful registration
- **False Error Messages**: Fixed issue where successful registration (HTTP 201) was shown as error

### Technical Details
- Registration endpoint returns HTTP 201 (Created) on success
- Plugin now correctly handles both 200 and 201 status codes
- Prevents "Registration failed" error on successful registration

## [1.0.2] - 2025-11-13

### Fixed
- **API Compatibility**: Fixed domain format - now sends full URL instead of hostname only
- **Plugin Data Format**: Fixed installed_plugins format - now sends array of strings instead of objects
- **Registration**: Resolved validation errors during site registration

### Technical Details
- Domain now sent as full URL (e.g., "https://example.com" instead of "example.com")
- Plugins formatted as strings: "Plugin Name v1.0.0 (active/inactive)"
- Fixes HTTP 400 validation errors

## [1.0.1] - 2025-11-13

### Changed
- **Production Ready**: Updated API endpoint to production URL (https://vision-privacy.vercel.app)
- **Author Information**: Updated author details to Jakob Bourhil @ Vision Media
- **Performance**: Backend optimized for 800+ WordPress sites with 5x faster database queries
- **Stability**: Production deployment tested and verified

### Technical Updates
- API endpoint now points to production Vercel deployment
- Database performance optimized (80 warnings fixed)
- All endpoints tested and verified working
- Ready for large-scale deployment

## [1.0.0] - 2024-10-31

### Added
- Initial release of Vision Privacy WordPress plugin
- Automatic site registration with Vision Privacy API
- Widget script injection in wp_head
- Comprehensive admin settings page
- Form detection for popular plugins (Contact Form 7, Gravity Forms, WPForms, Ninja Forms)
- Plugin and theme data collection
- Analytics and tracking service detection
- WooCommerce integration data collection
- Domain validation and automatic re-registration
- Manual mode for custom widget placement
- Shortcode support: `[vision_privacy_widget]`
- PHP function for theme integration: `VisionPrivacyPlugin::render_widget()`
- Development environment detection
- Comprehensive error handling and logging
- Admin notices for registration status
- AJAX endpoints for testing and manual registration
- Debug information panel
- Automatic cleanup on plugin uninstall
- Security features: input validation, nonce protection, capability checks

### Features
- **Automatic Registration**: Plugin registers site automatically on activation
- **Smart Widget Injection**: Automatically injects widget script with security checks
- **Form Detection**: Identifies and counts forms from popular form plugins
- **Analytics Detection**: Scans for Google Analytics, Facebook Pixel, and tracking plugins
- **WooCommerce Support**: Collects e-commerce data for enhanced privacy policies
- **Domain Monitoring**: Detects domain changes and re-registers automatically
- **Manual Integration**: Supports manual widget placement via shortcode or PHP
- **Development Mode**: Disables widget on localhost/development domains
- **Comprehensive Admin**: Full-featured settings page with status monitoring
- **Error Recovery**: Robust error handling with retry mechanisms
- **Security First**: Multiple security layers and validation checks

### Technical Details
- **WordPress Compatibility**: 5.0+
- **PHP Compatibility**: 7.4+
- **Database**: Uses WordPress options API for configuration storage
- **API Communication**: HTTPS-only communication with Vision Privacy service
- **Performance**: Lightweight with minimal database queries
- **Multisite Support**: Compatible with WordPress multisite installations

### Security Features
- Input sanitization and validation
- WordPress nonce protection for AJAX requests
- User capability checks for admin functions
- Secure token-based API authentication
- Domain validation to prevent unauthorized usage
- Development environment detection

### Admin Interface
- Registration status monitoring
- Site information display
- Detected forms and plugins listing
- Analytics and tracking service detection
- WooCommerce integration details
- Manual registration and testing tools
- Debug information panel
- Advanced configuration options

### Integration Options
- **Automatic**: Widget loads automatically on all pages (default)
- **Shortcode**: `[vision_privacy_widget]` for content placement
- **PHP Function**: `VisionPrivacyPlugin::render_widget()` for theme integration
- **Manual Mode**: Disable automatic injection for custom control

### Data Collection
The plugin collects the following data for privacy policy generation:
- Site domain and basic WordPress information
- Installed plugins (name, version, active status)
- Active theme information
- Detected form plugins and counts
- Analytics and tracking services
- WooCommerce configuration (if applicable)
- Basic site statistics (user count, post count)

### Error Handling
- Comprehensive error logging
- Admin notices for important events
- Graceful degradation on API failures
- Automatic retry mechanisms
- Debug information for troubleshooting

### Performance Optimizations
- Asynchronous widget loading
- Minimal database queries
- Efficient plugin detection
- Cached API responses where appropriate
- Lightweight admin interface

## Future Versions

### Planned Features
- Enhanced analytics detection
- Custom privacy policy templates
- Consent statistics dashboard
- Advanced widget customization
- Multi-language support
- Performance monitoring
- Automated testing suite

### Roadmap
- v1.1.0: Enhanced form detection and custom field mapping
- v1.2.0: Consent analytics and reporting dashboard
- v1.3.0: Advanced widget customization options
- v2.0.0: Multi-language support and localization

---

For support and feature requests, please contact Vision Media support.