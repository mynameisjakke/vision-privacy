<?php
/**
 * Vision Privacy Plugin Uninstall Script
 * 
 * This file is executed when the plugin is deleted via WordPress admin.
 * It cleans up all plugin data from the database.
 */

// Prevent direct access
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// Delete all plugin options
delete_option('vision_privacy_site_id');
delete_option('vision_privacy_token');
delete_option('vision_privacy_widget_url');
delete_option('vision_privacy_registration_status');
delete_option('vision_privacy_last_error');
delete_option('vision_privacy_registered_domain');
delete_option('vision_privacy_api_endpoint');
delete_option('vision_privacy_manual_mode');

// Clean up transients
delete_transient('vision_privacy_activated');
delete_transient('vision_privacy_registration_error');

// For multisite installations, clean up site-specific options
if (is_multisite()) {
    global $wpdb;
    
    $blog_ids = $wpdb->get_col("SELECT blog_id FROM $wpdb->blogs");
    
    foreach ($blog_ids as $blog_id) {
        switch_to_blog($blog_id);
        
        // Delete options for this site
        delete_option('vision_privacy_site_id');
        delete_option('vision_privacy_token');
        delete_option('vision_privacy_widget_url');
        delete_option('vision_privacy_registration_status');
        delete_option('vision_privacy_last_error');
        delete_option('vision_privacy_registered_domain');
        delete_option('vision_privacy_api_endpoint');
        delete_option('vision_privacy_manual_mode');
        
        // Clean up transients for this site
        delete_transient('vision_privacy_activated');
        delete_transient('vision_privacy_registration_error');
        
        restore_current_blog();
    }
}