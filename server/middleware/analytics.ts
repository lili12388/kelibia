import { Request, Response, NextFunction } from "express";
import { db } from "../db.js";
import { visitorLogs, propertyAnalytics, siteAnalytics } from "../../shared/schema.js";
import { v4 as uuidv4 } from "uuid";
import { sql, eq } from "drizzle-orm";

// Extend Express Request to include our custom properties
declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
    }
  }
}

// Detect device type from user agent
function detectDeviceType(userAgent: string): "desktop" | "mobile" {
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent) ? "mobile" : "desktop";
}

// Generate or retrieve session ID
async function getSessionId(req: Request): Promise<string> {
  if (!req.session) {
    throw new Error("Session middleware must be configured before analytics middleware");
  }
  
  if (!req.session.visitorId) {
    req.session.visitorId = uuidv4();
    // Force session save to ensure visitor ID is persisted
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  
  return req.session.visitorId;
}

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Extract Tunisian city from request (can be enhanced with IP geolocation)
function extractTunisianCity(req: Request): string | undefined {
  // For now, we can add a header or query param
  // Later, this can be enhanced with IP geolocation or user selection
  return req.query.city as string | undefined;
}

// Extract property ID from URL
function extractPropertyId(url: string): string | undefined {
  const match = url.match(/\/property\/([^/?]+)/);
  return match ? match[1] : undefined;
}

// Update site analytics for today
async function updateSiteAnalytics(sessionId: string, deviceType: "desktop" | "mobile", city?: string) {
  const today = getTodayDate();
  
  try {
    // Use raw SQL to handle UPSERT properly with proper city breakdown update
    await db.execute(sql`
      INSERT INTO site_analytics (date, total_visitors, total_page_views, unique_sessions, desktop_visitors, mobile_visitors, city_breakdown)
      VALUES (
        ${today},
        1,
        1,
        1,
        ${deviceType === 'desktop' ? 1 : 0},
        ${deviceType === 'mobile' ? 1 : 0},
        ${JSON.stringify(city ? { [city]: 1 } : {})}
      )
      ON CONFLICT (date) 
      DO UPDATE SET
        total_page_views = site_analytics.total_page_views + 1,
        desktop_visitors = site_analytics.desktop_visitors + ${deviceType === 'desktop' ? 1 : 0},
        mobile_visitors = site_analytics.mobile_visitors + ${deviceType === 'mobile' ? 1 : 0},
        city_breakdown = ${city ? sql`
          jsonb_set(
            COALESCE(site_analytics.city_breakdown::jsonb, '{}'::jsonb),
            ${`{${city}}`},
            (COALESCE((site_analytics.city_breakdown::jsonb->${city})::int, 0) + 1)::text::jsonb
          )::text
        ` : sql`site_analytics.city_breakdown`}
    `);
  } catch (error) {
    // Silently ignore errors to avoid spam
    // console.error("Error updating site analytics:", error);
  }
}

// Update property analytics
async function updatePropertyAnalytics(propertyId: string, deviceType: "desktop" | "mobile", city?: string) {
  try {
    const existing = await db.query.propertyAnalytics.findFirst({
      where: eq(propertyAnalytics.propertyId, propertyId),
    });

    if (existing) {
      // Parse existing city views
      let cityViews: Record<string, number> = {};
      try {
        cityViews = JSON.parse(existing.cityViews || '{}');
      } catch (e) {
        cityViews = {};
      }

      // Update city count
      if (city) {
        cityViews[city] = (cityViews[city] || 0) + 1;
      }

      // Update the record
      await db.update(propertyAnalytics)
        .set({
          totalViews: sql`${propertyAnalytics.totalViews} + 1`,
          desktopViews: deviceType === 'desktop'
            ? sql`${propertyAnalytics.desktopViews} + 1`
            : propertyAnalytics.desktopViews,
          mobileViews: deviceType === 'mobile'
            ? sql`${propertyAnalytics.mobileViews} + 1`
            : propertyAnalytics.mobileViews,
          lastViewedAt: new Date(),
          cityViews: JSON.stringify(cityViews),
          updatedAt: new Date(),
        })
        .where(eq(propertyAnalytics.propertyId, propertyId));
    } else {
      // Create new record for this property
      const cityViews = city ? { [city]: 1 } : {};
      
      await db.insert(propertyAnalytics).values({
        propertyId,
        totalViews: 1,
        totalClicks: 0,
        desktopViews: deviceType === 'desktop' ? 1 : 0,
        mobileViews: deviceType === 'mobile' ? 1 : 0,
        lastViewedAt: new Date(),
        cityViews: JSON.stringify(cityViews),
      });
    }
  } catch (error) {
    console.error("Error updating property analytics:", error);
  }
}

// Analytics middleware
export async function analyticsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip analytics for API routes and static files
  if (req.path.startsWith('/api') || req.path.startsWith('/assets') || req.path.startsWith('/uploads')) {
    return next();
  }

  // Skip admin/broker routes
  if (req.path.startsWith('/admin/') || req.path.startsWith('/broker/')) {
    return next();
  }

  // Skip Vite dev server requests (source files, HMR, etc.)
  if (
    req.path.startsWith('/src/') ||
    req.path.startsWith('/@') ||
    req.path.includes('.tsx') ||
    req.path.includes('.ts') ||
    req.path.includes('.jsx') ||
    req.path.includes('.js') ||
    req.path.includes('.css') ||
    req.path.endsWith('.png') ||
    req.path.endsWith('.jpg') ||
    req.path.endsWith('.svg') ||
    req.path.endsWith('.ico') ||
    req.path.includes('?import') ||
    req.path.includes('node_modules')
  ) {
    return next();
  }

  // Skip analytics if user is logged in as admin/broker
  if (req.session && req.session.isAuthenticated) {
    return next();
  }

  try {
    // Get session ID
    const sessionId = await getSessionId(req);
    req.sessionId = sessionId;

    // Get device type
    const userAgent = req.headers['user-agent'] || '';
    const deviceType = detectDeviceType(userAgent);

    // Get city if provided
    const city = extractTunisianCity(req);

    // Get referrer
    const referrer = req.headers.referer || req.headers.referrer;

    // Get property ID if viewing a property
    const propertyId = extractPropertyId(req.path);

    // Log the visit asynchronously (don't wait for it)
    (async () => {
      try {
        console.log('📊 TRACKING:', { 
          path: req.path, 
          propertyId, 
          sessionId: sessionId.substring(0, 8),
          deviceType 
        });

        await db.insert(visitorLogs).values({
          sessionId,
          pageUrl: req.originalUrl || req.url,
          propertyId,
          tunisianCity: city,
          deviceType,
          userAgent,
          referrer: referrer as string | undefined,
        });

        console.log('✅ Visitor log inserted');

        // Update site analytics
        await updateSiteAnalytics(sessionId, deviceType, city);
        console.log('✅ Site analytics updated');

        // Update property analytics if viewing a property
        if (propertyId) {
          console.log('📈 Updating property analytics for:', propertyId);
          await updatePropertyAnalytics(propertyId, deviceType, city);
          console.log('✅ Property analytics updated');
        } else {
          console.log('⚠️ No property ID found in path:', req.path);
        }
      } catch (error) {
        console.error("❌ Error logging visitor:", error);
      }
    })();
  } catch (error) {
    console.error("Error in analytics middleware:", error);
  }

  next();
}

// Track contact click
export async function trackContactClick(propertyId: string, sessionId: string) {
  try {
    // Update the most recent visitor log for this session and property
    await db.execute(sql`
      UPDATE visitor_logs
      SET contact_clicked = true
      WHERE session_id = ${sessionId}
        AND property_id = ${propertyId}
        AND id = (
          SELECT id FROM visitor_logs
          WHERE session_id = ${sessionId} AND property_id = ${propertyId}
          ORDER BY timestamp DESC
          LIMIT 1
        )
    `);

    // Increment total clicks in property analytics
    await db.update(propertyAnalytics)
      .set({
        totalClicks: sql`${propertyAnalytics.totalClicks} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(propertyAnalytics.propertyId, propertyId));
  } catch (error) {
    console.error("Error tracking contact click:", error);
  }
}
