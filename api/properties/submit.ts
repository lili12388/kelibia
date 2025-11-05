import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../server/db';
import { propertySubmissions, submissionMedia, insertPropertySubmissionSchema } from '../../shared/schema';

// Enable JSON body parsing with larger limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting property submission with JSON body...');
    
    // Get data from JSON body (frontend will send base64 images)
    const { propertyData, mediaFiles } = req.body;
    
    console.log('Validating property data...');
    // Validate and create property submission
    const validatedData = insertPropertySubmissionSchema.parse({
      ...propertyData,
      status: 'pending',
      neighborhoodMapUrl: null,
    });

    // Insert property submission
    console.log('Inserting property submission...');
    const [submission] = await db.insert(propertySubmissions).values(validatedData).returning();
    console.log('Submission created:', submission.id);

    // Insert media files (already base64 from frontend)
    if (mediaFiles && Array.isArray(mediaFiles) && mediaFiles.length > 0) {
      console.log(`Inserting ${mediaFiles.length} media files...`);
      
      for (let i = 0; i < mediaFiles.length; i++) {
        const media = mediaFiles[i];
        await db.insert(submissionMedia).values({
          submissionId: submission.id,
          filename: media.filename || `image-${i}`,
          mimeType: media.mimeType || 'image/jpeg',
          url: media.dataUrl, // Already base64 from frontend
          isPrimary: i === 0,
        });
      }
      console.log('All media files inserted');
    }

    console.log('Property submission completed successfully!');
    return res.status(200).json({
      success: true,
      submissionId: submission.id,
    });
  } catch (error) {
    console.error('Submission error:', error);
    return res.status(500).json({
      error: 'Failed to submit property',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
