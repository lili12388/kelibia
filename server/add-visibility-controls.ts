import { db } from "./db.js";
import { sql } from "drizzle-orm";

async function addVisibilityControls() {
  console.log("Adding visibility control columns...");

  try {
    // Add columns to property_submissions table
    await db.execute(sql`
      ALTER TABLE property_submissions
      ADD COLUMN IF NOT EXISTS show_owner_contact BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS show_google_maps BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_exact_location BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS show_neighborhood_map BOOLEAN NOT NULL DEFAULT true;
    `);

    // Add columns to properties table
    await db.execute(sql`
      ALTER TABLE properties
      ADD COLUMN IF NOT EXISTS show_owner_contact BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS show_google_maps BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_exact_location BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS show_neighborhood_map BOOLEAN NOT NULL DEFAULT true;
    `);

    console.log("✅ Visibility control columns added successfully!");
  } catch (error) {
    console.error("Error adding columns:", error);
    throw error;
  }
}

addVisibilityControls()
  .then(() => {
    console.log("Migration completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });

