# Vision Privacy WordPress Plugin - Installation Guide

## Quick Installation

1. **Download the Plugin**
   - Download all files from the `wordpress-plugin` directory
   - Create a ZIP file containing all plugin files

2. **Upload to WordPress**
   - Go to your WordPress admin area
   - Navigate to **Plugins → Add New → Upload Plugin**
   - Choose the ZIP file and click **Install Now**
   - Click **Activate Plugin**

3. **Automatic Setup**
   - The plugin will automatically register your site with Vision Privacy
   - Check **Settings → Vision Privacy** for registration status
   - Look for admin notices confirming successful setup

## Manual Installation

1. **FTP Upload**
   - Upload the entire `vision-privacy` folder to `/wp-content/plugins/`
   - Ensure all files have proper permissions (644 for files, 755 for directories)

2. **Activate Plugin**
   - Go to **Plugins → Installed Plugins**
   - Find "Vision Privacy" and click **Activate**

## Verification

After installation, verify the setup:

1. **Check Registration Status**
   - Go to **Settings → Vision Privacy**
   - Ensure status shows "✓ Registered"
   - Verify Site ID is displayed

2. **Test Widget Loading**
   - Visit your website's frontend
   - Check browser developer tools for Vision Privacy scripts
   - Look for `window.VP_SITE_ID` in the page source

3. **Verify Data Collection**
   - In the admin settings, review detected forms and plugins
   - Check that analytics services are properly identified

## Troubleshooting

### Registration Failed
- Check internet connection
- Verify API endpoint is accessible
- Review error messages in settings page
- Try manual re-registration

### Widget Not Loading
- Ensure registration is successful
- Check that Manual Mode is disabled
- Verify domain matches registration
- Look for JavaScript errors in browser console

### Domain Changes
- Plugin automatically detects domain changes
- Re-registration happens automatically
- Check admin notices for status updates
- Manually re-register if automatic process fails

## Configuration Options

### Automatic Mode (Default)
- Widget loads automatically on all pages
- No additional setup required
- Recommended for most sites

### Manual Mode
- Enable in **Settings → Vision Privacy**
- Use shortcode: `[vision_privacy_widget]`
- Or PHP function: `VisionPrivacyPlugin::render_widget()`
- Gives you control over widget placement

## File Structure

```
vision-privacy/
├── vision-privacy.php          # Main plugin file
├── includes/
│   └── admin-page.php         # Admin interface
├── uninstall.php              # Cleanup on deletion
├── README.md                  # Documentation
├── INSTALL.md                 # This file
└── CHANGELOG.md               # Version history
```

## Requirements

- WordPress 5.0+
- PHP 7.4+
- Active internet connection
- Valid Vision Privacy service account

## Support

For installation issues:

1. Check the debug information in **Settings → Vision Privacy**
2. Review WordPress error logs
3. Contact Vision Media support with your Site ID and error details

## Security Notes

- All API communication uses HTTPS
- Site tokens are stored securely in WordPress options
- Input validation prevents injection attacks
- Domain validation ensures widget security