<?php
/**
 * Plugin Name: Vision Privacy
 * Plugin URI: https://visionmedia.se
 * Description: Centralized privacy and cookie policy management for GDPR/IMY compliance
 * Version: 1.0.5
 * Author: Jakob Bourhil @ Vision Media
 * Author URI: https://visionmedia.io
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: vision-privacy
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 * Network: false
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('VISION_PRIVACY_VERSION', '1.0.5');
define('VISION_PRIVACY_PLUGIN_FILE', __FILE__);
define('VISION_PRIVACY_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('VISION_PRIVACY_PLUGIN_URL', plugin_dir_url(__FILE__));
define('VISION_PRIVACY_API_ENDPOINT', 'https://vision-privacy.vercel.app');

/**
 * Main Vision Privacy Plugin Class
 */
class VisionPrivacyPlugin {
    
    /**
     * Plugin instance
     */
    private static $instance = null;
    
    /**
     * API endpoint for the Vision Privacy service
     */
    private $api_endpoint;
    
    /**
     * Site registration data
     */
    private $site_id;
    private $api_token;
    private $widget_url;
    
    /**
     * Get plugin instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        $this->api_endpoint = VISION_PRIVACY_API_ENDPOINT;
        $this->site_id = get_option('vision_privacy_site_id');
        $this->api_token = get_option('vision_privacy_token');
        $this->widget_url = get_option('vision_privacy_widget_url');
        
        $this->init_hooks();
    }
    
    /**
     * Initialize WordPress hooks
     */
    private function init_hooks() {
        // Activation and deactivation hooks
        register_activation_hook(VISION_PRIVACY_PLUGIN_FILE, array($this, 'activate'));
        register_deactivation_hook(VISION_PRIVACY_PLUGIN_FILE, array($this, 'deactivate'));
        
        // Admin hooks
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'admin_init'));
        add_action('admin_notices', array($this, 'admin_notices'));
        
        // Frontend hooks
        add_action('wp_head', array($this, 'inject_widget'));
        add_action('init', array($this, 'check_site_url_change'));
        
        // AJAX hooks for admin
        add_action('wp_ajax_vision_privacy_register', array($this, 'ajax_register_site'));
        add_action('wp_ajax_vision_privacy_test_connection', array($this, 'ajax_test_connection'));
        add_action('wp_ajax_vision_privacy_save_company', array($this, 'ajax_save_company_info'));
        add_action('wp_ajax_vision_privacy_clear_error', array($this, 'ajax_clear_error'));
        
        // Add shortcode for manual widget placement
        add_shortcode('vision_privacy_widget', array($this, 'widget_shortcode'));
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Create options with default values
        add_option('vision_privacy_site_id', '');
        add_option('vision_privacy_token', '');
        add_option('vision_privacy_widget_url', '');
        add_option('vision_privacy_registration_status', 'pending');
        add_option('vision_privacy_last_error', '');
        
        // Attempt automatic registration
        $this->register_site();
        
        // Set activation flag for admin notice
        set_transient('vision_privacy_activated', true, 30);
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Clean up transients
        delete_transient('vision_privacy_activated');
        delete_transient('vision_privacy_registration_error');
        
        // Optionally notify API about deactivation
        if ($this->site_id && $this->api_token) {
            $this->notify_deactivation();
        }
        
        // Note: We don't delete options on deactivation in case user reactivates
        // Options are only deleted on uninstall
    }
    
    /**
     * Register site with Vision Privacy API
     * Checks if site is already registered before creating new registration
     */
    public function register_site() {
        try {
            // Check if we already have a site_id
            if (!empty($this->site_id) && !empty($this->api_token)) {
                // Verify existing registration is still valid
                $is_valid = $this->verify_existing_registration();
                
                if ($is_valid) {
                    // Registration is valid, no need to re-register
                    update_option('vision_privacy_registration_status', 'registered');
                    update_option('vision_privacy_last_error', '');
                    return true;
                }
                
                // If not valid, clear old data and proceed with new registration
                error_log('Vision Privacy: Existing registration invalid, creating new registration');
            }
            
            // Prepare site data for registration
            $site_data = array(
                'domain' => $this->get_site_domain(),
                'wp_version' => get_bloginfo('version'),
                'installed_plugins' => $this->get_installed_plugins(),
                'detected_forms' => $this->detect_forms(),
                'plugin_version' => VISION_PRIVACY_VERSION,
                'site_name' => get_bloginfo('name'),
                'admin_email' => get_option('admin_email'),
                'site_language' => get_locale(),
                'timezone' => get_option('timezone_string'),
                'theme_data' => $this->get_theme_data(),
                'analytics_data' => $this->get_site_analytics_data(),
                'woocommerce_data' => $this->get_woocommerce_data(),
                'multisite' => is_multisite(),
                'users_count' => count_users()['total_users'] ?? 0,
                'posts_count' => wp_count_posts('post')->publish ?? 0,
                'pages_count' => wp_count_posts('page')->publish ?? 0,
                'company_info' => $this->get_company_info()
            );
            
            // If we have an existing site_id, include it to update instead of creating duplicate
            if (!empty($this->site_id)) {
                $site_data['site_id'] = $this->site_id;
            }
            
            $response = wp_remote_post($this->api_endpoint . '/api/sites/register', array(
                'body' => json_encode($site_data),
                'headers' => array(
                    'Content-Type' => 'application/json',
                    'User-Agent' => 'VisionPrivacy-WP/' . VISION_PRIVACY_VERSION,
                    // Include auth token if we have one (for updates)
                    'Authorization' => !empty($this->api_token) ? 'Bearer ' . $this->api_token : ''
                ),
                'timeout' => 30,
                'sslverify' => true
            ));
            
            if (is_wp_error($response)) {
                throw new Exception('HTTP Error: ' . $response->get_error_message());
            }
            
            $response_code = wp_remote_retrieve_response_code($response);
            $response_body = wp_remote_retrieve_body($response);
            
            // Accept both 200 (OK) and 201 (Created) as success
            if ($response_code !== 200 && $response_code !== 201) {
                throw new Exception('API Error: HTTP ' . $response_code . ' - ' . $response_body);
            }
            
            $data = json_decode($response_body, true);
            
            if (!$data || !isset($data['success']) || !$data['success']) {
                throw new Exception('Registration failed: ' . ($data['message'] ?? 'Unknown error'));
            }
            
            // Store registration data
            update_option('vision_privacy_site_id', $data['site_id']);
            update_option('vision_privacy_token', $data['api_token']);
            update_option('vision_privacy_widget_url', $data['widget_url']);
            update_option('vision_privacy_registration_status', 'registered');
            update_option('vision_privacy_last_error', '');
            
            // Update instance variables
            $this->site_id = $data['site_id'];
            $this->api_token = $data['api_token'];
            $this->widget_url = $data['widget_url'];
            
            return true;
            
        } catch (Exception $e) {
            $error_message = 'Registration failed: ' . $e->getMessage();
            update_option('vision_privacy_registration_status', 'error');
            update_option('vision_privacy_last_error', $error_message);
            
            // Log error for debugging
            error_log('Vision Privacy Registration Error: ' . $error_message);
            
            return false;
        }
    }
    
    /**
     * Verify if existing registration is still valid
     * 
     * @return bool True if registration is valid, false otherwise
     */
    private function verify_existing_registration() {
        if (empty($this->site_id) || empty($this->api_token)) {
            return false;
        }
        
        try {
            // Call API to verify site registration
            $response = wp_remote_get(
                $this->api_endpoint . '/api/sites/verify/' . $this->site_id,
                array(
                    'headers' => array(
                        'Content-Type' => 'application/json',
                        'Authorization' => 'Bearer ' . $this->api_token,
                        'User-Agent' => 'VisionPrivacy-WP/' . VISION_PRIVACY_VERSION
                    ),
                    'timeout' => 15,
                    'sslverify' => true
                )
            );
            
            if (is_wp_error($response)) {
                error_log('Vision Privacy: Verification failed - ' . $response->get_error_message());
                return false;
            }
            
            $response_code = wp_remote_retrieve_response_code($response);
            
            // 200 means valid, 404 means not found, 401 means unauthorized
            if ($response_code === 200) {
                $data = json_decode(wp_remote_retrieve_body($response), true);
                
                // Verify response structure
                if ($data && isset($data['success']) && $data['success']) {
                    // Update widget URL if it changed
                    if (isset($data['widget_url']) && $data['widget_url'] !== $this->widget_url) {
                        update_option('vision_privacy_widget_url', $data['widget_url']);
                        $this->widget_url = $data['widget_url'];
                    }
                    
                    return true;
                }
            }
            
            // Any other response code means invalid
            return false;
            
        } catch (Exception $e) {
            error_log('Vision Privacy: Verification exception - ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get site domain (normalized)
     */
    private function get_site_domain() {
        // Return full URL as required by API
        return get_site_url();
    }
    
    /**
     * Get list of installed plugins
     */
    private function get_installed_plugins() {
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        
        $all_plugins = get_plugins();
        $active_plugins = get_option('active_plugins', array());
        
        $plugin_data = array();
        foreach ($all_plugins as $plugin_file => $plugin_info) {
            // Format as string: "Plugin Name v1.0.0 (active/inactive)"
            $status = in_array($plugin_file, $active_plugins) ? 'active' : 'inactive';
            $plugin_data[] = sprintf(
                '%s v%s (%s)',
                $plugin_info['Name'],
                $plugin_info['Version'],
                $status
            );
        }
        
        return $plugin_data;
    }
    
    /**
     * Get additional site data for privacy analysis
     */
    public function get_site_analytics_data() {
        $analytics_data = array();
        
        // Check for Google Analytics
        if ($this->has_google_analytics()) {
            $analytics_data[] = array(
                'type' => 'google-analytics',
                'detected' => true,
                'method' => $this->get_ga_detection_method()
            );
        }
        
        // Check for Facebook Pixel
        if ($this->has_facebook_pixel()) {
            $analytics_data[] = array(
                'type' => 'facebook-pixel',
                'detected' => true,
                'method' => 'script-scan'
            );
        }
        
        // Check for other common tracking scripts
        $tracking_plugins = array(
            'google-analytics-for-wordpress/googleanalytics.php' => 'MonsterInsights',
            'ga-google-analytics/ga-google-analytics.php' => 'GA Google Analytics',
            'google-analytics-dashboard-for-wp/gadwp.php' => 'ExactMetrics',
            'facebook-for-woocommerce/facebook-for-woocommerce.php' => 'Facebook for WooCommerce'
        );
        
        foreach ($tracking_plugins as $plugin_file => $plugin_name) {
            if (is_plugin_active($plugin_file)) {
                $analytics_data[] = array(
                    'type' => 'tracking-plugin',
                    'plugin' => $plugin_name,
                    'file' => $plugin_file
                );
            }
        }
        
        return $analytics_data;
    }
    
    /**
     * Check if Google Analytics is present
     */
    private function has_google_analytics() {
        // Check common GA patterns in the database
        global $wpdb;
        
        // Check options for GA tracking codes
        $ga_options = $wpdb->get_results(
            "SELECT option_name, option_value FROM {$wpdb->options} 
             WHERE option_name LIKE '%google%analytics%' 
             OR option_name LIKE '%ga_%' 
             OR option_value LIKE '%UA-%' 
             OR option_value LIKE '%G-%'
             OR option_value LIKE '%gtag%'
             OR option_value LIKE '%analytics.js%'
             OR option_value LIKE '%gtm.js%'"
        );
        
        return !empty($ga_options);
    }
    
    /**
     * Get Google Analytics detection method
     */
    private function get_ga_detection_method() {
        // Check for common GA plugins
        $ga_plugins = array(
            'google-analytics-for-wordpress/googleanalytics.php' => 'MonsterInsights',
            'ga-google-analytics/ga-google-analytics.php' => 'GA Plugin',
            'google-analytics-dashboard-for-wp/gadwp.php' => 'ExactMetrics'
        );
        
        foreach ($ga_plugins as $plugin_file => $plugin_name) {
            if (is_plugin_active($plugin_file)) {
                return 'plugin-' . sanitize_title($plugin_name);
            }
        }
        
        return 'manual-code';
    }
    
    /**
     * Check if Facebook Pixel is present
     */
    private function has_facebook_pixel() {
        global $wpdb;
        
        // Check for Facebook Pixel in options
        $fb_options = $wpdb->get_results(
            "SELECT option_name FROM {$wpdb->options} 
             WHERE option_name LIKE '%facebook%pixel%' 
             OR option_name LIKE '%fb%pixel%'
             OR option_value LIKE '%fbq(%'
             OR option_value LIKE '%facebook.com/tr%'"
        );
        
        return !empty($fb_options);
    }
    
    /**
     * Get theme information
     */
    private function get_theme_data() {
        $theme = wp_get_theme();
        
        return array(
            'name' => $theme->get('Name'),
            'version' => $theme->get('Version'),
            'author' => $theme->get('Author'),
            'template' => $theme->get_template(),
            'stylesheet' => $theme->get_stylesheet(),
            'parent_theme' => $theme->parent() ? $theme->parent()->get('Name') : null
        );
    }
    
    /**
     * Get WooCommerce data if available
     */
    public function get_woocommerce_data() {
        if (!class_exists('WooCommerce')) {
            return null;
        }
        
        global $wpdb;
        
        // Get basic WooCommerce stats
        $product_count = wp_count_posts('product');
        $order_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'shop_order'");
        
        return array(
            'active' => true,
            'version' => defined('WC_VERSION') ? WC_VERSION : 'unknown',
            'product_count' => $product_count->publish ?? 0,
            'order_count' => (int) $order_count,
            'currency' => get_woocommerce_currency(),
            'payment_gateways' => $this->get_active_payment_gateways()
        );
    }
    
    /**
     * Get active WooCommerce payment gateways
     */
    private function get_active_payment_gateways() {
        if (!class_exists('WC_Payment_Gateways')) {
            return array();
        }
        
        $gateways = WC_Payment_Gateways::instance()->get_available_payment_gateways();
        $active_gateways = array();
        
        foreach ($gateways as $gateway_id => $gateway) {
            if ($gateway->enabled === 'yes') {
                $active_gateways[] = array(
                    'id' => $gateway_id,
                    'title' => $gateway->get_title(),
                    'method_title' => $gateway->get_method_title()
                );
            }
        }
        
        return $active_gateways;
    }
    
    /**
     * Detect forms on the site
     */
    public function detect_forms() {
        $forms = array();
        
        // Contact Form 7
        if (is_plugin_active('contact-form-7/wp-contact-form-7.php')) {
            $cf7_forms = get_posts(array(
                'post_type' => 'wpcf7_contact_form',
                'numberposts' => -1,
                'post_status' => 'publish'
            ));
            
            $forms[] = array(
                'type' => 'contact-form-7',
                'count' => count($cf7_forms),
                'plugin' => 'Contact Form 7'
            );
        }
        
        // Gravity Forms
        if (class_exists('GFForms')) {
            $gf_forms = class_exists('GFAPI') ? GFAPI::get_forms() : array();
            $forms[] = array(
                'type' => 'gravity-forms',
                'count' => count($gf_forms),
                'plugin' => 'Gravity Forms'
            );
        }
        
        // WPForms
        if (function_exists('wpforms')) {
            $wpforms = get_posts(array(
                'post_type' => 'wpforms',
                'numberposts' => -1,
                'post_status' => 'publish'
            ));
            
            $forms[] = array(
                'type' => 'wpforms',
                'count' => count($wpforms),
                'plugin' => 'WPForms'
            );
        }
        
        // Ninja Forms
        if (class_exists('Ninja_Forms')) {
            $ninja_forms = Ninja_Forms()->form()->get_forms();
            $forms[] = array(
                'type' => 'ninja-forms',
                'count' => count($ninja_forms),
                'plugin' => 'Ninja Forms'
            );
        }
        
        return $forms;
    }
    
    /**
     * Notify API about plugin deactivation
     */
    private function notify_deactivation() {
        wp_remote_post($this->api_endpoint . '/api/sites/deactivate', array(
            'body' => json_encode(array(
                'site_id' => $this->site_id,
                'domain' => $this->get_site_domain()
            )),
            'headers' => array(
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $this->api_token
            ),
            'timeout' => 10,
            'blocking' => false // Don't wait for response during deactivation
        ));
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            'Vision Privacy Settings',
            'Vision Privacy',
            'manage_options',
            'vision-privacy',
            array($this, 'admin_page')
        );
    }
    
    /**
     * Initialize admin settings
     */
    public function admin_init() {
        register_setting('vision_privacy_settings', 'vision_privacy_api_endpoint');
        register_setting('vision_privacy_settings', 'vision_privacy_manual_mode');
        
        // Company information settings
        register_setting('vision_privacy_company', 'vision_privacy_company_name');
        register_setting('vision_privacy_company', 'vision_privacy_contact_email');
        register_setting('vision_privacy_company', 'vision_privacy_country');
        register_setting('vision_privacy_company', 'vision_privacy_address');
        register_setting('vision_privacy_company', 'vision_privacy_phone');
        register_setting('vision_privacy_company', 'vision_privacy_dpo_email');
        register_setting('vision_privacy_company', 'vision_privacy_org_number');
    }
    
    /**
     * Display admin notices
     */
    public function admin_notices() {
        // Show activation notice
        if (get_transient('vision_privacy_activated')) {
            delete_transient('vision_privacy_activated');
            
            $status = get_option('vision_privacy_registration_status');
            if ($status === 'registered') {
                echo '<div class="notice notice-success is-dismissible">';
                echo '<p><strong>Vision Privacy:</strong> Plugin activated and site registered successfully!</p>';
                echo '</div>';
            } else {
                echo '<div class="notice notice-warning is-dismissible">';
                echo '<p><strong>Vision Privacy:</strong> Plugin activated but registration failed. Please check settings.</p>';
                echo '</div>';
            }
        }
        
        // Show registration error notice
        $last_error = get_option('vision_privacy_last_error');
        if (!empty($last_error) && get_option('vision_privacy_registration_status') === 'error') {
            echo '<div class="notice notice-error is-dismissible">';
            echo '<p><strong>Vision Privacy Error:</strong> ' . esc_html($last_error) . '</p>';
            echo '<p><a href="' . admin_url('options-general.php?page=vision-privacy') . '">Go to settings</a></p>';
            echo '</div>';
        }
        
        // Show domain change notices
        if (get_transient('vision_privacy_domain_change_success')) {
            delete_transient('vision_privacy_domain_change_success');
            echo '<div class="notice notice-success is-dismissible">';
            echo '<p><strong>Vision Privacy:</strong> Domain change detected and site re-registered successfully!</p>';
            echo '</div>';
        }
        
        if (get_transient('vision_privacy_domain_change_error')) {
            delete_transient('vision_privacy_domain_change_error');
            echo '<div class="notice notice-error is-dismissible">';
            echo '<p><strong>Vision Privacy:</strong> Domain change detected but re-registration failed. Please check settings.</p>';
            echo '<p><a href="' . admin_url('options-general.php?page=vision-privacy') . '">Go to settings</a></p>';
            echo '</div>';
        }
    }
    
    /**
     * Admin page content
     */
    public function admin_page() {
        include_once VISION_PRIVACY_PLUGIN_DIR . 'includes/admin-page.php';
    }
    
    /**
     * AJAX handler for manual site registration
     */
    public function ajax_register_site() {
        check_ajax_referer('vision_privacy_admin', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $success = $this->register_site();
        
        wp_send_json(array(
            'success' => $success,
            'message' => $success ? 'Site registered successfully!' : get_option('vision_privacy_last_error')
        ));
    }
    
    /**
     * AJAX handler for testing API connection
     */
    public function ajax_test_connection() {
        check_ajax_referer('vision_privacy_admin', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $response = wp_remote_get($this->api_endpoint . '/api/health', array(
            'timeout' => 10
        ));
        
        if (is_wp_error($response)) {
            wp_send_json(array(
                'success' => false,
                'message' => 'Connection failed: ' . $response->get_error_message()
            ));
        }
        
        $response_code = wp_remote_retrieve_response_code($response);
        wp_send_json(array(
            'success' => $response_code === 200,
            'message' => $response_code === 200 ? 'Connection successful!' : 'API returned HTTP ' . $response_code
        ));
    }
    
    /**
     * AJAX handler for clearing error messages
     */
    public function ajax_clear_error() {
        check_ajax_referer('vision_privacy_admin', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        // Clear the error message
        update_option('vision_privacy_last_error', '');
        
        wp_send_json(array(
            'success' => true,
            'message' => 'Felmeddelande rensat'
        ));
    }
    
    /**
     * Shortcode for manual widget placement
     */
    public function widget_shortcode($atts) {
        $atts = shortcode_atts(array(
            'position' => 'inline'
        ), $atts);
        
        if (empty($this->site_id) || empty($this->widget_url)) {
            return '<!-- Vision Privacy: Not registered -->';
        }
        
        if (!$this->validate_domain()) {
            return '<!-- Vision Privacy: Domain validation failed -->';
        }
        
        ob_start();
        
        echo '<div class="vision-privacy-shortcode" data-position="' . esc_attr($atts['position']) . '">';
        echo '<script type="text/javascript">';
        echo 'window.VisionPrivacyConfig = window.VisionPrivacyConfig || {};';
        echo 'window.VisionPrivacyConfig.shortcode = true;';
        echo 'window.VisionPrivacyConfig.position = "' . esc_js($atts['position']) . '";';
        echo '</script>';
        echo '</div>';
        
        return ob_get_clean();
    }
    
    /**
     * Inject widget script into wp_head
     */
    public function inject_widget() {
        // Check if manual mode is enabled
        if (get_option('vision_privacy_manual_mode')) {
            return;
        }
        
        // Only inject if we have valid registration
        if (empty($this->site_id) || empty($this->widget_url)) {
            // Log missing registration for debugging
            if (current_user_can('manage_options')) {
                error_log('Vision Privacy: Widget injection skipped - missing registration data');
            }
            return;
        }
        
        // Validate domain matches registration
        if (!$this->validate_domain()) {
            return;
        }
        
        // Security check - ensure we're not in admin area
        if (is_admin()) {
            return;
        }
        
        // Skip for login/register pages
        if (in_array($GLOBALS['pagenow'], array('wp-login.php', 'wp-register.php'))) {
            return;
        }
        
        // Additional configuration for widget
        $widget_config = array(
            'site_id' => $this->site_id,
            'api_endpoint' => $this->api_endpoint,
            'domain' => $this->get_site_domain(),
            'wp_version' => get_bloginfo('version'),
            'plugin_version' => VISION_PRIVACY_VERSION,
            'language' => get_locale(),
            'debug' => defined('WP_DEBUG') && WP_DEBUG
        );
        
        // Output widget initialization script
        echo "\n<!-- Vision Privacy Widget -->\n";
        echo "<script type='text/javascript'>\n";
        echo "window.VisionPrivacyConfig = " . json_encode($widget_config) . ";\n";
        echo "window.VP_SITE_ID = '" . esc_js($this->site_id) . "';\n";
        echo "window.VP_API_ENDPOINT = '" . esc_js($this->api_endpoint) . "';\n";
        echo "</script>\n";
        echo "<script src='" . esc_url($this->widget_url) . "' async defer></script>\n";
        echo "<!-- End Vision Privacy Widget -->\n\n";
    }
    
    /**
     * Manual widget injection function for theme developers
     */
    public static function render_widget() {
        $instance = self::get_instance();
        
        if (empty($instance->site_id) || empty($instance->widget_url)) {
            return false;
        }
        
        if (!$instance->validate_domain()) {
            return false;
        }
        
        // Output widget for manual placement
        $widget_config = array(
            'site_id' => $instance->site_id,
            'api_endpoint' => $instance->api_endpoint,
            'domain' => $instance->get_site_domain(),
            'manual_mode' => true
        );
        
        echo "<script type='text/javascript'>";
        echo "window.VisionPrivacyConfig = " . json_encode($widget_config) . ";";
        echo "</script>";
        echo "<script src='" . esc_url($instance->widget_url) . "' async defer></script>";
        
        return true;
    }
    
    /**
     * Validate that current domain matches registered domain
     */
    private function validate_domain() {
        $current_domain = $this->get_site_domain();
        $registered_domain = get_option('vision_privacy_registered_domain');
        
        // If no registered domain stored, update it
        if (empty($registered_domain)) {
            update_option('vision_privacy_registered_domain', $current_domain);
            return true;
        }
        
        // Check if domain has changed
        if ($current_domain !== $registered_domain) {
            // Log domain change
            error_log("Vision Privacy: Domain change detected - Old: {$registered_domain}, New: {$current_domain}");
            
            // Update registered domain
            update_option('vision_privacy_registered_domain', $current_domain);
            
            // Clear existing registration data
            update_option('vision_privacy_registration_status', 'pending');
            
            // Attempt automatic re-registration
            $success = $this->register_site();
            
            if (!$success) {
                // Set admin notice for failed re-registration
                set_transient('vision_privacy_domain_change_error', true, 300); // 5 minutes
                return false;
            }
            
            // Set success notice
            set_transient('vision_privacy_domain_change_success', true, 300);
        }
        
        return true;
    }
    
    /**
     * Enhanced domain security checks
     */
    private function security_checks() {
        // Check for localhost/development environments
        $current_domain = $this->get_site_domain();
        
        $dev_domains = array('localhost', '127.0.0.1', '::1', '.local', '.dev', '.test');
        
        foreach ($dev_domains as $dev_domain) {
            if (strpos($current_domain, $dev_domain) !== false) {
                // Development environment detected
                update_option('vision_privacy_dev_mode', true);
                return false; // Don't inject widget in dev
            }
        }
        
        update_option('vision_privacy_dev_mode', false);
        return true;
    }
    
    /**
     * Check if site URL has changed and handle accordingly
     */
    public function check_site_url_change() {
        $current_url = get_site_url();
        $stored_url = get_option('vision_privacy_site_url');
        
        if (empty($stored_url)) {
            update_option('vision_privacy_site_url', $current_url);
            return;
        }
        
        if ($current_url !== $stored_url) {
            // Site URL changed
            update_option('vision_privacy_site_url', $current_url);
            
            // Trigger domain validation which will handle re-registration
            $this->validate_domain();
        }
    }
    
    /**
     * Get company information for privacy policy generation
     */
    public function get_company_info() {
        return array(
            'company_name' => get_option('vision_privacy_company_name', ''),
            'contact_email' => get_option('vision_privacy_contact_email', get_option('admin_email')),
            'country' => get_option('vision_privacy_country', ''),
            'address' => get_option('vision_privacy_address', ''),
            'phone' => get_option('vision_privacy_phone', ''),
            'dpo_email' => get_option('vision_privacy_dpo_email', ''),
            'org_number' => get_option('vision_privacy_org_number', ''),
            'website_url' => get_site_url(),
            'site_name' => get_bloginfo('name')
        );
    }
    
    /**
     * Validate company information
     */
    public function validate_company_info($data) {
        $errors = array();
        
        // Required fields
        if (empty($data['company_name'])) {
            $errors[] = 'Företagsnamn är obligatoriskt';
        }
        
        if (empty($data['contact_email'])) {
            $errors[] = 'Kontakt-e-post är obligatorisk';
        } elseif (!is_email($data['contact_email'])) {
            $errors[] = 'Kontakt-e-post har ogiltigt format';
        }
        
        if (empty($data['country'])) {
            $errors[] = 'Land är obligatoriskt';
        }
        
        // Optional email validation
        if (!empty($data['dpo_email']) && !is_email($data['dpo_email'])) {
            $errors[] = 'Dataskyddsombuds e-post har ogiltigt format';
        }
        
        return $errors;
    }
    
    /**
     * AJAX handler for saving company information
     */
    public function ajax_save_company_info() {
        check_ajax_referer('vision_privacy_admin', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }
        
        $company_data = array(
            'company_name' => sanitize_text_field($_POST['company_name'] ?? ''),
            'contact_email' => sanitize_email($_POST['contact_email'] ?? ''),
            'country' => sanitize_text_field($_POST['country'] ?? ''),
            'address' => sanitize_textarea_field($_POST['address'] ?? ''),
            'phone' => sanitize_text_field($_POST['phone'] ?? ''),
            'dpo_email' => sanitize_email($_POST['dpo_email'] ?? ''),
            'org_number' => sanitize_text_field($_POST['org_number'] ?? '')
        );
        
        // Validate data
        $errors = $this->validate_company_info($company_data);
        
        if (!empty($errors)) {
            wp_send_json(array(
                'success' => false,
                'message' => 'Valideringsfel: ' . implode(', ', $errors)
            ));
        }
        
        // Save company information
        foreach ($company_data as $key => $value) {
            update_option('vision_privacy_' . $key, $value);
        }
        
        // Re-register site with updated company info
        $registration_success = $this->register_site();
        
        wp_send_json(array(
            'success' => true,
            'message' => 'Företagsinformation sparad' . ($registration_success ? ' och sajt omregistrerad' : ''),
            'registration_updated' => $registration_success
        ));
    }
    
    /**
     * Check if company information is complete
     */
    public function is_company_info_complete() {
        $company_info = $this->get_company_info();
        
        return !empty($company_info['company_name']) && 
               !empty($company_info['contact_email']) && 
               !empty($company_info['country']);
    }
}

// Initialize the plugin
function vision_privacy_init() {
    return VisionPrivacyPlugin::get_instance();
}

// Start the plugin
add_action('plugins_loaded', 'vision_privacy_init');

// Uninstall hook
register_uninstall_hook(__FILE__, 'vision_privacy_uninstall');

/**
 * Plugin uninstall cleanup
 */
function vision_privacy_uninstall() {
    // Delete all plugin options
    delete_option('vision_privacy_site_id');
    delete_option('vision_privacy_token');
    delete_option('vision_privacy_widget_url');
    delete_option('vision_privacy_registration_status');
    delete_option('vision_privacy_last_error');
    delete_option('vision_privacy_registered_domain');
    delete_option('vision_privacy_api_endpoint');
    delete_option('vision_privacy_manual_mode');
    
    // Delete company information
    delete_option('vision_privacy_company_name');
    delete_option('vision_privacy_contact_email');
    delete_option('vision_privacy_country');
    delete_option('vision_privacy_address');
    delete_option('vision_privacy_phone');
    delete_option('vision_privacy_dpo_email');
    delete_option('vision_privacy_org_number');
    
    // Clean up transients
    delete_transient('vision_privacy_activated');
    delete_transient('vision_privacy_registration_error');
}