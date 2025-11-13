<?php
/**
 * Vision Privacy Admin Page Template - Swedish UI
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get current settings
$site_id = get_option('vision_privacy_site_id');
$api_token = get_option('vision_privacy_token');
$widget_url = get_option('vision_privacy_widget_url');
$registration_status = get_option('vision_privacy_registration_status');
$last_error = get_option('vision_privacy_last_error');
$api_endpoint = get_option('vision_privacy_api_endpoint', VISION_PRIVACY_API_ENDPOINT);

$is_registered = !empty($site_id) && !empty($api_token) && $registration_status === 'registered';

// Get plugin instance and company info
$plugin_instance = VisionPrivacyPlugin::get_instance();
$company_info = $plugin_instance->get_company_info();
$is_company_complete = $plugin_instance->is_company_info_complete();

// Country options for dropdown
$countries = array(
    'SE' => 'Sverige',
    'NO' => 'Norge',
    'DK' => 'Danmark',
    'FI' => 'Finland',
    'DE' => 'Tyskland',
    'FR' => 'Frankrike',
    'GB' => 'Storbritannien',
    'NL' => 'Nederländerna',
    'BE' => 'Belgien',
    'AT' => 'Österrike',
    'CH' => 'Schweiz',
    'IT' => 'Italien',
    'ES' => 'Spanien',
    'PL' => 'Polen',
    'CZ' => 'Tjeckien',
    'HU' => 'Ungern',
    'EE' => 'Estland',
    'LV' => 'Lettland',
    'LT' => 'Litauen',
    'US' => 'USA',
    'CA' => 'Kanada',
    'AU' => 'Australien'
);
?>

<div class="wrap">
    <h1>Vision Privacy - Integritetspolicy & Cookies</h1>
    
    <div class="vision-privacy-admin">
        
        <!-- Company Information Card -->
        <div class="card">
            <h2>Företagsinformation</h2>
            <p class="description">
                Denna information används för att generera korrekta integritetspolicyer och cookiepolicyer för din webbplats.
                <?php if (!$is_company_complete): ?>
                    <strong style="color: #d63384;">Obligatoriska fält måste fyllas i för att aktivera automatisk policygenerering.</strong>
                <?php endif; ?>
            </p>
            
            <form id="company-info-form">
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="company_name">Företagsnamn <span class="required">*</span></label>
                        </th>
                        <td>
                            <input type="text" 
                                   id="company_name" 
                                   name="company_name" 
                                   value="<?php echo esc_attr($company_info['company_name']); ?>" 
                                   class="regular-text" 
                                   placeholder="t.ex. Vision Media AB" 
                                   required />
                            <p class="description">Juridiskt företagsnamn som ska visas i integritetspolicyn</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="contact_email">Kontakt-e-post <span class="required">*</span></label>
                        </th>
                        <td>
                            <input type="email" 
                                   id="contact_email" 
                                   name="contact_email" 
                                   value="<?php echo esc_attr($company_info['contact_email']); ?>" 
                                   class="regular-text" 
                                   placeholder="info@example.com" 
                                   required />
                            <p class="description">E-postadress för integritetsfrågor</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="country">Land <span class="required">*</span></label>
                        </th>
                        <td>
                            <select id="country" name="country" class="regular-text" required>
                                <option value="">Välj land...</option>
                                <?php foreach ($countries as $code => $name): ?>
                                    <option value="<?php echo esc_attr($code); ?>" 
                                            <?php selected($company_info['country'], $code); ?>>
                                        <?php echo esc_html($name); ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                            <p class="description">Land där företaget är registrerat (påverkar juridisk grund)</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="address">Adress</label>
                        </th>
                        <td>
                            <textarea id="address" 
                                      name="address" 
                                      class="regular-text" 
                                      rows="3" 
                                      placeholder="Gatuadress&#10;Postnummer Stad"><?php echo esc_textarea($company_info['address']); ?></textarea>
                            <p class="description">Företagets postadress (valfritt men rekommenderat)</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="phone">Telefonnummer</label>
                        </th>
                        <td>
                            <input type="tel" 
                                   id="phone" 
                                   name="phone" 
                                   value="<?php echo esc_attr($company_info['phone']); ?>" 
                                   class="regular-text" 
                                   placeholder="+46 8 123 456 78" />
                            <p class="description">Telefonnummer för kontakt (valfritt)</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="org_number">Organisationsnummer</label>
                        </th>
                        <td>
                            <input type="text" 
                                   id="org_number" 
                                   name="org_number" 
                                   value="<?php echo esc_attr($company_info['org_number']); ?>" 
                                   class="regular-text" 
                                   placeholder="556123-4567" />
                            <p class="description">Organisationsnummer (för svenska företag)</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="dpo_email">Dataskyddsombud (DPO)</label>
                        </th>
                        <td>
                            <input type="email" 
                                   id="dpo_email" 
                                   name="dpo_email" 
                                   value="<?php echo esc_attr($company_info['dpo_email']); ?>" 
                                   class="regular-text" 
                                   placeholder="dpo@example.com" />
                            <p class="description">E-post till dataskyddsombud (om ni har en)</p>
                        </td>
                    </tr>
                </table>
                
                <p class="submit">
                    <button type="submit" id="save-company-info" class="button button-primary">
                        Spara företagsinformation
                    </button>
                    <span class="required-note">* = Obligatoriska fält</span>
                </p>
            </form>
        </div>
        
        <!-- Registration Status Card -->
        <div class="card">
            <h2>Registreringsstatus</h2>
            <table class="form-table">
                <tr>
                    <th scope="row">Status</th>
                    <td>
                        <?php if ($is_registered): ?>
                            <span class="status-badge status-success">✓ Registrerad</span>
                        <?php elseif ($registration_status === 'error'): ?>
                            <span class="status-badge status-error">✗ Fel</span>
                        <?php else: ?>
                            <span class="status-badge status-pending">⏳ Väntar</span>
                        <?php endif; ?>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">Företagsinformation</th>
                    <td>
                        <?php if ($is_company_complete): ?>
                            <span class="status-badge status-success">✓ Komplett</span>
                        <?php else: ?>
                            <span class="status-badge status-error">✗ Ofullständig</span>
                        <?php endif; ?>
                    </td>
                </tr>
                
                <?php if ($is_registered): ?>
                <tr>
                    <th scope="row">Sajt-ID</th>
                    <td><code><?php echo esc_html($site_id); ?></code></td>
                </tr>
                <tr>
                    <th scope="row">Domän</th>
                    <td><?php echo esc_html(parse_url(get_site_url(), PHP_URL_HOST)); ?></td>
                </tr>
                <tr>
                    <th scope="row">Widget-status</th>
                    <td>
                        <?php if (!empty($widget_url)): ?>
                            <span class="status-badge status-success">✓ Aktiv</span>
                        <?php else: ?>
                            <span class="status-badge status-error">✗ Ej konfigurerad</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endif; ?>
                
                <?php if (!empty($last_error)): ?>
                <tr>
                    <th scope="row">Senaste fel</th>
                    <td>
                        <div class="error-message"><?php echo esc_html($last_error); ?></div>
                        <button type="button" id="clear-error" class="button button-small" style="margin-top: 5px;">
                            Rensa felmeddelande
                        </button>
                    </td>
                </tr>
                <?php endif; ?>
            </table>
            
            <p class="submit">
                <button type="button" id="test-connection" class="button">Testa anslutning</button>
                <button type="button" id="register-site" class="button button-primary">
                    <?php echo $is_registered ? 'Omregistrera sajt' : 'Registrera sajt'; ?>
                </button>
            </p>
        </div>
        
        <!-- Site Information -->
        <div class="card">
            <h2>Sajtinformation</h2>
            <table class="form-table">
                <tr>
                    <th scope="row">Sajtnamn</th>
                    <td><?php echo esc_html(get_bloginfo('name')); ?></td>
                </tr>
                <tr>
                    <th scope="row">Sajt-URL</th>
                    <td><?php echo esc_html(get_site_url()); ?></td>
                </tr>
                <tr>
                    <th scope="row">WordPress-version</th>
                    <td><?php echo esc_html(get_bloginfo('version')); ?></td>
                </tr>
                <tr>
                    <th scope="row">Plugin-version</th>
                    <td><?php echo esc_html(VISION_PRIVACY_VERSION); ?></td>
                </tr>
                <tr>
                    <th scope="row">Admin-e-post</th>
                    <td><?php echo esc_html(get_option('admin_email')); ?></td>
                </tr>
            </table>
        </div>
        
        <!-- Detected Forms -->
        <div class="card">
            <h2>Upptäckta formulär</h2>
            <?php $detected_forms = $plugin_instance->detect_forms(); ?>
            
            <?php if (!empty($detected_forms)): ?>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th>Formulär-plugin</th>
                            <th>Typ</th>
                            <th>Antal</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($detected_forms as $form): ?>
                        <tr>
                            <td><?php echo esc_html($form['plugin']); ?></td>
                            <td><?php echo esc_html($form['type']); ?></td>
                            <td><?php echo esc_html($form['count']); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else: ?>
                <p>Inga formulär-plugins upptäckta.</p>
                <p><em>Stöds: Contact Form 7, Gravity Forms, WPForms, Ninja Forms</em></p>
            <?php endif; ?>
        </div>
        
        <!-- Analytics & Tracking -->
        <div class="card">
            <h2>Analytics & spårning</h2>
            <?php
            $analytics_data = $plugin_instance->get_site_analytics_data();
            $woocommerce_data = $plugin_instance->get_woocommerce_data();
            ?>
            
            <?php if (!empty($analytics_data)): ?>
                <h4>Upptäckta spårningstjänster</h4>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th>Tjänsttyp</th>
                            <th>Upptäcktsmetod</th>
                            <th>Detaljer</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($analytics_data as $service): ?>
                        <tr>
                            <td><?php echo esc_html(ucwords(str_replace('-', ' ', $service['type']))); ?></td>
                            <td><?php echo esc_html($service['method'] ?? 'Auto-upptäckt'); ?></td>
                            <td><?php echo esc_html($service['plugin'] ?? 'N/A'); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else: ?>
                <p>Inga spårningstjänster upptäckta.</p>
            <?php endif; ?>
            
            <?php if ($woocommerce_data): ?>
                <h4>WooCommerce-integration</h4>
                <table class="form-table">
                    <tr>
                        <th>WooCommerce-version</th>
                        <td><?php echo esc_html($woocommerce_data['version']); ?></td>
                    </tr>
                    <tr>
                        <th>Produkter</th>
                        <td><?php echo esc_html($woocommerce_data['product_count']); ?></td>
                    </tr>
                    <tr>
                        <th>Beställningar</th>
                        <td><?php echo esc_html($woocommerce_data['order_count']); ?></td>
                    </tr>
                    <tr>
                        <th>Valuta</th>
                        <td><?php echo esc_html($woocommerce_data['currency']); ?></td>
                    </tr>
                    <tr>
                        <th>Betalningsmetoder</th>
                        <td>
                            <?php if (!empty($woocommerce_data['payment_gateways'])): ?>
                                <ul>
                                    <?php foreach ($woocommerce_data['payment_gateways'] as $gateway): ?>
                                        <li><?php echo esc_html($gateway['title']); ?></li>
                                    <?php endforeach; ?>
                                </ul>
                            <?php else: ?>
                                Inga konfigurerade
                            <?php endif; ?>
                        </td>
                    </tr>
                </table>
            <?php endif; ?>
        </div>
        
        <!-- Widget Integration -->
        <div class="card">
            <h2>Widget-integration</h2>
            <table class="form-table">
                <tr>
                    <th>Automatisk injektion</th>
                    <td>
                        <?php if (get_option('vision_privacy_manual_mode')): ?>
                            <span class="status-badge status-pending">Inaktiverad (Manuellt läge)</span>
                        <?php else: ?>
                            <span class="status-badge status-success">Aktiverad</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <tr>
                    <th>Manuell integration</th>
                    <td>
                        <p>Använd shortcode: <code>[vision_privacy_widget]</code></p>
                        <p>Eller PHP-funktion: <code>&lt;?php VisionPrivacyPlugin::render_widget(); ?&gt;</code></p>
                    </td>
                </tr>
                <tr>
                    <th>Utvecklingsläge</th>
                    <td>
                        <?php if (get_option('vision_privacy_dev_mode')): ?>
                            <span class="status-badge status-pending">Aktivt (Widget inaktiverad)</span>
                        <?php else: ?>
                            <span class="status-badge status-success">Produktion</span>
                        <?php endif; ?>
                    </td>
                </tr>
            </table>
        </div>
        
        <!-- Advanced Settings -->
        <div class="card">
            <h2>Avancerade inställningar</h2>
            <form method="post" action="options.php">
                <?php settings_fields('vision_privacy_settings'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="vision_privacy_api_endpoint">API-endpoint</label>
                        </th>
                        <td>
                            <input type="url" 
                                   id="vision_privacy_api_endpoint" 
                                   name="vision_privacy_api_endpoint" 
                                   value="<?php echo esc_attr($api_endpoint); ?>" 
                                   class="regular-text" />
                            <p class="description">
                                Standard: <?php echo esc_html(VISION_PRIVACY_API_ENDPOINT); ?>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="vision_privacy_manual_mode">Manuellt läge</label>
                        </th>
                        <td>
                            <label>
                                <input type="checkbox" 
                                       id="vision_privacy_manual_mode" 
                                       name="vision_privacy_manual_mode" 
                                       value="1" 
                                       <?php checked(get_option('vision_privacy_manual_mode')); ?> />
                                Inaktivera automatisk widget-injektion
                            </label>
                            <p class="description">
                                Kryssa i detta om du vill kontrollera manuellt var widgeten visas.
                            </p>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button('Spara inställningar'); ?>
            </form>
        </div>
        
        <!-- Debug Information -->
        <div class="card">
            <h2>Felsökningsinformation</h2>
            <details>
                <summary>Klicka för att visa felsökningsdata</summary>
                <textarea readonly style="width: 100%; height: 200px; font-family: monospace; font-size: 12px;">
<?php
echo "=== Vision Privacy Felsökningsinfo ===\n";
echo "Plugin-version: " . VISION_PRIVACY_VERSION . "\n";
echo "WordPress-version: " . get_bloginfo('version') . "\n";
echo "PHP-version: " . PHP_VERSION . "\n";
echo "Sajt-URL: " . get_site_url() . "\n";
echo "Admin-e-post: " . get_option('admin_email') . "\n";
echo "\n=== Registreringsdata ===\n";
echo "Sajt-ID: " . ($site_id ?: 'Ej satt') . "\n";
echo "API-token: " . ($api_token ? '[SATT]' : 'Ej satt') . "\n";
echo "Widget-URL: " . ($widget_url ?: 'Ej satt') . "\n";
echo "Registreringsstatus: " . $registration_status . "\n";
echo "Senaste fel: " . ($last_error ?: 'Inget') . "\n";
echo "\n=== Företagsinformation ===\n";
echo "Företagsnamn: " . ($company_info['company_name'] ?: 'Ej satt') . "\n";
echo "Kontakt-e-post: " . ($company_info['contact_email'] ?: 'Ej satt') . "\n";
echo "Land: " . ($company_info['country'] ?: 'Ej satt') . "\n";
echo "Komplett info: " . ($is_company_complete ? 'Ja' : 'Nej') . "\n";
echo "\n=== Aktiva plugins ===\n";
$active_plugins = get_option('active_plugins', array());
foreach ($active_plugins as $plugin) {
    echo "- " . $plugin . "\n";
}
echo "\n=== Upptäckta formulär ===\n";
foreach ($detected_forms as $form) {
    echo "- " . $form['plugin'] . " (" . $form['type'] . "): " . $form['count'] . " formulär\n";
}
?>
                </textarea>
            </details>
        </div>
        
    </div>
</div>

<style>
.vision-privacy-admin .card {
    background: #fff;
    border: 1px solid #ccd0d4;
    border-radius: 4px;
    margin: 20px 0;
    padding: 20px;
    box-shadow: 0 1px 1px rgba(0,0,0,.04);
}

.vision-privacy-admin .status-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
}

.vision-privacy-admin .status-success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.vision-privacy-admin .status-error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.vision-privacy-admin .status-pending {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
}

.vision-privacy-admin .error-message {
    color: #d63384;
    font-family: monospace;
    font-size: 13px;
}

.vision-privacy-admin details {
    margin-top: 10px;
}

.vision-privacy-admin summary {
    cursor: pointer;
    padding: 5px 0;
    font-weight: 600;
}

.vision-privacy-admin .required {
    color: #d63384;
    font-weight: bold;
}

.vision-privacy-admin .required-note {
    font-style: italic;
    color: #666;
    margin-left: 10px;
}

.vision-privacy-admin #company-info-form .form-table th {
    width: 200px;
}

.vision-privacy-admin #company-info-form textarea {
    width: 100%;
    max-width: 400px;
}

#vision-privacy-messages {
    margin: 10px 0;
}

.vision-privacy-message {
    padding: 10px;
    border-radius: 4px;
    margin: 5px 0;
}

.vision-privacy-message.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.vision-privacy-message.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.vision-privacy-admin .loading {
    opacity: 0.6;
    pointer-events: none;
}
</style>

<script>
jQuery(document).ready(function($) {
    
    // Company information form
    $('#company-info-form').on('submit', function(e) {
        e.preventDefault();
        
        var form = $(this);
        var button = $('#save-company-info');
        var originalText = button.text();
        
        // Validate required fields
        var requiredFields = ['company_name', 'contact_email', 'country'];
        var hasErrors = false;
        
        requiredFields.forEach(function(field) {
            var input = $('#' + field);
            if (!input.val().trim()) {
                input.css('border-color', '#d63384');
                hasErrors = true;
            } else {
                input.css('border-color', '');
            }
        });
        
        if (hasErrors) {
            showMessage('Vänligen fyll i alla obligatoriska fält', 'error');
            return;
        }
        
        // Validate email format
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        var contactEmail = $('#contact_email').val();
        var dpoEmail = $('#dpo_email').val();
        
        if (contactEmail && !emailRegex.test(contactEmail)) {
            $('#contact_email').css('border-color', '#d63384');
            showMessage('Kontakt-e-post har ogiltigt format', 'error');
            return;
        }
        
        if (dpoEmail && !emailRegex.test(dpoEmail)) {
            $('#dpo_email').css('border-color', '#d63384');
            showMessage('Dataskyddsombuds e-post har ogiltigt format', 'error');
            return;
        }
        
        // Clear error styling
        form.find('input, select, textarea').css('border-color', '');
        
        // Disable form and show loading
        form.addClass('loading');
        button.prop('disabled', true).text('Sparar...');
        
        var formData = {
            action: 'vision_privacy_save_company',
            nonce: '<?php echo wp_create_nonce('vision_privacy_admin'); ?>',
            company_name: $('#company_name').val(),
            contact_email: $('#contact_email').val(),
            country: $('#country').val(),
            address: $('#address').val(),
            phone: $('#phone').val(),
            dpo_email: $('#dpo_email').val(),
            org_number: $('#org_number').val()
        };
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: formData,
            success: function(response) {
                showMessage(response.message, response.success ? 'success' : 'error');
                if (response.success) {
                    // Reload page after successful save to update status
                    setTimeout(function() {
                        location.reload();
                    }, 2000);
                }
            },
            error: function() {
                showMessage('Fel vid sparande av företagsinformation', 'error');
            },
            complete: function() {
                form.removeClass('loading');
                button.prop('disabled', false).text(originalText);
            }
        });
    });
    
    // Test connection button
    $('#test-connection').on('click', function() {
        var button = $(this);
        button.prop('disabled', true).text('Testar...');
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'vision_privacy_test_connection',
                nonce: '<?php echo wp_create_nonce('vision_privacy_admin'); ?>'
            },
            success: function(response) {
                showMessage(response.message, response.success ? 'success' : 'error');
            },
            error: function() {
                showMessage('Anslutningstest misslyckades', 'error');
            },
            complete: function() {
                button.prop('disabled', false).text('Testa anslutning');
            }
        });
    });
    
    // Register site button
    $('#register-site').on('click', function() {
        var button = $(this);
        var originalText = button.text();
        button.prop('disabled', true).text('Registrerar...');
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'vision_privacy_register',
                nonce: '<?php echo wp_create_nonce('vision_privacy_admin'); ?>'
            },
            success: function(response) {
                showMessage(response.message, response.success ? 'success' : 'error');
                if (response.success) {
                    // Reload page after successful registration
                    setTimeout(function() {
                        location.reload();
                    }, 2000);
                }
            },
            error: function() {
                showMessage('Registrering misslyckades', 'error');
            },
            complete: function() {
                button.prop('disabled', false).text(originalText);
            }
        });
    });
    
    // Clear error button
    $('#clear-error').on('click', function() {
        var button = $(this);
        var originalText = button.text();
        button.prop('disabled', true).text('Rensar...');
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'vision_privacy_clear_error',
                nonce: '<?php echo wp_create_nonce('vision_privacy_admin'); ?>'
            },
            success: function(response) {
                showMessage(response.message, response.success ? 'success' : 'error');
                if (response.success) {
                    // Reload page after clearing error
                    setTimeout(function() {
                        location.reload();
                    }, 1000);
                }
            },
            error: function() {
                showMessage('Kunde inte rensa felmeddelande', 'error');
            },
            complete: function() {
                button.prop('disabled', false).text(originalText);
            }
        });
    });
    
    function showMessage(message, type) {
        var messageDiv = $('<div class="vision-privacy-message ' + type + '">' + message + '</div>');
        
        // Remove existing messages
        $('.vision-privacy-message').remove();
        
        // Add new message
        var container = $('#vision-privacy-messages');
        if (container.length === 0) {
            container = $('<div id="vision-privacy-messages"></div>');
            $('.vision-privacy-admin').prepend(container);
        }
        
        container.append(messageDiv);
        
        // Auto-remove success messages
        if (type === 'success') {
            setTimeout(function() {
                messageDiv.fadeOut(function() {
                    messageDiv.remove();
                });
            }, 5000);
        }
        
        // Scroll to message
        $('html, body').animate({
            scrollTop: container.offset().top - 50
        }, 500);
    }
});
</script>
<?php