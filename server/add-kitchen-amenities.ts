import { db } from "./db";
import { sql } from "drizzle-orm";

async function addKitchenAmenities() {
  console.log("Adding kitchen amenities columns to database...");

  try {
    // Add columns to property_submissions table
    await db.execute(sql`
      ALTER TABLE property_submissions
      ADD COLUMN IF NOT EXISTS has_fridge BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS has_gas_stove BOOLEAN NOT NULL DEFAULT false
    `);
    console.log("✓ Added kitchen amenities columns to property_submissions table");

    // Add columns to properties table
    await db.execute(sql`
      ALTER TABLE properties
      ADD COLUMN IF NOT EXISTS has_fridge BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS has_gas_stove BOOLEAN NOT NULL DEFAULT false
    `);
    console.log("✓ Added kitchen amenities columns to properties table");

    console.log("✓ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

addKitchenAmenities();
