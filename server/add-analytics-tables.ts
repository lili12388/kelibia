import { db } from "./db";
import { sql } from "drizzle-orm";

async function addAnalyticsTables() {
  console.log("Creating analytics tables...");

  try {
    // Visitor logs table
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
    console.log("✓ Created visitor_logs table");

    // Property analytics table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS property_analytics (
        property_id VARCHAR PRIMARY KEY,
        total_views INTEGER DEFAULT 0,
        total_clicks INTEGER DEFAULT 0,
        desktop_views INTEGER DEFAULT 0,
        mobile_views INTEGER DEFAULT 0,
        last_viewed_at TIMESTAMP,
        city_views JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✓ Created property_analytics table");

    // Site analytics table (for overall stats)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS site_analytics (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL UNIQUE,
        total_visitors INTEGER DEFAULT 0,
        total_page_views INTEGER DEFAULT 0,
        unique_sessions INTEGER DEFAULT 0,
        desktop_visitors INTEGER DEFAULT 0,
        mobile_visitors INTEGER DEFAULT 0,
        city_breakdown JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✓ Created site_analytics table");

    console.log("✓ All analytics tables created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

addAnalyticsTables();
