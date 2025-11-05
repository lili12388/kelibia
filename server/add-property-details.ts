import { neon } from '@neondatabase/serverless';

async function addPropertyDetailsFields() {
  const sql = neon(process.env.DATABASE_URL!);
  
  console.log('Adding property type, floor level, and furnished fields...');
  
  try {
    // Add new fields to property_submissions table
    await sql`
      ALTER TABLE property_submissions 
      ADD COLUMN IF NOT EXISTS property_type TEXT NOT NULL DEFAULT 'Apartment',
      ADD COLUMN IF NOT EXISTS floor_level TEXT,
      ADD COLUMN IF NOT EXISTS is_furnished BOOLEAN NOT NULL DEFAULT false;
    `;
    
    // Add new fields to properties table
    await sql`
      ALTER TABLE properties 
      ADD COLUMN IF NOT EXISTS property_type TEXT NOT NULL DEFAULT 'Apartment',
      ADD COLUMN IF NOT EXISTS floor_level TEXT,
      ADD COLUMN IF NOT EXISTS is_furnished BOOLEAN NOT NULL DEFAULT false;
    `;
    
    console.log('✅ Property details fields added successfully!');
    console.log('Migration completed!');
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    throw error;
  }
}

addPropertyDetailsFields()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
