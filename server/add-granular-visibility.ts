import { neon } from '@neondatabase/serverless';

async function addGranularVisibilityControls() {
  const sql = neon(process.env.DATABASE_URL!);
  
  console.log('Adding granular visibility control columns...');
  
  try {
    // Add new visibility columns to property_submissions table
    await sql`
      ALTER TABLE property_submissions 
      ADD COLUMN IF NOT EXISTS show_price BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_rooms BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_bathrooms BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_size BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_description BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_deposit BOOLEAN NOT NULL DEFAULT true;
    `;
    
    // Add new visibility columns to properties table
    await sql`
      ALTER TABLE properties 
      ADD COLUMN IF NOT EXISTS show_price BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_rooms BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_bathrooms BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_size BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_description BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS show_deposit BOOLEAN NOT NULL DEFAULT true;
    `;
    
    console.log('✅ Granular visibility control columns added successfully!');
    console.log('Migration completed!');
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    throw error;
  }
}

addGranularVisibilityControls()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
