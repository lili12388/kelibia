import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL!;
const client = neon(connectionString);
const db = drizzle(client);

async function addAllMissingColumns() {
  console.log("Adding all missing columns to database...\n");

  try {
    console.log("1. Adding property type, floor level, and furnished fields...");
    await db.execute(sql`
      ALTER TABLE property_submissions 
      ADD COLUMN IF NOT EXISTS property_type TEXT NOT NULL DEFAULT 'Apartment',
      ADD COLUMN IF NOT EXISTS floor_level TEXT,
      ADD COLUMN IF NOT EXISTS is_furnished BOOLEAN NOT NULL DEFAULT false
    `);
    
    await db.execute(sql`
      ALTER TABLE properties 
      ADD COLUMN IF NOT EXISTS property_type TEXT NOT NULL DEFAULT 'Apartment',
      ADD COLUMN IF NOT EXISTS floor_level TEXT,
      ADD COLUMN IF NOT EXISTS is_furnished BOOLEAN NOT NULL DEFAULT false
    `);
    console.log("✓ Property details fields added\n");

    console.log("2. Adding granular visibility control columns...");
    await db.execute(sql`
      ALTER TABLE property_submissions 
      ADD COLUMN IF NOT EXISTS show_price BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_rooms BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_bathrooms BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_size BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_description BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_deposit BOOLEAN NOT NULL DEFAULT true
    `);
    
    await db.execute(sql`
      ALTER TABLE properties 
      ADD COLUMN IF NOT EXISTS show_price BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_rooms BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_bathrooms BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_size BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_description BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_deposit BOOLEAN NOT NULL DEFAULT true
    `);
    console.log("✓ Granular visibility columns added\n");

    console.log("3. Verifying has_living_room column exists...");
    await db.execute(sql`
      ALTER TABLE property_submissions 
      ADD COLUMN IF NOT EXISTS has_living_room BOOLEAN NOT NULL DEFAULT false
    `);
    
    await db.execute(sql`
      ALTER TABLE properties 
      ADD COLUMN IF NOT EXISTS has_living_room BOOLEAN NOT NULL DEFAULT false
    `);
    console.log("✓ Living room field verified\n");

    console.log("✅ All migrations completed successfully!");
    console.log("\nFinal column counts:");
    
    const submissionsCount = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_name = 'property_submissions'
    `);
    
    const propertiesCount = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_name = 'properties'
    `);
    
    console.log(`- property_submissions: ${submissionsCount.rows[0].count} columns`);
    console.log(`- properties: ${propertiesCount.rows[0].count} columns`);
    
  } catch (error) {
    console.error("✗ Migration failed:", error);
    throw error;
  }
}

addAllMissingColumns();
