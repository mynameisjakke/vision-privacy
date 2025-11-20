=== Vision Privacy Legacy ===
Contributors: visionmedia, jakobvisionmedia
Tags: gdpr, privacy, cookies, consent, imy, compliance, php73
Requires at least: 5.0
Tested up to: 6.4
Stable tag: 1.0.5-legacy
Requires PHP: 7.3
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Centralized privacy and cookie policy management for GDPR/IMY compliance - PHP 7.3 compatible version.

== Description ==

**Vision Privacy Legacy** is a PHP 7.3 compatible version of the Vision Privacy plugin, designed specifically for websites running on older PHP versions. This plugin provides identical functionality to the main Vision Privacy plugin while ensuring compatibility with PHP 7.3 servers.

= Why Use Vision Privacy Legacy? =

If your hosting environment runs PHP 7.3 and you cannot upgrade to PHP 7.4 or higher, this legacy version allows you to:

* Manage GDPR and IMY compliance requirements
* Automatically generate privacy policies and cookie policies
* Display customizable cookie consent banners
* Track and document user consent
* Detect analytics, forms, and e-commerce integrations
* Handle domain changes automatically

= Key Features =

* **PHP 7.3 Compatible** - Specifically built to run on PHP 7.3.0 and higher
* **Automatic Site Registration** - Registers your site with Vision Privacy API on activation
* **Smart Detection** - Automatically detects Google Analytics, Facebook Pixel, Contact Form 7, Gravity Forms, WPForms, Ninja Forms, and WooCommerce
* **Cookie Consent Widget** - Displays a GDPR-compliant cookie consent banner
* **Swedish Language Support** - Full Swedish language interface (Svensk språkstöd)
* **Company Information Management** - Store and manage company details for privacy policies
* **Domain Change Handling** - Automatically re-registers when your domain changes
* **Manual Widget Placement** - Use shortcode or PHP function for custom placement
* **Development Mode** - Automatically disables widget on localhost and development domains

= Important: Legacy vs Main Plugin =

**Use Vision Privacy Legacy if:**
* Your server runs PHP 7.3
* You cannot upgrade to PHP 7.4 or higher
* You need GDPR compliance on older hosting

**Use Vision Privacy (main plugin) if:**
* Your server runs PHP 7.4 or higher
* You want the latest features and updates
* You're setting up a new website

**Note:** You cannot have both plugins active at the same time. The plugins will prevent simultaneous activation to avoid conflicts.

= How It Works =

1. **Install and Activate** - The plugin automatically registers your site with the Vision Privacy API
2. **Enter Company Information** - Provide your business details in Settings > Vision Privacy Legacy
3. **Automatic Detection** - The plugin scans your site for analytics, forms, and e-commerce tools
4. **Widget Display** - A cookie consent banner appears automatically on your frontend pages
5. **Policy Generation** - Privacy and cookie policies are generated based on your site's configuration

= Compatibility =

* **PHP Version:** 7.3.0 or higher
* **WordPress Version:** 5.0 or higher (tested up to 6.4)
* **Database:** MySQL 5.6+ or MariaDB 10.0+

= Detected Integrations =

The plugin automatically detects and includes in privacy policies:

* Google Analytics (all versions)
* Facebook Pixel
* Contact Form 7
* Gravity Forms
* WPForms
* Ninja Forms
* WooCommerce (including payment gateways)
* MonsterInsights
* ExactMetrics

= Privacy & Data =

This plugin communicates with the Vision Privacy API (vision-privacy.vercel.app) to:
* Register your site and receive a unique site ID
* Retrieve your customized cookie consent widget
* Generate GDPR-compliant privacy policies

Data sent to the API includes:
* Site domain and WordPress version
* Installed plugins and active theme
* Detected forms, analytics, and e-commerce tools
* Company information you provide

No personal data from your site visitors is sent to the API.

== Installation ==

= Automatic Installation =

1. Log in to your WordPress admin panel
2. Navigate to Plugins > Add New
3. Search for "Vision Privacy Legacy"
4. Click "Install Now" and then "Activate"
5. Go to Settings > Vision Privacy Legacy to configure

= Manual Installation =

1. Download the plugin ZIP file
2. Log in to your WordPress admin panel
3. Navigate to Plugins > Add New > Upload Plugin
4. Choose the ZIP file and click "Install Now"
5. Click "Activate Plugin"
6. Go to Settings > Vision Privacy Legacy to configure

= After Installation =

1. The plugin will automatically attempt to register your site
2. Navigate to Settings > Vision Privacy Legacy
3. Fill in your company information (required for privacy policies)
4. Click "Spara företagsinformation" (Save Company Information)
5. The cookie consent widget will now appear on your frontend pages

= Upgrading from Main Plugin =

If you're downgrading from the main Vision Privacy plugin to the legacy version:

1. Deactivate the main Vision Privacy plugin
2. Install and activate Vision Privacy Legacy
3. Your registration data and settings will be preserved automatically
4. No additional configuration needed

= Upgrading to Main Plugin =

If you're upgrading your PHP version and want to switch to the main plugin:

1. Upgrade your server to PHP 7.4 or higher
2. Deactivate Vision Privacy Legacy
3. Install and activate Vision Privacy (main plugin)
4. Your registration data and settings will be preserved automatically
5. No additional configuration needed

== Frequently Asked Questions ==

= What is the difference between Vision Privacy and Vision Privacy Legacy? =

Vision Privacy Legacy is specifically built for PHP 7.3 compatibility. The main Vision Privacy plugin requires PHP 7.4 or higher. Both plugins have identical functionality - the only difference is PHP version compatibility.

= Can I use both plugins at the same time? =

No. The plugins include mutual exclusion checks to prevent both from being active simultaneously. You must choose one version based on your PHP version.

= How do I know which version to use? =

Check your PHP version in WordPress under Tools > Site Health > Info > Server. If it shows PHP 7.3.x, use Vision Privacy Legacy. If it shows PHP 7.4 or higher, use the main Vision Privacy plugin.

= Will my data be lost if I switch between plugins? =

No. Both plugins use the same database schema and option names. Your registration data, company information, and settings will be preserved when switching between versions.

= Why should I upgrade from PHP 7.3? =

PHP 7.3 reached end-of-life on December 6, 2021, and no longer receives security updates. We recommend upgrading to PHP 8.0 or higher for better security, performance, and access to the latest features.

= Does this plugin work on localhost? =

The plugin detects development environments (localhost, .local, .dev, .test domains) and automatically disables widget injection. You can still configure the plugin and test the admin interface.

= How do I manually place the widget? =

You have two options:

1. **Shortcode:** Add `[vision_privacy_widget]` to any page or post
2. **PHP Function:** Add `<?php VisionPrivacyPluginLegacy::render_widget(); ?>` to your theme template

Enable "Manual Mode" in Settings > Vision Privacy Legacy > Advanced Settings to disable automatic injection.

= What happens if my domain changes? =

The plugin automatically detects domain changes and re-registers your site with the new domain. You'll see an admin notice confirming the re-registration.

= Where can I get support? =

For support, please contact Vision Media:
* Email: support@visionmedia.io
* Website: https://visionmedia.io

= Is this plugin GDPR compliant? =

Yes. The plugin helps you achieve GDPR compliance by providing cookie consent management and automatically generating privacy policies based on your site's configuration.

= What data does the plugin collect? =

The plugin collects technical information about your WordPress installation (version, plugins, theme, detected forms/analytics) to generate accurate privacy policies. No visitor data is collected or transmitted.

= Can I customize the cookie consent banner? =

The widget appearance is managed through the Vision Privacy API. Contact Vision Media for customization options.

= Does this work with WooCommerce? =

Yes. The plugin automatically detects WooCommerce and includes information about payment gateways in your privacy policy.

= What forms are supported? =

The plugin automatically detects:
* Contact Form 7
* Gravity Forms
* WPForms
* Ninja Forms

= What analytics tools are detected? =

The plugin detects:
* Google Analytics (all versions: UA, GA4, gtag.js)
* Facebook Pixel
* MonsterInsights
* ExactMetrics
* GA Google Analytics plugin

== Screenshots ==

1. Admin interface showing registration status and company information
2. Detected forms, analytics, and WooCommerce integration
3. Widget integration settings and manual placement options
4. Cookie consent banner on frontend (Swedish language)
5. Debug information and connection testing

== Changelog ==

= 1.0.5-legacy (2024-01-15) =
* Initial release of PHP 7.3 compatible version
* Feature parity with Vision Privacy 1.0.5
* Mutual exclusion with main plugin
* Automatic site registration
* Company information management
* Form and analytics detection
* WooCommerce integration
* Domain change handling
* Manual widget placement (shortcode and PHP function)
* Swedish language support
* Development mode detection

== Upgrade Notice ==

= 1.0.5-legacy =
Initial release of the PHP 7.3 compatible version. If you're currently using the main Vision Privacy plugin and need PHP 7.3 compatibility, deactivate the main plugin before installing this version. Your data will be preserved.

== PHP Version Requirements ==

**This plugin requires PHP 7.3.0 or higher.**

If your server runs PHP 7.4 or higher, we recommend using the main Vision Privacy plugin instead of this legacy version for better performance and access to the latest features.

To check your PHP version:
1. Go to Tools > Site Health in your WordPress admin
2. Click the "Info" tab
3. Expand the "Server" section
4. Look for "PHP version"

If you need to upgrade PHP, contact your hosting provider.

== Technical Information ==

= System Requirements =
* PHP: 7.3.0 or higher
* WordPress: 5.0 or higher
* MySQL: 5.6 or higher (or MariaDB 10.0+)
* HTTPS: Recommended for secure API communication

= API Endpoint =
* Production: https://vision-privacy.vercel.app

= Database Options =
The plugin stores data using WordPress options API with the following option names:
* vision_privacy_site_id
* vision_privacy_token
* vision_privacy_widget_url
* vision_privacy_registration_status
* vision_privacy_company_name
* vision_privacy_contact_email
* vision_privacy_country
* (and other company information fields)

= Uninstallation =
When you uninstall the plugin, all options are automatically deleted. If you only deactivate the plugin, your settings are preserved for potential reactivation.

== Credits ==

Developed by Jakob Bourhil @ Vision Media
Website: https://visionmedia.io

== Support ==

For technical support, feature requests, or bug reports:
* Email: support@visionmedia.io
* Website: https://visionmedia.io
