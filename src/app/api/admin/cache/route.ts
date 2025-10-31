import { NextRequest } from "next/server";
import {
  withAuthMiddleware,
  createAuthenticatedResponse,
} from "@/lib/auth-middleware";
import {
  CacheManager,
  WidgetCache,
  SiteCache,
  PolicyCache,
  CookieCache,
} from "@/lib/cache";

/**
 * GET /api/admin/cache - Get cache statistics
 */
export async function GET(request: NextRequest) {
  // Apply authentication middleware with admin requirement
  const authResult = await withAuthMiddleware(request, {
    requireAuth: true,
    requireAdmin: true,
    rateLimitType: "admin",
    allowedMethods: ["GET", "DELETE"],
    corsOrigins: "*",
  });

  if (!authResult.success) {
    return authResult.response;
  }

  const { context } = authResult;

  try {
    const cacheStats = await CacheManager.getStats();

    return createAuthenticatedResponse(
      {
        cache_statistics: cacheStats,
        cache_keys: {
          widget_configs: "widget:config:*",
          site_data: "site:data:*",
          policy_templates: "policy:template:*",
          cookie_categories: "cookie:categories",
        },
        message: "Cache statistics retrieved successfully",
      },
      200,
      context,
      "*",
      request
    );
  } catch (error) {
    console.error("Cache statistics retrieval failed:", error);
    return createAuthenticatedResponse(
      {
        error: "Internal error",
        message: "Failed to retrieve cache statistics",
        code: 1005,
      },
      500,
      context,
      "*",
      request
    );
  }
}

/**
 * DELETE /api/admin/cache - Clear cache (with optional patterns)
 */
export async function DELETE(request: NextRequest) {
  // Apply authentication middleware with admin requirement
  const authResult = await withAuthMiddleware(request, {
    requireAuth: true,
    requireAdmin: true,
    rateLimitType: "admin",
    allowedMethods: ["GET", "DELETE"],
    corsOrigins: "*",
  });

  if (!authResult.success) {
    return authResult.response;
  }

  const { context } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get("pattern");
    const type = searchParams.get("type");

    let clearedCount = 0;
    const operations: string[] = [];

    if (type) {
      // Clear specific cache type
      switch (type) {
        case "widget":
          clearedCount += await WidgetCache.invalidateAllConfigs();
          operations.push("widget configurations");
          break;
        case "policy":
          clearedCount += await PolicyCache.invalidateAllTemplates();
          operations.push("policy templates");
          break;
        case "cookies":
          await CookieCache.invalidateCategories();
          clearedCount += 1;
          operations.push("cookie categories");
          break;
        case "all":
          clearedCount += await WidgetCache.invalidateAllConfigs();
          clearedCount += await PolicyCache.invalidateAllTemplates();
          await CookieCache.invalidateCategories();
          operations.push("all cache types");
          break;
        default:
          return createAuthenticatedResponse(
            {
              error: "Invalid cache type",
              message: "Valid types: widget, policy, cookies, all",
              code: 1004,
            },
            400,
            context,
            "*",
            request
          );
      }
    } else if (pattern) {
      // Clear by pattern
      clearedCount = await CacheManager.deletePattern(pattern);
      operations.push(`pattern: ${pattern}`);
    } else {
      return createAuthenticatedResponse(
        {
          error: "Missing parameters",
          message: 'Specify either "type" or "pattern" query parameter',
          code: 1004,
        },
        400,
        context,
        "*",
        request
      );
    }

    return createAuthenticatedResponse(
      {
        success: true,
        cleared_entries: clearedCount,
        operations,
        message: `Cache cleared successfully: ${operations.join(", ")}`,
        timestamp: new Date().toISOString(),
      },
      200,
      context,
      "*",
      request
    );
  } catch (error) {
    console.error("Cache clearing failed:", error);
    return createAuthenticatedResponse(
      {
        error: "Internal error",
        message: "Failed to clear cache",
        code: 1005,
      },
      500,
      context,
      "*",
      request
    );
  }
}

export async function POST() {
  return new Response(
    JSON.stringify({
      error: "Method not allowed",
      message: "Use GET to view cache stats or DELETE to clear cache",
      code: 1006,
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        Allow: "GET, DELETE",
      },
    }
  );
}

export async function PUT() {
  return new Response(
    JSON.stringify({
      error: "Method not allowed",
      message: "Use GET to view cache stats or DELETE to clear cache",
      code: 1006,
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        Allow: "GET, DELETE",
      },
    }
  );
}
