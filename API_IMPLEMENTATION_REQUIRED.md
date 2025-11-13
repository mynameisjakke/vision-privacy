# API Implementation Required for Plugin v1.0.5

## Overview

The WordPress plugin v1.0.5 requires two API changes to support the smart registration system:

1. **New verification endpoint** to check if a site_id is still valid
2. **Updated registration endpoint** to handle updates instead of always creating new sites

---

## 1. New Verification Endpoint

### Endpoint Details

```
GET /api/sites/verify/{site_id}
```

### Headers

```
Authorization: Bearer {api_token}
Content-Type: application/json
User-Agent: VisionPrivacy-WP/{version}
```

### Parameters

- `site_id` (path parameter): The site ID to verify (e.g., "site_abc123")

### Authentication

- Requires valid API token in Authorization header
- Token must belong to the site being verified

### Response Codes

| Code | Meaning | When to Return |
|------|---------|----------------|
| 200 | OK | Site exists and token is valid |
| 401 | Unauthorized | Invalid or missing token |
| 404 | Not Found | Site doesn't exist or was deleted |
| 500 | Server Error | Database or server error |

### Success Response (200)

```json
{
  "success": true,
  "site_id": "site_abc123",
  "widget_url": "https://vision-privacy.vercel.app/widget/site_abc123.js",
  "status": "active",
  "domain": "https://example.com",
  "last_updated": "2025-11-13T10:30:00Z"
}
```

### Not Found Response (404)

```json
{
  "success": false,
  "message": "Site not found",
  "error": "SITE_NOT_FOUND"
}
```

### Unauthorized Response (401)

```json
{
  "success": false,
  "message": "Invalid or expired token",
  "error": "UNAUTHORIZED"
}
```

### Implementation Example (Node.js/Express)

```javascript
// GET /api/sites/verify/:siteId
app.get('/api/sites/verify/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const authHeader = req.headers.authorization;
    
    // Extract token from "Bearer {token}"
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Missing authorization token',
        error: 'UNAUTHORIZED'
      });
    }
    
    // Query database for site
    const site = await db.sites.findOne({
      where: { id: siteId }
    });
    
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found',
        error: 'SITE_NOT_FOUND'
      });
    }
    
    // Verify token matches site
    if (site.api_token !== token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token for this site',
        error: 'UNAUTHORIZED'
      });
    }
    
    // Return success with site data
    return res.status(200).json({
      success: true,
      site_id: site.id,
      widget_url: site.widget_url,
      status: site.status || 'active',
      domain: site.domain,
      last_updated: site.updated_at
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR'
    });
  }
});
```

### Database Query

```sql
-- Check if site exists and token is valid
SELECT 
  id,
  domain,
  widget_url,
  status,
  updated_at
FROM sites
WHERE id = $1 
  AND api_token = $2
  AND deleted_at IS NULL;
```

---

## 2. Updated Registration Endpoint

### Endpoint Details

```
POST /api/sites/register
```

### Headers

```
Authorization: Bearer {api_token} (optional - for updates)
Content-Type: application/json
User-Agent: VisionPrivacy-WP/{version}
```

### Request Body

**New Registration** (no site_id):
```json
{
  "domain": "https://example.com",
  "wp_version": "6.4",
  "plugin_version": "1.0.5",
  "site_name": "Example Site",
  "admin_email": "admin@example.com",
  ...
}
```

**Update Existing** (with site_id):
```json
{
  "site_id": "site_abc123",
  "domain": "https://example.com",
  "wp_version": "6.4",
  "plugin_version": "1.0.5",
  "site_name": "Example Site",
  "admin_email": "admin@example.com",
  ...
}
```

### Logic Flow

```
1. Check if site_id is provided in request body
   ├─ YES: This is an UPDATE request
   │   ├─ Verify site exists
   │   ├─ Verify token matches (if provided)
   │   ├─ Update site data
   │   └─ Return existing site_id
   └─ NO: This is a CREATE request
       ├─ Check if domain already registered
       │   ├─ YES: Return existing site (prevent duplicate)
       │   └─ NO: Create new site
       └─ Return new site_id
```

### Response Codes

| Code | Meaning | When to Return |
|------|---------|----------------|
| 200 | OK | Site updated successfully |
| 201 | Created | New site created |
| 400 | Bad Request | Invalid data or validation error |
| 401 | Unauthorized | Invalid token for update |
| 409 | Conflict | Domain already registered (different site_id) |
| 500 | Server Error | Database or server error |

### Success Response (200 - Update)

```json
{
  "success": true,
  "site_id": "site_abc123",
  "api_token": "token_xyz789",
  "widget_url": "https://vision-privacy.vercel.app/widget/site_abc123.js",
  "message": "Site updated successfully",
  "updated": true
}
```

### Success Response (201 - Create)

```json
{
  "success": true,
  "site_id": "site_abc123",
  "api_token": "token_xyz789",
  "widget_url": "https://vision-privacy.vercel.app/widget/site_abc123.js",
  "message": "Site registered successfully",
  "created": true
}
```

### Implementation Example (Node.js/Express)

```javascript
// POST /api/sites/register
app.post('/api/sites/register', async (req, res) => {
  try {
    const { site_id, domain, ...siteData } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    // Validate required fields
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: 'Domain is required'
      });
    }
    
    // UPDATE MODE: site_id provided
    if (site_id) {
      // Find existing site
      const existingSite = await db.sites.findOne({
        where: { id: site_id }
      });
      
      if (!existingSite) {
        // Site not found, create new one instead
        console.log(`Site ${site_id} not found, creating new registration`);
        // Fall through to create logic below
      } else {
        // Verify token if provided
        if (token && existingSite.api_token !== token) {
          return res.status(401).json({
            success: false,
            message: 'Invalid token for this site'
          });
        }
        
        // Update existing site
        await db.sites.update({
          domain,
          ...siteData,
          updated_at: new Date()
        }, {
          where: { id: site_id }
        });
        
        return res.status(200).json({
          success: true,
          site_id: existingSite.id,
          api_token: existingSite.api_token,
          widget_url: existingSite.widget_url,
          message: 'Site updated successfully',
          updated: true
        });
      }
    }
    
    // CREATE MODE: no site_id or site not found
    
    // Check if domain already registered
    const existingByDomain = await db.sites.findOne({
      where: { domain }
    });
    
    if (existingByDomain) {
      // Domain already registered, return existing site
      return res.status(200).json({
        success: true,
        site_id: existingByDomain.id,
        api_token: existingByDomain.api_token,
        widget_url: existingByDomain.widget_url,
        message: 'Site already registered',
        existing: true
      });
    }
    
    // Create new site
    const newSiteId = generateSiteId(); // e.g., "site_" + nanoid()
    const newToken = generateToken(); // e.g., "token_" + nanoid()
    const widgetUrl = `${process.env.APP_URL}/widget/${newSiteId}.js`;
    
    const newSite = await db.sites.create({
      id: newSiteId,
      domain,
      api_token: newToken,
      widget_url: widgetUrl,
      ...siteData,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    return res.status(201).json({
      success: true,
      site_id: newSite.id,
      api_token: newSite.api_token,
      widget_url: newSite.widget_url,
      message: 'Site registered successfully',
      created: true
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
```

### Database Queries

**Check for existing site by ID**:
```sql
SELECT * FROM sites 
WHERE id = $1 
  AND deleted_at IS NULL;
```

**Check for existing site by domain**:
```sql
SELECT * FROM sites 
WHERE domain = $1 
  AND deleted_at IS NULL;
```

**Update existing site**:
```sql
UPDATE sites 
SET 
  domain = $1,
  wp_version = $2,
  plugin_version = $3,
  site_name = $4,
  updated_at = NOW()
WHERE id = $5;
```

**Create new site**:
```sql
INSERT INTO sites (
  id,
  domain,
  api_token,
  widget_url,
  wp_version,
  plugin_version,
  site_name,
  created_at,
  updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
RETURNING *;
```

---

## 3. Testing the Implementation

### Test Verification Endpoint

```bash
# Test with valid site_id and token
curl -X GET \
  https://vision-privacy.vercel.app/api/sites/verify/site_abc123 \
  -H 'Authorization: Bearer token_xyz789' \
  -H 'Content-Type: application/json'

# Expected: 200 OK with site data

# Test with invalid site_id
curl -X GET \
  https://vision-privacy.vercel.app/api/sites/verify/site_invalid \
  -H 'Authorization: Bearer token_xyz789' \
  -H 'Content-Type: application/json'

# Expected: 404 Not Found

# Test with invalid token
curl -X GET \
  https://vision-privacy.vercel.app/api/sites/verify/site_abc123 \
  -H 'Authorization: Bearer invalid_token' \
  -H 'Content-Type: application/json'

# Expected: 401 Unauthorized
```

### Test Registration Endpoint (Update Mode)

```bash
# Test update with existing site_id
curl -X POST \
  https://vision-privacy.vercel.app/api/sites/register \
  -H 'Authorization: Bearer token_xyz789' \
  -H 'Content-Type: application/json' \
  -d '{
    "site_id": "site_abc123",
    "domain": "https://example.com",
    "wp_version": "6.4",
    "plugin_version": "1.0.5",
    "site_name": "Updated Site Name"
  }'

# Expected: 200 OK with same site_id

# Test update with non-existent site_id
curl -X POST \
  https://vision-privacy.vercel.app/api/sites/register \
  -H 'Content-Type: application/json' \
  -d '{
    "site_id": "site_nonexistent",
    "domain": "https://newsite.com",
    "wp_version": "6.4",
    "plugin_version": "1.0.5"
  }'

# Expected: 201 Created with new site_id (fallback to create)
```

### Test Registration Endpoint (Create Mode)

```bash
# Test new registration
curl -X POST \
  https://vision-privacy.vercel.app/api/sites/register \
  -H 'Content-Type: application/json' \
  -d '{
    "domain": "https://brandnewsite.com",
    "wp_version": "6.4",
    "plugin_version": "1.0.5",
    "site_name": "Brand New Site"
  }'

# Expected: 201 Created with new site_id

# Test duplicate domain
curl -X POST \
  https://vision-privacy.vercel.app/api/sites/register \
  -H 'Content-Type: application/json' \
  -d '{
    "domain": "https://brandnewsite.com",
    "wp_version": "6.4",
    "plugin_version": "1.0.5"
  }'

# Expected: 200 OK with existing site_id (no duplicate created)
```

---

## 4. Database Schema Requirements

### Sites Table

Ensure your sites table has these columns:

```sql
CREATE TABLE sites (
  id VARCHAR(255) PRIMARY KEY,
  domain VARCHAR(500) NOT NULL,
  api_token VARCHAR(500) NOT NULL,
  widget_url VARCHAR(500) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  wp_version VARCHAR(50),
  plugin_version VARCHAR(50),
  site_name VARCHAR(500),
  admin_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  
  -- Add index for faster lookups
  INDEX idx_domain (domain),
  INDEX idx_api_token (api_token),
  INDEX idx_deleted_at (deleted_at)
);
```

---

## 5. Security Considerations

### Token Validation
- Always verify token matches the site being accessed
- Use constant-time comparison to prevent timing attacks
- Implement rate limiting on verification endpoint

### Input Validation
- Sanitize all input data
- Validate domain format (must be valid URL)
- Limit request body size
- Validate site_id format

### Error Messages
- Don't reveal whether site exists in 401 responses
- Use generic error messages for security
- Log detailed errors server-side only

---

## 6. Monitoring and Logging

### Metrics to Track

1. **Verification Endpoint**:
   - Request count
   - Success rate (200 responses)
   - Not found rate (404 responses)
   - Unauthorized rate (401 responses)
   - Response time

2. **Registration Endpoint**:
   - Create count (201 responses)
   - Update count (200 responses)
   - Duplicate prevention count
   - Error rate
   - Response time

### Logging

Log these events:
- Successful verifications
- Failed verifications (with reason)
- Site updates
- New site creations
- Duplicate prevention triggers
- Authentication failures

---

## 7. Backward Compatibility

### Old Plugin Versions

The API changes are backward compatible:

- Old plugins (< 1.0.5) will still work
- They won't send site_id in registration
- They won't call verification endpoint
- They'll create new registrations (old behavior)

### Migration Strategy

1. Deploy API changes first
2. Test with old plugin version
3. Test with new plugin version
4. Roll out new plugin gradually

---

## Summary

### Required Changes

1. ✅ Implement `GET /api/sites/verify/{site_id}` endpoint
2. ✅ Update `POST /api/sites/register` to handle site_id
3. ✅ Add domain duplicate checking
4. ✅ Return appropriate status codes
5. ✅ Add proper error handling
6. ✅ Implement logging and monitoring

### Testing Checklist

- [ ] Verification returns 200 for valid site
- [ ] Verification returns 404 for invalid site
- [ ] Verification returns 401 for invalid token
- [ ] Registration creates new site without site_id
- [ ] Registration updates existing site with site_id
- [ ] Registration prevents duplicate domains
- [ ] Old plugin versions still work
- [ ] New plugin versions work correctly
- [ ] Performance is acceptable
- [ ] Logging is working

---

**Ready for Implementation**: Yes  
**Estimated Time**: 2-4 hours  
**Priority**: High (required for plugin v1.0.5)
