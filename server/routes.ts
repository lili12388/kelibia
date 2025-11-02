import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireBrokerAuth } from "./middleware/auth";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import { mkdir } from "fs/promises";
import { insertPropertySubmissionSchema } from "@shared/schema";
import { z } from "zod";

// Configure multer for file uploads (temporary storage)
const uploadsDir = path.join(process.cwd(), "public", "uploads");
const tempDir = path.join(process.cwd(), "temp");

// Ensure directories exist
mkdir(uploadsDir, { recursive: true }).catch(console.error);
mkdir(tempDir, { recursive: true }).catch(console.error);

const multerStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    cb(null, tempDir); // Save to temp first
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

// Helper function to optimize images
async function optimizeImage(inputPath: string, outputFilename: string): Promise<string> {
  const outputPath = path.join(uploadsDir, outputFilename);
  
  await sharp(inputPath)
    .resize(1920, 1080, { 
      fit: 'inside',
      withoutEnlargement: true 
    })
    .jpeg({ quality: 85, progressive: true })
    .toFile(outputPath);
  
  return `/uploads/${outputFilename}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Broker login endpoint
  app.post('/api/broker/login', async (req, res) => {
    try {
      const { password } = req.body;
      
      // Simple password check - in production, use proper authentication
      const BROKER_PASSWORD = process.env.BROKER_PASSWORD || 'broker123';
      
      if (password === BROKER_PASSWORD) {
        req.session.isBroker = true;
        res.json({ success: true });
      } else {
        res.status(401).json({ error: 'Invalid password' });
      }
    } catch (error) {
      console.error('Error during broker login:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Broker logout endpoint
  app.post('/api/broker/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: 'Logout failed' });
      } else {
        res.json({ success: true });
      }
    });
  });

  // Check broker auth status
  app.get('/api/broker/auth-status', (req, res) => {
    res.json({ 
      isAuthenticated: !!(req.session && req.session.isBroker) 
    });
  });

  // Submit a new property
  app.post('/api/properties/submit', upload.array('media', 10), async (req, res) => {
    try {
      // Parse and validate property data
      const propertyData = insertPropertySubmissionSchema.parse({
        title: req.body.title,
        description: req.body.description,
        rooms: parseInt(req.body.rooms),
        bathrooms: parseInt(req.body.bathrooms),
        sizeM2: parseInt(req.body.sizeM2),
        location: req.body.location,
        price: req.body.price,
        ownerName: req.body.ownerName,
        ownerEmail: req.body.ownerEmail,
        ownerPhone: req.body.ownerPhone,
        status: 'pending',
      });

      // Create property submission
      const submission = await storage.createPropertySubmission(propertyData);

      // Save and optimize uploaded media files
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          let url: string;
          
          // Optimize images, keep videos as-is
          if (file.mimetype.startsWith('image/')) {
            const optimizedFilename = `opt-${file.filename}.jpg`;
            url = await optimizeImage(file.path, optimizedFilename);
            // Clean up temp file after optimization
            const fs = await import('fs/promises');
            await fs.unlink(file.path).catch(() => {});
          } else {
            // For videos, just move to uploads directory
            const fs = await import('fs/promises');
            const videoPath = path.join(uploadsDir, file.filename);
            await fs.rename(file.path, videoPath);
            url = `/uploads/${file.filename}`;
          }
          
          await storage.createSubmissionMedia(
            submission.id,
            file.filename,
            file.mimetype,
            url,
            i === 0 // First media is primary
          );
        }
      }

      res.json({ 
        success: true, 
        submissionId: submission.id 
      });
    } catch (error) {
      console.error('Error submitting property:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors 
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to submit property' 
        });
      }
    }
  });

  // Get all published properties (public endpoint)
  app.get('/api/properties', async (req, res) => {
    try {
      const properties = await storage.getAllProperties();
      res.json(properties);
    } catch (error) {
      console.error('Error fetching properties:', error);
      res.status(500).json({ error: 'Failed to fetch properties' });
    }
  });

  // Get a specific property by ID (public endpoint)
  app.get('/api/properties/:id', async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        res.status(404).json({ error: 'Property not found' });
        return;
      }
      res.json(property);
    } catch (error) {
      console.error('Error fetching property:', error);
      res.status(500).json({ error: 'Failed to fetch property' });
    }
  });

  // PROTECTED BROKER ENDPOINTS - Require authentication
  
  // Broker: Get submissions by status
  app.get('/api/broker/submissions/:status', requireBrokerAuth, async (req, res) => {
    try {
      const { status } = req.params;
      const submissions = await storage.getPropertySubmissionsByStatus(status);
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({ error: 'Failed to fetch submissions' });
    }
  });

  // Broker: Approve a submission
  app.post('/api/broker/submissions/:id/approve', requireBrokerAuth, async (req, res) => {
    try {
      const { id } = req.params;

      // Get the submission with media
      const submission = await storage.getPropertySubmission(id);
      if (!submission) {
        res.status(404).json({ error: 'Submission not found' });
        return;
      }

      if (submission.status !== 'pending') {
        res.status(400).json({ error: 'Submission already processed' });
        return;
      }

      // Update submission status
      const now = new Date();
      await storage.updatePropertySubmissionStatus(id, 'approved', now);

      // Create published property
      const property = await storage.createProperty({
        submissionId: id,
        title: submission.title,
        description: submission.description,
        rooms: submission.rooms,
        bathrooms: submission.bathrooms,
        sizeM2: submission.sizeM2,
        location: submission.location,
        price: submission.price,
      });

      // Copy media to published property
      for (const media of submission.media) {
        await storage.createPropertyMedia(
          property.id,
          media.filename,
          media.mimeType,
          media.url,
          media.isPrimary
        );
      }

      res.json({ 
        success: true, 
        propertyId: property.id 
      });
    } catch (error) {
      console.error('Error approving submission:', error);
      res.status(500).json({ error: 'Failed to approve submission' });
    }
  });

  // Broker: Reject a submission
  app.post('/api/broker/submissions/:id/reject', requireBrokerAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const submission = await storage.getPropertySubmission(id);
      if (!submission) {
        res.status(404).json({ error: 'Submission not found' });
        return;
      }

      if (submission.status !== 'pending') {
        res.status(400).json({ error: 'Submission already processed' });
        return;
      }

      await storage.updatePropertySubmissionStatus(id, 'rejected');

      res.json({ success: true });
    } catch (error) {
      console.error('Error rejecting submission:', error);
      res.status(500).json({ error: 'Failed to reject submission' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
