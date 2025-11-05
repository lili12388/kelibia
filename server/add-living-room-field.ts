import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL!;
const client = neon(connectionString);
const db = drizzle(client);

async function addLivingRoomField() {
  console.log("Adding has_living_room field to property_submissions and properties tables...");

  try {
    // Add has_living_room to property_submissions
    await db.execute(sql`
      ALTER TABLE property_submissions 
      ADD COLUMN IF NOT EXISTS has_living_room BOOLEAN NOT NULL DEFAULT false
    `);
    console.log("✓ Added has_living_room to property_submissions");

    // Add has_living_room to properties
    await db.execute(sql`
      ALTER TABLE properties 
      ADD COLUMN IF NOT EXISTS has_living_room BOOLEAN NOT NULL DEFAULT false
    `);
    console.log("✓ Added has_living_room to properties");

    console.log("✓ Migration completed successfully!");
  } catch (error) {
    console.error("✗ Migration failed:", error);
    throw error;
  }
}

addLivingRoomField();
