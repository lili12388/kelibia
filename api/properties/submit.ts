import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    // Import necessary modules
    const formidable = await import('formidable');
    const { db } = await import('../../server/db');
    const { propertySubmissions, submissionMedia } = await import('../../shared/schema');
    const { insertPropertySubmissionSchema } = await import('../../shared/schema');
    const sharp = await import('sharp');
    const path = await import('path');
    const fs = await import('fs/promises');
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Ensure upload directory exists
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    // Parse the multipart form
    const form = formidable.default({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
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

    // Process uploaded files
    const uploadedFiles = Array.isArray(files.media) ? files.media : files.media ? [files.media] : [];
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      let url: string;

      if (file.mimetype?.startsWith('image/')) {
        const optimizedFilename = `opt-${Date.now()}-${i}.jpg`;
        const outputPath = path.join(uploadDir, optimizedFilename);
        
        await sharp.default(file.filepath)
          .resize(1920, 1080, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85, progressive: true })
          .toFile(outputPath);
        
        url = `/uploads/${optimizedFilename}`;
        
        // Delete temp file
        try {
          await fs.unlink(file.filepath);
        } catch (err) {
          // Ignore
        }
      } else {
        // For videos, just move to uploads
        const videoFilename = `${Date.now()}-${i}${path.extname(file.originalFilename || '')}`;
        const videoPath = path.join(uploadDir, videoFilename);
        await fs.rename(file.filepath, videoPath);
        url = `/uploads/${videoFilename}`;
      }

      // Insert media record
      await db.insert(submissionMedia).values({
        submissionId: submission.id,
        filename: file.originalFilename || `file-${i}`,
        mimeType: file.mimetype || 'application/octet-stream',
        url,
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
