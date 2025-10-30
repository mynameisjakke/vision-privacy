-- Seed data for Vision Privacy
-- Initial cookie categories and default templates

-- Insert default cookie categories
INSERT INTO cookie_categories (name, description, is_essential, sort_order, is_active) VALUES
('essential', 'Necessary cookies for basic website functionality', true, 1, true),
('functional', 'Cookies that enhance website functionality and personalization', false, 2, true),
('analytics', 'Cookies used for website analytics and performance monitoring', false, 3, true),
('advertising', 'Cookies used for advertising and marketing purposes', false, 4, true),
('social', 'Cookies from social media platforms and sharing widgets', false, 5, true);

-- Insert default banner template
INSERT INTO policy_templates (template_type, content, version, is_active, created_by) VALUES
('banner', 
'<div class="vision-privacy-banner">
  <div class="banner-content">
    <h3>Cookie Consent</h3>
    <p>We use cookies to enhance your browsing experience and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.</p>
    <div class="banner-buttons">
      <button class="btn-accept-all" data-action="accept-all">Accept All</button>
      <button class="btn-reject-all" data-action="reject-all">Reject All</button>
      <button class="btn-customize" data-action="customize">Customize</button>
    </div>
  </div>
</div>', 
'1.0.0', 
true, 
'system');

-- Insert default policy template
INSERT INTO policy_templates (template_type, content, version, is_active, created_by) VALUES
('policy',
'# Privacy Policy

## Cookie Usage
This website uses cookies to improve your experience and provide personalized content.

## Cookie Categories
- **Essential Cookies**: Required for basic website functionality
- **Functional Cookies**: Enhance website features and personalization
- **Analytics Cookies**: Help us understand how visitors use our website
- **Advertising Cookies**: Used to deliver relevant advertisements
- **Social Media Cookies**: Enable social sharing and integration

## Your Rights
You can manage your cookie preferences at any time by clicking the cookie settings link.

## Contact Information
For questions about this policy, please contact us through our website.',
'1.0.0',
true,
'system');