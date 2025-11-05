import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

// Load environment variables
config();

const connectionString = process.env.DATABASE_URL!;
const client = neon(connectionString);
const db = drizzle(client);

async function checkSchema() {
  console.log("Checking database schema...\n");

  try {
    // Check property_submissions columns
    const submissionsColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'property_submissions'
      ORDER BY ordinal_position
    `);
    
    console.log("=== property_submissions columns ===");
    submissionsColumns.rows.forEach((col: any) => {
      console.log(`${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}`);
    });

    console.log("\n=== properties columns ===");
    // Check properties columns
    const propertiesColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'properties'
      ORDER BY ordinal_position
    `);
    
    propertiesColumns.rows.forEach((col: any) => {
      console.log(`${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}`);
    });

  } catch (error) {
    console.error("Error checking schema:", error);
    throw error;
  }
}

checkSchema();
