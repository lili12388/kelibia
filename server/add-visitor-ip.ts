/**
 * Migration: Add visitor_ip column to visitor_logs table
 * 
 * This migration adds IP-based visitor tracking for proper unique visitor
 * deduplication. The visitor_ip stores a SHA-256 hash (truncated to 16 chars)
 * of the raw IP + user agent + daily salt — privacy-safe and un-reversible.
 */
import { db } from "./db.js";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("🔄 Adding visitor_ip column to visitor_logs...");
  
  try {
    // Check if column already exists
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'visitor_logs' AND column_name = 'visitor_ip'
    `);
    
    if (result.rows && result.rows.length > 0) {
      console.log("✅ visitor_ip column already exists, skipping.");
      return;
    }
    
    // Add the column
    await db.execute(sql`
      ALTER TABLE visitor_logs 
      ADD COLUMN visitor_ip VARCHAR(64)
    `);
    
    console.log("✅ visitor_ip column added successfully.");
    
    // Add an index for faster lookups on visitor_ip + date
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_visitor_logs_ip_date 
      ON visitor_logs (visitor_ip, timestamp)
    `);
    
    console.log("✅ Index on visitor_ip + timestamp created.");
    
    // Add an index for visitor_ip + property_id (for property view deduplication)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_visitor_logs_ip_property 
      ON visitor_logs (visitor_ip, property_id, timestamp)
    `);
    
    console.log("✅ Index on visitor_ip + property_id + timestamp created.");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

migrate()
  .then(() => {
    console.log("🎉 Migration complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
