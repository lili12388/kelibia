import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import { db } from '../../server/db';
import { propertySubmissions, submissionMedia, insertPropertySubmissionSchema } from '../../shared/schema';
import sharp from 'sharp';
import fs from 'fs/promises';

export const config = {
  api: {
    bodyParser: false, // Disable default body parser for file uploads
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use /tmp directory for Vercel serverless environment
    const uploadDir = '/tmp';

    // Parse the multipart form
    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit for base64 storage
      multiples: true,
    });

    const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
      form.parse(req as any, (err: any, fields: any, files: any) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // Helper to get field value
    const getField = (field: any) => Array.isArray(field) ? field[0] : field;

    // Validate and create property submission
    const propertyData = insertPropertySubmissionSchema.parse({
      title: getField(fields.title),
      propertyType: getField(fields.propertyType),
      floorLevel: getField(fields.floorLevel) || null,
      isFurnished: getField(fields.isFurnished) === 'true',
      hasLivingRoom: getField(fields.hasLivingRoom) === 'true',
      hasFridge: getField(fields.hasFridge) === 'true',
      hasGasStove: getField(fields.hasGasStove) === 'true',
      description: getField(fields.description),
      rooms: parseInt(getField(fields.rooms)),
      bathrooms: parseInt(getField(fields.bathrooms)),
      sizeM2: parseInt(getField(fields.sizeM2) || '0'),
      location: getField(fields.location),
      price: getField(fields.price),
      ownerName: getField(fields.ownerName),
      ownerEmail: getField(fields.ownerEmail),
      ownerPhone: getField(fields.ownerPhone),
      status: 'pending',
      googleMapsUrl: getField(fields.googleMapsUrl) || null,
      requiresDeposit: getField(fields.requiresDeposit) === 'true',
      neighborhoodMapUrl: null,
    });

    // Insert property submission
    const [submission] = await db.insert(propertySubmissions).values(propertyData).returning();

    // Process uploaded files - convert to base64 data URLs for database storage
    const uploadedFiles = Array.isArray(files.media) ? files.media : files.media ? [files.media] : [];
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      let dataUrl: string;

      if (file.mimetype?.startsWith('image/')) {
        // Optimize and convert image to base64
        const optimizedBuffer = await sharp(file.filepath)
          .resize(1920, 1080, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 80, progressive: true })
          .toBuffer();
        
        // Convert to base64 data URL
        const base64 = optimizedBuffer.toString('base64');
        dataUrl = `data:image/jpeg;base64,${base64}`;
        
        // Clean up temp file
        try {
          await fs.unlink(file.filepath);
        } catch (err) {
          // Ignore
        }
      } else if (file.mimetype?.startsWith('video/')) {
        // For videos, read and convert to base64 (note: this might be large!)
        const videoBuffer = await fs.readFile(file.filepath);
        const base64 = videoBuffer.toString('base64');
        dataUrl = `data:${file.mimetype};base64,${base64}`;
        
        // Clean up temp file
        try {
          await fs.unlink(file.filepath);
        } catch (err) {
          // Ignore
        }
      } else {
        // Skip unsupported file types
        continue;
      }

      // Insert media record with base64 data URL
      await db.insert(submissionMedia).values({
        submissionId: submission.id,
        filename: file.originalFilename || `file-${i}`,
        mimeType: file.mimetype || 'application/octet-stream',
        url: dataUrl,
        isPrimary: i === 0,
      });
    }

    return res.status(200).json({
      success: true,
      submissionId: submission.id,
    });
  } catch (error) {
    console.error('Submission error:', error);
    return res.status(500).json({
      error: 'Failed to submit property',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
