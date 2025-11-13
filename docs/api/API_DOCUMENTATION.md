# Vision Privacy - Policy System API Documentation

## Overview

The Policy System API provides endpoints for fetching and rendering dynamic legal policy documents (Cookie Policy and Privacy Policy) with site-specific data replacement. The system supports both production environments with real site data and demo environments with mock data.

## Base URL

- **Production**: `https://your-domain.com/api`
- **Demo**: `https://your-domain.com/api/demo-policy`

## Authentication

Policy endpoints are publicly accessible and do not require authentication. Site identification is handled via the `site_id` parameter.

---

## Endpoints

### 1. Get Policy for Site

Fetch and render a specific policy document for a registered site.

**Endpoint**: `GET /api/policy/[site_id]/[policy_type]`

**Parameters**:
- `site_id` (path, required): UUID or unique identifier of the registered site
- `policy_type` (path, required): Type of policy to fetch
  - `cookie` - Cookie Policy (Cookiepolicy)
  - `privacy` - Privacy Policy (Integritetspolicy)

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "title": "Cookiepolicy",
    "content": "<div class=\"policy-content\">...</div>",
    "lastUpdated": "2024-01-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

**Response Fields**:
- `title` (string): Localized policy title
- `content` (string): Fully rendered HTML content with all variables replaced
- `lastUpdated` (string): ISO 8601 timestamp of template's last update
- `version` (string): Semantic version of the policy template

**Error Responses**:

```json
// 404 - Site Not Found
{
  "success": false,
  "error": "Site not found",
  "code": 1008
}

// 404 - Template Not Found
{
  "success": false,
  "error": "Policy template not found",
  "code": 1009
}

// 500 - Rendering Error
{
  "success": false,
  "error": "Failed to render policy",
  "code": 1010
}
```

**Caching**:
- Cache-Control: `public, max-age=300` (5 minutes)
- Responses are cached server-side with site_id + policy_type as cache key
- Cache is invalidated on template updates or site data changes

**Example Request**:
```bash
curl https://your-domain.com/api/policy/550e8400-e29b-41d4-a716-446655440000/cookie
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "title": "Cookiepolicy",
    "content": "<div class=\"policy-content\"><h1>Cookiepolicy för example.com</h1><p>Senast uppdaterad: 15-01-2024</p>...</div>",
    "lastUpdated": "2024-01-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

---

### 2. Get Demo Policy

Fetch a policy document with mock data for testing and demonstration purposes.

**Endpoint**: `GET /api/demo-policy/[policy_type]`

**Parameters**:
- `policy_type` (path, required): Type of policy to fetch
  - `cookie` - Cookie Policy
  - `privacy` - Privacy Policy

**Response**: Same format as production endpoint

**Mock Data Used**:
- Domain: `demo.visionprivacy.com`
- Company: `Demo AB`
- Org Number: `556123-4567`
- Address: `Demovägen 1, 123 45 Stockholm`
- Email: `info@demo.visionprivacy.com`
- Sample cookies in all categories

**Example Request**:
```bash
curl https://your-domain.com/api/demo-policy/cookie
```

---

## Template Variables

Policy templates use placeholder variables in the format `{{VARIABLE_NAME}}` that are replaced with actual data during rendering.

### Available Variables

| Variable | Description | Example Value | Fallback |
|----------|-------------|---------------|----------|
| `{{DOMAIN_NAME}}` | Site's domain name | `example.com` | - |
| `{{COMPANY_NAME}}` | Registered company name | `Example AB` | Empty string |
| `{{COMPANY_NAME_OR_DOMAIN}}` | Company name or domain if company name is empty | `Example AB` or `example.com` | Domain name |
| `{{ORG_NUMBER}}` | Swedish organization number | `556123-4567` | Empty string |
| `{{COMPANY_ADDRESS}}` | Full company address | `Storgatan 1, 111 22 Stockholm` | Empty string |
| `{{CONTACT_EMAIL}}` | Contact email address | `info@example.com` | Empty string |
| `{{LAST_UPDATED_DATE}}` | Template last update date | `15-01-2024` | Current date |
| `{{ESSENTIAL_COOKIES_LIST}}` | HTML list of essential cookies | `<ul><li>session_id</li></ul>` | Empty string |
| `{{FUNCTIONAL_COOKIES_LIST}}` | HTML list of functional cookies | `<ul><li>language_pref</li></ul>` | Empty string |
| `{{ANALYTICS_COOKIES_LIST}}` | HTML list of analytics cookies | `<ul><li>_ga</li></ul>` | Empty string |
| `{{ADVERTISING_COOKIES_LIST}}` | HTML list of advertising cookies | `<ul><li>_fbp</li></ul>` | Empty string |
| `{{COOKIE_DETAILS_TABLE}}` | HTML table with cookie details | `<table>...</table>` | Empty string |
| `{{FORM_PLUGIN_NAME}}` | Detected form plugin name | `Contact Form 7` | Empty string |
| `{{ECOM_PLUGIN_NAME}}` | Detected e-commerce plugin name | `WooCommerce` | Empty string |

### Date Format

All dates are formatted as `DD-MM-YYYY` (Swedish format):
- Input: `2024-01-15T10:30:00Z`
- Output: `15-01-2024`

### Cookie List Format

Cookie lists are generated as HTML unordered lists:

```html
<ul>
  <li>cookie_name_1</li>
  <li>cookie_name_2</li>
  <li>cookie_name_3</li>
</ul>
```

If no cookies exist for a category, an empty string is returned.

### Cookie Details Table Format

The cookie details table includes name, category, and duration:

```html
<table class="cookie-table">
  <thead>
    <tr>
      <th>Cookie-namn</th>
      <th>Kategori</th>
      <th>Lagringstid</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>session_id</td>
      <td>Nödvändiga</td>
      <td>Session</td>
    </tr>
    <tr>
      <td>_ga</td>
      <td>Analys</td>
      <td>2 år</td>
    </tr>
  </tbody>
</table>
```

---

## Caching Behavior

### Server-Side Caching

The Policy System implements multi-layer caching for optimal performance:

#### 1. Template Caching
- **Duration**: 30 minutes
- **Key**: `policy:template:{template_type}`
- **Invalidation**: On template updates via admin interface
- **Purpose**: Avoid repeated database queries for active templates

#### 2. Rendered Policy Caching
- **Duration**: 5 minutes
- **Key**: `policy:rendered:{site_id}:{policy_type}`
- **Invalidation**: On site data updates or new cookie scans
- **Purpose**: Serve pre-rendered HTML for repeated requests

#### 3. Site Data Caching
- **Duration**: 10 minutes
- **Key**: `site:data:{site_id}`
- **Invalidation**: On site information updates
- **Purpose**: Reuse site data across multiple policy renders

### Client-Side Caching

HTTP cache headers are set on successful responses:

```
Cache-Control: public, max-age=300
```

This allows browsers and CDNs to cache responses for 5 minutes, reducing server load and improving response times.

### Cache Invalidation

Caches are automatically invalidated when:
- Policy templates are updated or published
- Site information is modified
- New cookies are detected during scans
- Manual cache clear is triggered via admin interface

---

## Rate Limiting

Policy endpoints are subject to rate limiting to prevent abuse:

- **Limit**: 100 requests per minute per IP address
- **Response**: `429 Too Many Requests` when limit exceeded
- **Headers**: 
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Error Codes

| Code | Error | Description |
|------|-------|-------------|
| 1008 | Site not found | The provided site_id does not exist in the database |
| 1009 | Policy template not found | No active template exists for the requested policy type |
| 1010 | Failed to render policy | Server error occurred during template rendering |

---

## Integration Examples

### JavaScript (Fetch API)

```javascript
async function fetchPolicy(siteId, policyType) {
  try {
    const response = await fetch(
      `/api/policy/${siteId}/${policyType}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      return data.data.content;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Failed to fetch policy:', error);
    return null;
  }
}

// Usage
const cookiePolicy = await fetchPolicy(
  '550e8400-e29b-41d4-a716-446655440000',
  'cookie'
);
```

### React Component

```jsx
import { useState, useEffect } from 'react';

function PolicyModal({ siteId, policyType, isOpen, onClose }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchPolicy();
    }
  }, [isOpen, policyType]);

  async function fetchPolicy() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/policy/${siteId}/${policyType}`
      );
      const data = await response.json();

      if (data.success) {
        setContent(data.data.content);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to load policy');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal">
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {content && (
        <div dangerouslySetInnerHTML={{ __html: content }} />
      )}
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

### WordPress Plugin

```php
<?php
function vp_fetch_policy($site_id, $policy_type) {
    $url = "https://your-domain.com/api/policy/{$site_id}/{$policy_type}";
    
    $response = wp_remote_get($url, array(
        'timeout' => 10,
        'headers' => array(
            'Accept' => 'application/json'
        )
    ));
    
    if (is_wp_error($response)) {
        return null;
    }
    
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    if ($data['success']) {
        return $data['data']['content'];
    }
    
    return null;
}

// Usage
$cookie_policy = vp_fetch_policy(
    '550e8400-e29b-41d4-a716-446655440000',
    'cookie'
);

if ($cookie_policy) {
    echo wp_kses_post($cookie_policy);
}
?>
```

---

## Best Practices

### 1. Caching Strategy

- Cache policy content on the client side for the duration specified in Cache-Control headers
- Implement a local cache with 5-minute TTL to minimize API calls
- Invalidate cache when user updates cookie preferences

### 2. Error Handling

- Always check the `success` field in the response
- Provide user-friendly error messages for different error codes
- Implement retry logic with exponential backoff for network errors
- Show a fallback message if policy cannot be loaded

### 3. Performance

- Lazy load policies only when the modal is opened
- Don't preload policies on page load
- Use the demo endpoint for testing to avoid database load
- Implement request debouncing if users can trigger multiple policy loads

### 4. Security

- Sanitize HTML content before rendering (use DOMPurify or similar)
- Validate site_id format before making requests
- Don't expose sensitive site data in error messages
- Use HTTPS for all API requests

### 5. Accessibility

- Ensure rendered policy content maintains proper heading hierarchy
- Provide keyboard navigation for interactive elements
- Include ARIA labels for modal dialogs
- Support screen readers with semantic HTML

---

## Changelog

### Version 1.0.0 (2024-01-15)

- Initial release of Policy System API
- Support for Cookie Policy and Privacy Policy
- Template variable replacement system
- Multi-layer caching implementation
- Demo endpoint for testing
- Swedish language support

---

## Support

For API support or questions:
- Email: support@visionprivacy.com
- Documentation: https://docs.visionprivacy.com
- GitHub Issues: https://github.com/visionprivacy/issues

---

## License

This API is part of the Vision Privacy platform. Usage is subject to the terms of service.
