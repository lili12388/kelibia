import { db } from "./db.js";
import { visitorLogs, siteAnalytics, propertyAnalytics } from "../shared/schema.js";
import { sql } from "drizzle-orm";

async function insertTestAnalytics() {
  console.log("🧪 Testing analytics system...");

  try {
    // First, ensure tables exist
    console.log("📋 Creating analytics tables if they don't exist...");
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS visitor_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        page_url TEXT NOT NULL,
        property_id VARCHAR,
        tunisian_city VARCHAR,
        device_type VARCHAR NOT NULL,
        user_agent TEXT,
        referrer TEXT,
        time_on_page INTEGER DEFAULT 0,
        contact_clicked BOOLEAN DEFAULT false
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS property_analytics (
        property_id VARCHAR PRIMARY KEY,
        total_views INTEGER DEFAULT 0,
        total_clicks INTEGER DEFAULT 0,
        desktop_views INTEGER DEFAULT 0,
        mobile_views INTEGER DEFAULT 0,
        last_viewed_at TIMESTAMP,
        city_views TEXT DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS site_analytics (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        date TEXT NOT NULL UNIQUE,
        total_visitors INTEGER DEFAULT 0,
        total_page_views INTEGER DEFAULT 0,
        unique_sessions INTEGER DEFAULT 0,
        desktop_visitors INTEGER DEFAULT 0,
        mobile_visitors INTEGER DEFAULT 0,
        city_breakdown TEXT DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log("✅ Analytics tables created/verified");
    
    // Check current data
    const visitorCount = await db.select({ count: sql<number>`COUNT(*)::int` }).from(visitorLogs);
    const siteCount = await db.select({ count: sql<number>`COUNT(*)::int` }).from(siteAnalytics);
    const propertyCount = await db.select({ count: sql<number>`COUNT(*)::int` }).from(propertyAnalytics);
    
    console.log("📊 Current database counts:");
    console.log("  - Visitor logs:", visitorCount[0]?.count || 0);
    console.log("  - Site analytics:", siteCount[0]?.count || 0);
    console.log("  - Property analytics:", propertyCount[0]?.count || 0);

    const today = new Date().toISOString().split('T')[0];
    console.log("📅 Today's date:", today);
    
    // Insert test visitor logs
    await db.insert(visitorLogs).values([
      {
        sessionId: 'test-session-1',
        pageUrl: '/',
        deviceType: 'mobile',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        referrer: 'https://google.com',
      },
      {
        sessionId: 'test-session-2', 
        pageUrl: '/browse-properties',
        deviceType: 'desktop',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        referrer: null,
      },
      {
        sessionId: 'test-session-3',
        pageUrl: '/property/test-property-1',
        propertyId: 'test-property-1',
        deviceType: 'mobile',
        userAgent: 'Mozilla/5.0 (Android 11; Mobile)',
        referrer: '/browse-properties',
      }
    ]);
    
    console.log("✅ Inserted test visitor logs");

    // Insert test site analytics for today
    await db.insert(siteAnalytics).values({
      date: today,
      totalVisitors: 25,
      totalPageViews: 45,
      uniqueSessions: 20,
      desktopVisitors: 10,
      mobileVisitors: 15,
      cityBreakdown: JSON.stringify({ 'Tunis': 15, 'Ariana': 10 }),
    });
    
    console.log("✅ Inserted test site analytics");

    // Insert test property analytics
    await db.insert(propertyAnalytics).values([
      {
        propertyId: 'test-property-1',
        totalViews: 12,
        totalClicks: 3,
        desktopViews: 5,
        mobileViews: 7,
        lastViewedAt: new Date(),
        cityViews: JSON.stringify({ 'Tunis': 8, 'Ariana': 4 }),
      },
      {
        propertyId: 'test-property-2',
        totalViews: 8,
        totalClicks: 1,
        desktopViews: 3,
        mobileViews: 5,
        lastViewedAt: new Date(),
        cityViews: JSON.stringify({ 'Tunis': 5, 'Sfax': 3 }),
      }
    ]);
    
    console.log("✅ Inserted test property analytics");
    
    console.log("🎉 Test analytics data inserted successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to insert test data:", error);
    process.exit(1);
  }
}

insertTestAnalytics();
