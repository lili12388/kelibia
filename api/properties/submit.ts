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
    console.log('Starting property submission...');
    
    // Use /tmp directory for Vercel serverless environment
    const uploadDir = '/tmp';

    // Parse the multipart form
    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit for base64 storage
      multiples: true,
    });

    console.log('Parsing form data...');
    const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
      form.parse(req as any, (err: any, fields: any, files: any) => {
        if (err) {
          console.error('Form parse error:', err);
          reject(err);
        }
        else resolve([fields, files]);
      });
    });
    console.log('Form parsed successfully');

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
    console.log('Inserting property submission...');
    const [submission] = await db.insert(propertySubmissions).values(propertyData).returning();
    console.log('Submission created:', submission.id);

    // Process uploaded files - convert to base64 data URLs for database storage
    const uploadedFiles = Array.isArray(files.media) ? files.media : files.media ? [files.media] : [];
    console.log(`Processing ${uploadedFiles.length} files...`);
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      console.log(`Processing file ${i + 1}: ${file.mimetype}`);
      let dataUrl: string;

      if (file.mimetype?.startsWith('image/')) {
        // Optimize and convert image to base64
        console.log('Optimizing image with Sharp...');
        const optimizedBuffer = await sharp(file.filepath)
          .resize(1200, 800, {  // Reduced size for faster processing
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 75, progressive: true })  // Reduced quality for smaller size
          .toBuffer();
        console.log('Image optimized, converting to base64...');
        
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
      console.log(`Inserting media ${i + 1} into database...`);
      await db.insert(submissionMedia).values({
        submissionId: submission.id,
        filename: file.originalFilename || `file-${i}`,
        mimeType: file.mimetype || 'application/octet-stream',
        url: dataUrl,
        isPrimary: i === 0,
      });
      console.log(`Media ${i + 1} inserted successfully`);
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
