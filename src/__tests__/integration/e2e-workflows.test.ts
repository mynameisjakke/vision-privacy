/**
 * End-to-End Integration Tests
 * Tests complete user workflows from WordPress plugin installation to consent collection
 */

import { NextRequest } from "next/server";
import { POST as registerSite } from "@/app/api/sites/register/route";
import { GET as getWidget } from "@/app/api/widget/[site_id]/route";
import {
  POST as saveConsent,
  GET as getConsent,
} from "@/app/api/consent/route";
import { POST as reportScan } from "@/app/api/scan/route";

// Mock external dependencies for integration tests
jest.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    })),
  },
  TABLES: {
    SITES: "sites",
    CONSENT_RECORDS: "consent_records",
    CLIENT_SCANS: "client_scans",
    COOKIE_CATEGORIES: "cookie_categories",
    POLICY_TEMPLATES: "policy_templates",
  },
}));

jest.mock("@/lib/auth-middleware", () => ({
  withAuthMiddleware: jest.fn().mockResolvedValue({
    success: true,
    context: { requestId: "test-request-id" },
  }),
  createAuthenticatedResponse: jest.fn((data, status) => ({
    json: () => Promise.resolve(data),
    status,
    headers: new Map(),
  })),
}));

jest.mock("@/lib/validation", () => ({
  validateRequest: jest.fn().mockReturnValue({
    success: true,
    data: {},
  }),
}));

jest.mock("@/utils/crypto", () => ({
  generateApiToken: jest.fn(
    () => "test-api-token-12345678901234567890123456789012"
  ),
  generateSiteId: jest.fn(() => "test-site-id-1234-5678-9012-123456789012"),
  isValidDomain: jest.fn(() => true),
  hashVisitorInfo: jest.fn(
    () => "hashed-visitor-info-1234567890abcdef1234567890abcdef12345678"
  ),
  hashUserAgent: jest.fn(
    () => "hashed-user-agent-1234567890abcdef1234567890abcdef12345678"
  ),
  generateConsentExpiration: jest.fn(
    () => new Date("2025-12-31T23:59:59.999Z")
  ),
}));

describe("End-to-End Integration Tests", () => {
  const mockSupabaseAdmin = require("@/lib/supabase").supabaseAdmin;
  const mockValidateRequest = require("@/lib/validation").validateRequest;

  // Test data
  const mockSiteData = {
    domain: "https://example.com",
    wp_version: "6.3.0",
    installed_plugins: [
      {
        name: "Contact Form 7",
        version: "5.8.0",
        file: "contact-form-7/wp-contact-form-7.php",
        active: true,
      },
    ],
    detected_forms: [
      {
        type: "contact-form-7",
        count: 2,
        plugin: "Contact Form 7",
      },
    ],
    plugin_version: "1.0.0",
  };

  const mockCookieCategories = [
    {
      id: "essential",
      name: "Essential",
      description: "Required for basic site functionality",
      is_essential: true,
      sort_order: 0,
    },
    {
      id: "analytics",
      name: "Analytics",
      description: "Help us understand how visitors use our site",
      is_essential: false,
      sort_order: 1,
    },
  ];

  const mockBannerTemplate = {
    id: "template-1",
    template_type: "banner",
    content: '<div class="vp-banner">Cookie banner for {{SITE_DOMAIN}}</div>',
    version: "1.0.0",
    is_active: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    mockValidateRequest.mockReturnValue({
      success: true,
      data: mockSiteData,
    });
  });

  describe("Complete WordPress Site Registration Workflow", () => {
    it("should complete full site registration and widget configuration flow", async () => {
      // Step 1: WordPress plugin registers site
      const registeredSite = {
        id: "test-site-id-1234-5678-9012-123456789012",
        ...mockSiteData,
        api_token: "test-api-token-12345678901234567890123456789012",
        status: "active",
      };

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: registeredSite,
        error: null,
      });

      const registerRequest = new NextRequest(
        "http://localhost:3000/api/sites/register",
        {
          method: "POST",
          body: JSON.stringify(mockSiteData),
        }
      );

      const registerResponse = await registerSite(registerRequest);
      const registerData = await registerResponse.json();

      expect(registerData.success).toBe(true);
      expect(registerData.site_id).toBe(
        "test-site-id-1234-5678-9012-123456789012"
      );
      expect(registerData.api_token).toBe(
        "test-api-token-12345678901234567890123456789012"
      );

      // Step 2: Widget requests configuration
      mockSupabaseAdmin
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({ data: registeredSite, error: null }) // Site lookup
        .mockResolvedValueOnce({ data: mockCookieCategories, error: null }) // Cookie categories
        .mockResolvedValueOnce({ data: mockBannerTemplate, error: null }); // Banner template

      mockValidateRequest.mockReturnValue({
        success: true,
        data: { site_id: registeredSite.id },
      });

      const widgetRequest = new NextRequest(
        `http://localhost:3000/api/widget/${registeredSite.id}`,
        {
          method: "GET",
        }
      );

      const widgetResponse = await getWidget(widgetRequest, {
        params: { site_id: registeredSite.id },
      });
      const widgetData = await widgetResponse.json();

      expect(widgetData.banner_html).toContain("example.com");
      expect(widgetData.cookie_categories).toHaveLength(2);
      expect(widgetData.privacy_policy_url).toContain(registeredSite.id);
      expect(widgetData.consent_endpoint).toContain("/api/consent");

      // Step 3: Visitor provides consent
      const consentData = {
        site_id: registeredSite.id,
        visitor_hash: "visitor-hash-123",
        consent_categories: ["essential", "analytics"],
        timestamp: "2024-01-01T12:00:00.000Z",
        user_agent: "Mozilla/5.0 (Test Browser)",
      };

      mockValidateRequest.mockReturnValue({
        success: true,
        data: consentData,
      });

      mockSupabaseAdmin
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({ data: registeredSite, error: null }) // Site lookup
        .mockResolvedValueOnce({ data: null, error: null }); // No existing consent

      const newConsentRecord = {
        id: "consent-id-123",
        ...consentData,
        visitor_hash:
          "hashed-visitor-info-1234567890abcdef1234567890abcdef12345678",
        expires_at: "2025-12-31T23:59:59.999Z",
      };

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: newConsentRecord,
        error: null,
      });

      const consentRequest = new NextRequest(
        "http://localhost:3000/api/consent",
        {
          method: "POST",
          headers: {
            "x-forwarded-for": "192.168.1.1",
            "user-agent": "Mozilla/5.0 (Test Browser)",
          },
          body: JSON.stringify(consentData),
        }
      );

      const consentResponse = await saveConsent(consentRequest);
      const consentResult = await consentResponse.json();

      expect(consentResult.consent_id).toBe("consent-id-123");
      expect(consentResult.created).toBe(true);
      expect(consentResult.expires_at).toBe("2025-12-31T23:59:59.999Z");

      // Step 4: Verify consent retrieval
      mockSupabaseAdmin
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({ data: registeredSite, error: null }) // Site lookup
        .mockResolvedValueOnce({ data: newConsentRecord, error: null }); // Existing consent

      const getConsentRequest = new NextRequest(
        `http://localhost:3000/api/consent?site_id=${registeredSite.id}`,
        {
          method: "GET",
          headers: {
            "x-forwarded-for": "192.168.1.1",
            "user-agent": "Mozilla/5.0 (Test Browser)",
          },
        }
      );

      const getConsentResponse = await getConsent(getConsentRequest);
      const getConsentData = await getConsentResponse.json();

      expect(getConsentData.has_consent).toBe(true);
      expect(getConsentData.consent_required).toBe(false);
      expect(getConsentData.consent_categories).toEqual([
        "essential",
        "analytics",
      ]);
    });

    it("should handle site registration with WooCommerce data", async () => {
      const wooCommerceSiteData = {
        ...mockSiteData,
        woocommerce_data: {
          active: true,
          version: "8.0.0",
          product_count: 150,
          order_count: 1200,
          currency: "SEK",
          payment_gateways: [
            { id: "stripe", title: "Credit Card", method_title: "Stripe" },
            { id: "paypal", title: "PayPal", method_title: "PayPal Standard" },
          ],
        },
      };

      mockValidateRequest.mockReturnValue({
        success: true,
        data: wooCommerceSiteData,
      });

      const registeredSite = {
        id: "woo-site-id-1234-5678-9012-123456789012",
        ...wooCommerceSiteData,
        api_token: "woo-api-token-12345678901234567890123456789012",
        status: "active",
      };

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: registeredSite,
        error: null,
      });

      const request = new NextRequest(
        "http://localhost:3000/api/sites/register",
        {
          method: "POST",
          body: JSON.stringify(wooCommerceSiteData),
        }
      );

      const response = await registerSite(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.site_id).toBe("woo-site-id-1234-5678-9012-123456789012");

      // Verify WooCommerce data was processed
      const insertCall = mockSupabaseAdmin.from().insert.mock.calls[0][0];
      expect(insertCall.woocommerce_data).toBeDefined();
      expect(insertCall.woocommerce_data.active).toBe(true);
      expect(insertCall.woocommerce_data.payment_gateways).toHaveLength(2);
    });
  });

  describe("Client Scanning and Policy Updates Workflow", () => {
    it("should process client scan and update site policies", async () => {
      const siteId = "test-site-id-1234-5678-9012-123456789012";

      const scanData = {
        site_id: siteId,
        detected_scripts: [
          {
            src: "https://www.google-analytics.com/analytics.js",
            domain: "google-analytics.com",
            type: "analytics",
          },
          {
            src: "https://connect.facebook.net/en_US/fbevents.js",
            domain: "connect.facebook.net",
            type: "advertising",
          },
        ],
        detected_cookies: [
          {
            name: "_ga",
            domain: "example.com",
            category: "analytics",
          },
          {
            name: "_fbp",
            domain: "example.com",
            category: "advertising",
          },
        ],
        scan_timestamp: "2024-01-01T12:00:00.000Z",
      };

      mockValidateRequest.mockReturnValue({
        success: true,
        data: scanData,
      });

      // Mock site lookup
      mockSupabaseAdmin
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: { id: siteId, domain: "https://example.com", status: "active" },
          error: null,
        });

      // Mock scan insertion
      const insertedScan = {
        id: "scan-id-123",
        ...scanData,
        processed: false,
      };

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: insertedScan,
        error: null,
      });

      const request = new NextRequest("http://localhost:3000/api/scan", {
        method: "POST",
        body: JSON.stringify(scanData),
      });

      const response = await reportScan(request);
      const result = await response.json();

      expect(result.scan_id).toBe("scan-id-123");
      expect(result.processed).toBe(true);
      expect(result.detected_services).toHaveLength(2);
      expect(result.detected_services).toContain("Google Analytics");
      expect(result.detected_services).toContain("Facebook Pixel");
    });

    it("should handle scan with new service detection", async () => {
      const siteId = "test-site-id-1234-5678-9012-123456789012";

      const scanWithNewService = {
        site_id: siteId,
        detected_scripts: [
          {
            src: "https://js.hotjar.com/hotjar.js",
            domain: "hotjar.com",
            type: "analytics",
          },
        ],
        detected_cookies: [
          {
            name: "_hjid",
            domain: "example.com",
            category: "analytics",
          },
        ],
        scan_timestamp: "2024-01-01T12:00:00.000Z",
      };

      mockValidateRequest.mockReturnValue({
        success: true,
        data: scanWithNewService,
      });

      mockSupabaseAdmin
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: { id: siteId, domain: "https://example.com", status: "active" },
          error: null,
        });

      const insertedScan = {
        id: "scan-id-456",
        ...scanWithNewService,
        processed: false,
      };

      mockSupabaseAdmin.from().insert().select().single.mockResolvedValue({
        data: insertedScan,
        error: null,
      });

      const request = new NextRequest("http://localhost:3000/api/scan", {
        method: "POST",
        body: JSON.stringify(scanWithNewService),
      });

      const response = await reportScan(request);
      const result = await response.json();

      expect(result.scan_id).toBe("scan-id-456");
      expect(result.new_services_detected).toBe(true);
      expect(result.detected_services).toContain("Hotjar");
    });
  });

  describe("Multi-Site Consent Management", () => {
    it("should handle consent for multiple sites with same visitor", async () => {
      const site1Id = "site-1-id-1234-5678-9012-123456789012";
      const site2Id = "site-2-id-1234-5678-9012-123456789012";

      const visitorHeaders = {
        "x-forwarded-for": "192.168.1.1",
        "user-agent": "Mozilla/5.0 (Test Browser)",
      };

      // Site 1 consent
      const consent1Data = {
        site_id: site1Id,
        visitor_hash: "visitor-hash-123",
        consent_categories: ["essential", "analytics"],
        timestamp: "2024-01-01T12:00:00.000Z",
        user_agent: "Mozilla/5.0 (Test Browser)",
      };

      mockValidateRequest.mockReturnValue({
        success: true,
        data: consent1Data,
      });

      mockSupabaseAdmin
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: site1Id, status: "active" },
          error: null,
        })
        .mockResolvedValueOnce({ data: null, error: null });

      mockSupabaseAdmin
        .from()
        .insert()
        .select()
        .single.mockResolvedValue({
          data: {
            id: "consent-1-123",
            ...consent1Data,
            expires_at: "2025-12-31T23:59:59.999Z",
          },
          error: null,
        });

      const consent1Request = new NextRequest(
        "http://localhost:3000/api/consent",
        {
          method: "POST",
          headers: visitorHeaders,
          body: JSON.stringify(consent1Data),
        }
      );

      const consent1Response = await saveConsent(consent1Request);
      const consent1Result = await consent1Response.json();

      expect(consent1Result.created).toBe(true);

      // Site 2 consent (different preferences)
      const consent2Data = {
        site_id: site2Id,
        visitor_hash: "visitor-hash-123",
        consent_categories: ["essential"], // Only essential
        timestamp: "2024-01-01T12:05:00.000Z",
        user_agent: "Mozilla/5.0 (Test Browser)",
      };

      mockValidateRequest.mockReturnValue({
        success: true,
        data: consent2Data,
      });

      mockSupabaseAdmin
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: { id: site2Id, status: "active" },
          error: null,
        })
        .mockResolvedValueOnce({ data: null, error: null });

      mockSupabaseAdmin
        .from()
        .insert()
        .select()
        .single.mockResolvedValue({
          data: {
            id: "consent-2-123",
            ...consent2Data,
            expires_at: "2025-12-31T23:59:59.999Z",
          },
          error: null,
        });

      const consent2Request = new NextRequest(
        "http://localhost:3000/api/consent",
        {
          method: "POST",
          headers: visitorHeaders,
          body: JSON.stringify(consent2Data),
        }
      );

      const consent2Response = await saveConsent(consent2Request);
      const consent2Result = await consent2Response.json();

      expect(consent2Result.created).toBe(true);

      // Verify both consents are independent
      expect(consent1Result.consent_id).not.toBe(consent2Result.consent_id);
    });
  });

  describe("Error Recovery and Fallback Scenarios", () => {
    it("should handle API failures gracefully during widget configuration", async () => {
      const siteId = "test-site-id-1234-5678-9012-123456789012";

      mockValidateRequest.mockReturnValue({
        success: true,
        data: { site_id: siteId },
      });

      // Simulate database error
      mockSupabaseAdmin
        .from()
        .select()
        .eq()
        .single.mockRejectedValue(new Error("Database connection failed"));

      const request = new NextRequest(
        `http://localhost:3000/api/widget/${siteId}`,
        {
          method: "GET",
        }
      );

      const response = await getWidget(request, {
        params: { site_id: siteId },
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
      expect(data.code).toBe(1005);
    });

    it("should handle consent save failures with proper error response", async () => {
      const consentData = {
        site_id: "test-site-id-1234-5678-9012-123456789012",
        visitor_hash: "visitor-hash-123",
        consent_categories: ["essential"],
        timestamp: "2024-01-01T12:00:00.000Z",
        user_agent: "Mozilla/5.0 (Test Browser)",
      };

      mockValidateRequest.mockReturnValue({
        success: true,
        data: consentData,
      });

      mockSupabaseAdmin
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: { id: consentData.site_id, status: "active" },
          error: null,
        });

      // Simulate database insert failure
      mockSupabaseAdmin
        .from()
        .insert()
        .select()
        .single.mockRejectedValue(new Error("Database write failed"));

      const request = new NextRequest("http://localhost:3000/api/consent", {
        method: "POST",
        headers: {
          "x-forwarded-for": "192.168.1.1",
          "user-agent": "Mozilla/5.0 (Test Browser)",
        },
        body: JSON.stringify(consentData),
      });

      const response = await saveConsent(request);

      expect(response.status).toBe(500);
    });
  });

  describe("Performance and Load Scenarios", () => {
    it("should handle concurrent widget configuration requests", async () => {
      const siteId = "test-site-id-1234-5678-9012-123456789012";
      const registeredSite = {
        id: siteId,
        domain: "https://example.com",
        status: "active",
      };

      mockValidateRequest.mockReturnValue({
        success: true,
        data: { site_id: siteId },
      });

      mockSupabaseAdmin
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({ data: registeredSite, error: null });

      // Simulate multiple concurrent requests
      const requests = Array.from(
        { length: 5 },
        (_, i) =>
          new NextRequest(`http://localhost:3000/api/widget/${siteId}`, {
            method: "GET",
            headers: { "x-request-id": `req-${i}` },
          })
      );

      const responses = await Promise.all(
        requests.map((req) => getWidget(req, { params: { site_id: siteId } }))
      );

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Database should be called for each request (no caching in test)
      expect(mockSupabaseAdmin.from).toHaveBeenCalledTimes(responses.length);
    });

    it("should handle high-volume consent submissions", async () => {
      const siteId = "test-site-id-1234-5678-9012-123456789012";
      const site = { id: siteId, status: "active" };

      // Simulate multiple consent submissions
      const consentRequests = Array.from({ length: 10 }, (_, i) => ({
        site_id: siteId,
        visitor_hash: `visitor-hash-${i}`,
        consent_categories: ["essential", "analytics"],
        timestamp: new Date().toISOString(),
        user_agent: "Mozilla/5.0 (Test Browser)",
      }));

      mockSupabaseAdmin.from().select().eq().single.mockResolvedValue({
        data: site,
        error: null,
      });

      mockSupabaseAdmin
        .from()
        .insert()
        .select()
        .single.mockImplementation((data) =>
          Promise.resolve({
            data: {
              id: `consent-${Date.now()}`,
              ...data,
              expires_at: "2025-12-31T23:59:59.999Z",
            },
            error: null,
          })
        );

      const responses = await Promise.all(
        consentRequests.map(async (consentData, i) => {
          mockValidateRequest.mockReturnValue({
            success: true,
            data: consentData,
          });

          const request = new NextRequest("http://localhost:3000/api/consent", {
            method: "POST",
            headers: {
              "x-forwarded-for": `192.168.1.${i + 1}`,
              "user-agent": "Mozilla/5.0 (Test Browser)",
            },
            body: JSON.stringify(consentData),
          });

          return saveConsent(request);
        })
      );

      // All consent submissions should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });
    });
  });
});
