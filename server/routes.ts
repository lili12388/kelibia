import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { requireBrokerAuth } from "./middleware/auth.js";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import { mkdir } from "fs/promises";
import { insertPropertySubmissionSchema, propertySubmissions, properties, propertyMedia, propertyAnalytics, visitorLogs } from "../shared/schema.js";
import { z } from "zod";
import { db } from "./db.js";
import { eq } from "drizzle-orm";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory before writing to disk
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/x-msvideo'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

// Helper function to optimize and convert image to base64
async function optimizeImageToBase64(buffer: Buffer): Promise<string> {
  const optimizedBuffer = await sharp(buffer)
    .resize(1920, 1080, { 
      fit: 'inside',
      withoutEnlargement: true 
    })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
  
  return `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
}

// Helper function to convert video to base64 (no optimization, just encode)
async function videoToBase64(buffer: Buffer, mimetype: string): Promise<string> {
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
}

// Helper function to generate a video thumbnail placeholder
// NOTE: For production, consider using ffmpeg to extract actual video frames
// For now, we create a simple placeholder with video icon
async function generateVideoThumbnail(): Promise<string> {
  // Create a simple 320x240 placeholder image with video icon
  const svg = `
    <svg width="320" height="240" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="240" fill="#1a1a2e"/>
      <circle cx="160" cy="120" r="50" fill="#6366f1" opacity="0.8"/>
      <path d="M 145 105 L 145 135 L 175 120 Z" fill="white"/>
    </svg>
  `;
  
  const buffer = await sharp(Buffer.from(svg))
    .jpeg({ quality: 85 })
    .toBuffer();
  
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Broker login endpoint
  app.post('/api/broker/login', async (req, res) => {
    console.log('[LOGIN] Request received:', { body: req.body, hasPassword: !!req.body?.password });
    try {
      const { password } = req.body;
      
      // Simple password check - in production, use proper authentication
      const BROKER_PASSWORD = process.env.BROKER_PASSWORD || 'broker123';
      console.log('[LOGIN] Password check:', { provided: password, expected: BROKER_PASSWORD, match: password === BROKER_PASSWORD });
      
      if (password === BROKER_PASSWORD) {
        // Use JWT for serverless compatibility
        const jwt = await import('jsonwebtoken');
        const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        console.log('[LOGIN] JWT module:', Object.keys(jwt));
        const token = jwt.default.sign(
          { isBroker: true, isAuthenticated: true },
          secret,
          { expiresIn: '24h' }
        );
        console.log('[LOGIN] Token generated successfully');
        
        // Set HTTP-only cookie
        res.cookie('broker_token', token, {
          httpOnly: true,
          secure: false, // Set to false to work with HTTP (no HTTPS)
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/' // Ensure cookie is available for all paths
        });
        
        // Also set session for backward compatibility
        if (req.session) {
          req.session.isBroker = true;
          req.session.isAuthenticated = true;
        }
        
        res.json({ success: true });
      } else {
        res.status(401).json({ error: 'Invalid password' });
      }
    } catch (error) {
      console.error('[LOGIN] Error during broker login:', error);
      console.error('[LOGIN] Error stack:', error instanceof Error ? error.stack : 'No stack');
      res.status(500).json({ error: 'Login failed', details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Broker logout endpoint
  app.post('/api/broker/logout', (req, res) => {
    // Clear JWT cookie with exact same options as when it was set
    res.clearCookie('broker_token', {
      httpOnly: true,
      secure: false, // Match the login cookie settings
      sameSite: 'lax',
      path: '/' // Ensure path matches
    });
    
    // Also destroy session
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('[LOGOUT] Session destroy error:', err);
          res.status(500).json({ error: 'Logout failed' });
        } else {
          console.log('[LOGOUT] Session destroyed successfully');
          res.json({ success: true });
        }
      });
    } else {
      res.json({ success: true });
    }
  });

  // Check broker auth status
  app.get('/api/broker/auth-status', async (req, res) => {
    // Check JWT token first
    const token = req.cookies?.broker_token;
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    
    if (token) {
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, secret) as { isBroker: boolean };
        if (decoded.isBroker) {
          res.json({ isAuthenticated: true });
          return;
        }
      } catch (error) {
        console.error('[AUTH-STATUS] JWT verification error:', error);
        // Token invalid or expired
      }
    }
    
    // Fall back to session check
    res.json({ 
      isAuthenticated: !!(req.session && req.session.isBroker) 
    });
  });

  // Submit a new property
  app.post('/api/properties/submit', upload.array('media', 10), async (req, res) => {
    console.log('[SUBMIT] User property submission received');
    console.log('[SUBMIT] Body keys:', Object.keys(req.body));
    console.log('[SUBMIT] Files:', req.files ? (req.files as any[]).length : 0);
    try {
      // Parse and validate property data
      const propertyData = insertPropertySubmissionSchema.parse({
        title: req.body.title,
        propertyType: req.body.propertyType,
        floorLevel: req.body.floorLevel || null,
        isFurnished: req.body.isFurnished === 'true',
        hasLivingRoom: req.body.hasLivingRoom === 'true',
        hasFridge: req.body.hasFridge === 'true',
        hasGasStove: req.body.hasGasStove === 'true',
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
        googleMapsUrl: req.body.googleMapsUrl || null,
        requiresDeposit: req.body.requiresDeposit === 'true',
        neighborhoodMapUrl: null,
      });

      // Create property submission
      const submission = await storage.createPropertySubmission(propertyData);

      // Save and optimize uploaded media files
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          let url: string;
          let finalMimetype: string;
          let thumbnailUrl: string | null = null;
          
          // Handle images and videos differently
          if (file.mimetype.startsWith('image/')) {
            // Optimize image and convert to base64
            url = await optimizeImageToBase64(file.buffer);
            finalMimetype = 'image/jpeg';
          } else if (file.mimetype.startsWith('video/')) {
            // Convert video to base64 without optimization
            url = await videoToBase64(file.buffer, file.mimetype);
            finalMimetype = file.mimetype;
            // Generate video thumbnail
            thumbnailUrl = await generateVideoThumbnail();
          } else {
            continue; // Skip unsupported file types
          }
          
          await storage.createSubmissionMedia(
            submission.id,
            file.originalname,
            finalMimetype,
            url,
            i === 0, // First media is primary
            thumbnailUrl
          );
        }
      }

      res.json({ 
        success: true, 
        submissionId: submission.id 
      });
    } catch (error) {
      console.error('[SUBMIT] Error submitting property:', error);
      if (error instanceof z.ZodError) {
        console.error('[SUBMIT] Validation errors:', JSON.stringify(error.errors, null, 2));
        res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors 
        });
      } else {
        // Log the full error stack for debugging
        console.error('[SUBMIT] Full error details:', error);
        console.error('[SUBMIT] Error stack:', error instanceof Error ? error.stack : 'No stack');
        res.status(500).json({ 
          error: 'Failed to submit property',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  // Admin submit property - Auto-approve and publish directly
  app.post('/api/broker/properties/submit-admin', requireBrokerAuth, upload.array('media', 10), async (req, res) => {
    try {
      // Parse and validate property data
      const propertyData = insertPropertySubmissionSchema.parse({
        title: req.body.title,
        propertyType: req.body.propertyType,
        floorLevel: req.body.floorLevel || null,
        isFurnished: req.body.isFurnished === 'true',
        hasLivingRoom: req.body.hasLivingRoom === 'true',
        hasFridge: req.body.hasFridge === 'true',
        hasGasStove: req.body.hasGasStove === 'true',
        description: req.body.description,
        rooms: parseInt(req.body.rooms),
        bathrooms: parseInt(req.body.bathrooms),
        sizeM2: parseInt(req.body.sizeM2),
        location: req.body.location,
        price: req.body.price,
        ownerName: req.body.ownerName,
        ownerEmail: req.body.ownerEmail,
        ownerPhone: req.body.ownerPhone,
        status: 'approved', // Auto-approve for admin
        googleMapsUrl: req.body.googleMapsUrl || null,
        requiresDeposit: req.body.requiresDeposit === 'true',
        neighborhoodMapUrl: null,
      });

      // Create property submission with approved status
      const submission = await storage.createPropertySubmission(propertyData);
      
      // Update approved timestamp
      const now = new Date();
      await storage.updatePropertySubmissionStatus(submission.id, 'approved', now);

      // Save and optimize uploaded media files for submission
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          let url: string;
          let finalMimetype: string;
          let thumbnailUrl: string | null = null;
          
          // Handle images and videos differently
          if (file.mimetype.startsWith('image/')) {
            // Optimize image and convert to base64
            url = await optimizeImageToBase64(file.buffer);
            finalMimetype = 'image/jpeg';
          } else if (file.mimetype.startsWith('video/')) {
            // Convert video to base64 without optimization
            url = await videoToBase64(file.buffer, file.mimetype);
            finalMimetype = file.mimetype;
            // Generate video thumbnail
            thumbnailUrl = await generateVideoThumbnail();
          } else {
            continue; // Skip unsupported file types
          }
          
          await storage.createSubmissionMedia(
            submission.id,
            file.originalname,
            finalMimetype,
            url,
            i === 0, // First media is primary
            thumbnailUrl
          );
        }
      }

      // Get the submission with media
      const submissionWithMedia = await storage.getPropertySubmission(submission.id);
      if (!submissionWithMedia) {
        throw new Error('Failed to retrieve submission after creation');
      }

      // Create published property immediately
      const property = await storage.createProperty({
        submissionId: submission.id,
        title: submissionWithMedia.title,
        propertyType: submissionWithMedia.propertyType,
        floorLevel: submissionWithMedia.floorLevel,
        isFurnished: submissionWithMedia.isFurnished,
        hasLivingRoom: submissionWithMedia.hasLivingRoom,
        hasFridge: submissionWithMedia.hasFridge,
        hasGasStove: submissionWithMedia.hasGasStove,
        description: submissionWithMedia.description,
        rooms: submissionWithMedia.rooms,
        bathrooms: submissionWithMedia.bathrooms,
        sizeM2: submissionWithMedia.sizeM2,
        location: submissionWithMedia.location,
        price: submissionWithMedia.price,
        googleMapsUrl: submissionWithMedia.googleMapsUrl,
        requiresDeposit: submissionWithMedia.requiresDeposit,
        neighborhoodMapUrl: submissionWithMedia.neighborhoodMapUrl,
        showOwnerContact: submissionWithMedia.showOwnerContact ?? false,
        showGoogleMaps: submissionWithMedia.showGoogleMaps ?? true,
        showExactLocation: submissionWithMedia.showExactLocation ?? false,
        showNeighborhoodMap: submissionWithMedia.showNeighborhoodMap ?? true,
        showPrice: submissionWithMedia.showPrice ?? true,
        showRooms: submissionWithMedia.showRooms ?? true,
        showBathrooms: submissionWithMedia.showBathrooms ?? true,
        showSize: submissionWithMedia.showSize ?? true,
        showDescription: submissionWithMedia.showDescription ?? true,
        showDeposit: submissionWithMedia.showDeposit ?? true,
      });

      // Copy media to published property
      for (const media of submissionWithMedia.media) {
        await storage.createPropertyMedia(
          property.id,
          media.filename,
          media.mimeType,
          media.url,
          media.isPrimary,
          media.thumbnailUrl
        );
      }

      res.json({ 
        success: true, 
        propertyId: property.id,
        submissionId: submission.id 
      });
    } catch (error) {
      console.error('Error submitting admin property:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors 
        });
      } else {
        console.error('Full error details:', error);
        res.status(500).json({ 
          error: 'Failed to submit property',
          message: error instanceof Error ? error.message : 'Unknown error'
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

  // Broker: Delete a property
  app.delete('/api/broker/properties/:id', requireBrokerAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('[DELETE] Deleting property:', id);
      
      // Get the property to find its submission ID
      const [property] = await db.select().from(properties).where(eq(properties.id, id));
      
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }
      
      const submissionId = property.submissionId;
      
      // Delete property media first (foreign key constraint)
      console.log('[DELETE] Deleting property media...');
      await db.delete(propertyMedia).where(eq(propertyMedia.propertyId, id));
      
      // Delete property analytics
      console.log('[DELETE] Deleting property analytics...');
      await db.delete(propertyAnalytics).where(eq(propertyAnalytics.propertyId, id));
      
      // Delete visitor logs for this property
      console.log('[DELETE] Deleting visitor logs...');
      await db.delete(visitorLogs).where(eq(visitorLogs.propertyId, id));
      
      // Delete the property itself
      console.log('[DELETE] Deleting property...');
      await db.delete(properties).where(eq(properties.id, id));
      
      // Delete the associated submission and its media
      if (submissionId) {
        console.log('[DELETE] Deleting submission media...');
        const { submissionMedia } = await import("../shared/schema.js");
        await db.delete(submissionMedia).where(eq(submissionMedia.submissionId, submissionId));
        
        console.log('[DELETE] Deleting submission...');
        await db.delete(propertySubmissions).where(eq(propertySubmissions.id, submissionId));
      }
      
      console.log('[DELETE] Property deleted successfully');
      res.json({ success: true, message: 'Property deleted successfully' });
    } catch (error) {
      console.error('[DELETE] Error deleting property:', error);
      console.error('[DELETE] Error stack:', error instanceof Error ? error.stack : 'No stack');
      res.status(500).json({ error: 'Failed to delete property', details: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Broker: Get submissions by status
  app.get('/api/broker/submissions/:status', requireBrokerAuth, async (req, res) => {
    try {
      const { status } = req.params;
      console.log(`[FETCH] Fetching submissions with status: ${status}`);
      const startTime = Date.now();
      
      const submissions = await storage.getPropertySubmissionsByStatus(status);
      
      const duration = Date.now() - startTime;
      console.log(`[FETCH] Found ${submissions.length} submissions in ${duration}ms`);
      
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
        propertyType: submission.propertyType,
        floorLevel: submission.floorLevel,
        isFurnished: submission.isFurnished,
        hasLivingRoom: submission.hasLivingRoom,
        hasFridge: submission.hasFridge,
        hasGasStove: submission.hasGasStove,
        description: submission.description,
        rooms: submission.rooms,
        bathrooms: submission.bathrooms,
        sizeM2: submission.sizeM2,
        location: submission.location,
        price: submission.price,
        googleMapsUrl: submission.googleMapsUrl,
        requiresDeposit: submission.requiresDeposit,
        neighborhoodMapUrl: submission.neighborhoodMapUrl,
        showOwnerContact: submission.showOwnerContact ?? false,
        showGoogleMaps: submission.showGoogleMaps ?? true,
        showExactLocation: submission.showExactLocation ?? false,
        showNeighborhoodMap: submission.showNeighborhoodMap ?? true,
        showPrice: submission.showPrice ?? true,
        showRooms: submission.showRooms ?? true,
        showBathrooms: submission.showBathrooms ?? true,
        showSize: submission.showSize ?? true,
        showDescription: submission.showDescription ?? true,
        showDeposit: submission.showDeposit ?? true,
      });

      // Copy media to published property
      for (const media of submission.media) {
        await storage.createPropertyMedia(
          property.id,
          media.filename,
          media.mimeType,
          media.url,
          media.isPrimary,
          media.thumbnailUrl
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
  // Update property submission (edit before approval)
  app.put('/api/broker/submissions/:id', requireBrokerAuth, upload.single('neighborhoodMap'), async (req, res) => {
    try {
      const { id } = req.params;

      const submission = await storage.getPropertySubmission(id);
      if (!submission) {
        res.status(404).json({ error: 'Submission not found' });
        return;
      }

      // Handle neighborhood map upload if provided
      let neighborhoodMapUrl = req.body.neighborhoodMapUrl || null;
      if (req.file) {
        neighborhoodMapUrl = await optimizeImageToBase64(req.file.buffer);
      }

      const updateData = {
        title: req.body.title,
        propertyType: req.body.propertyType,
        floorLevel: req.body.floorLevel || null,
        isFurnished: req.body.isFurnished === 'true',
        hasLivingRoom: req.body.hasLivingRoom === 'true',
        hasFridge: req.body.hasFridge === 'true',
        hasGasStove: req.body.hasGasStove === 'true',
        description: req.body.description,
        rooms: parseInt(req.body.rooms),
        bathrooms: parseInt(req.body.bathrooms),
        sizeM2: parseInt(req.body.sizeM2),
        location: req.body.location,
        price: req.body.price,
        googleMapsUrl: req.body.googleMapsUrl || null,
        requiresDeposit: req.body.requiresDeposit === 'true',
        neighborhoodMapUrl,
        showOwnerContact: req.body.showOwnerContact === 'true',
        showGoogleMaps: req.body.showGoogleMaps === 'true',
        showExactLocation: req.body.showExactLocation === 'true',
        showNeighborhoodMap: req.body.showNeighborhoodMap === 'true',
        showPrice: req.body.showPrice === 'true',
        showRooms: req.body.showRooms === 'true',
        showBathrooms: req.body.showBathrooms === 'true',
        showSize: req.body.showSize === 'true',
        showDescription: req.body.showDescription === 'true',
        showDeposit: req.body.showDeposit === 'true',
      };

      // Update submission in database
      await db.update(propertySubmissions)
        .set(updateData)
        .where(eq(propertySubmissions.id, id));

      // If submission is approved, also update the published property
      if (submission.status === 'approved') {
        // Find the published property by submission ID
        const [publishedProperty] = await db
          .select()
          .from(properties)
          .where(eq(properties.submissionId, id))
          .limit(1);

        if (publishedProperty) {
          // Update the published property with the same data
          await db.update(properties)
            .set(updateData)
            .where(eq(properties.submissionId, id));
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating submission:', error);
      res.status(500).json({ error: 'Failed to update submission' });
    }
  });

  // Broker: Set primary media for a submission
  app.post('/api/broker/submissions/:id/set-primary-media', requireBrokerAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { mediaId } = req.body;

      if (!mediaId) {
        res.status(400).json({ error: 'mediaId is required' });
        return;
      }

      const submission = await storage.getPropertySubmission(id);
      if (!submission) {
        res.status(404).json({ error: 'Submission not found' });
        return;
      }

      // Update submission media primary status
      await storage.setPrimarySubmissionMedia(id, mediaId);

      // If submission is approved, also update the published property's media
      if (submission.status === 'approved') {
        // Find the published property by submission ID
        const [publishedProperty] = await db
          .select()
          .from(properties)
          .where(eq(properties.submissionId, id))
          .limit(1);

        if (publishedProperty) {
          // Find the corresponding property media by matching the submission media
          const submissionMedia = submission.media.find(m => m.id === mediaId);
          if (submissionMedia) {
            // Find property media with matching url (since they're copied)
            const [correspondingPropertyMedia] = await db
              .select()
              .from(propertyMedia)
              .where(eq(propertyMedia.propertyId, publishedProperty.id))
              .limit(100); // Get all property media
            
            // Find the one with matching URL
            const matchingMedia = (await db
              .select()
              .from(propertyMedia)
              .where(eq(propertyMedia.propertyId, publishedProperty.id)))
              .find(pm => pm.url === submissionMedia.url);
            
            if (matchingMedia) {
              await storage.setPrimaryPropertyMedia(publishedProperty.id, matchingMedia.id);
            }
          }
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error setting primary media:', error);
      res.status(500).json({ error: 'Failed to set primary media' });
    }
  });

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

  // Analytics endpoints
  app.get('/api/admin/analytics/summary', requireBrokerAuth, async (req, res) => {
    try {
      const { visitorLogs, propertyAnalytics, siteAnalytics } = await import("../shared/schema.js");
      const { sql, desc } = await import("drizzle-orm");
      
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's site analytics
      const todayStats = await db.query.siteAnalytics.findFirst({
        where: eq(siteAnalytics.date, today),
      });
      
      // Get total visitors (sum of all days)
      const totalStats = await db
        .select({
          totalVisitors: sql<number>`SUM(${siteAnalytics.totalVisitors})::int`,
          totalPageViews: sql<number>`SUM(${siteAnalytics.totalPageViews})::int`,
        })
        .from(siteAnalytics);
      
      // Count unique properties viewed (distinct properties in property_analytics)
      const uniquePropertiesViewed = await db
        .select({
          count: sql<number>`COUNT(*)::int`,
        })
        .from(propertyAnalytics);
      
      // Get active visitors RIGHT NOW (last 6 seconds - heartbeat is every 3 seconds)
      const sixSecondsAgo = new Date(Date.now() - 6 * 1000);
      const { gt } = await import("drizzle-orm");
      const activeVisitors = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${visitorLogs.sessionId})::int`,
        })
        .from(visitorLogs)
        .where(gt(visitorLogs.timestamp, sixSecondsAgo));
      
      // Get top 10 most viewed properties
      const topPropertiesData = await db
        .select()
        .from(propertyAnalytics)
        .orderBy(desc(propertyAnalytics.totalViews))
        .limit(10);
      
      // Fetch property details (titles) for top properties
      const { properties } = await import("../shared/schema.js");
      const topPropertiesWithDetails = await Promise.all(
        topPropertiesData.map(async (analytics) => {
          const property = await db.query.properties.findFirst({
            where: eq(properties.id, analytics.propertyId),
            columns: { id: true, title: true },
          });
          return {
            ...analytics,
            title: property?.title || `Property ${analytics.propertyId.substring(0, 8)}`,
          };
        })
      );
      
      res.json({
        totalVisitors: totalStats[0]?.totalVisitors || 0,
        totalPageViews: uniquePropertiesViewed[0]?.count || 0, // Changed to unique properties count
        todayVisitors: todayStats?.totalVisitors || 0,
        todayPageViews: todayStats?.totalPageViews || 0,
        activeVisitors: activeVisitors[0]?.count || 0,
        topProperties: topPropertiesWithDetails,
      });
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      res.status(500).json({ error: 'Failed to fetch analytics summary' });
    }
  });

  app.get('/api/admin/analytics/visitors', requireBrokerAuth, async (req, res) => {
    try {
      const { visitorLogs } = await import("../shared/schema.js");
      const { desc, isNotNull, sql } = await import("drizzle-orm");
      
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // Get total count of ALL visits (for debugging - will filter later)
      const totalCountResult = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(visitorLogs);
      
      const totalCount = totalCountResult[0]?.count || 0;
      
      console.log('📋 Total visitor logs in database:', totalCount);
      
      // Return ALL visits (including non-property pages for debugging)
      const { properties } = await import("../shared/schema.js");
      
      const visitorsRaw = await db
        .select()
        .from(visitorLogs)
        .orderBy(desc(visitorLogs.timestamp))
        .limit(limit)
        .offset(offset);
      
      console.log('📊 Fetched', visitorsRaw.length, 'visitor logs');
      
      // Fetch all property titles in one go
      const propertyIds = Array.from(
        new Set(
          visitorsRaw
            .map(v => v.propertyId)
            .filter((id): id is string => id !== null && id !== undefined)
        )
      );
      
      let propertiesData: any[] = [];
      if (propertyIds.length > 0) {
        const { inArray } = await import("drizzle-orm");
        propertiesData = await db
          .select({ id: properties.id, title: properties.title })
          .from(properties)
          .where(inArray(properties.id, propertyIds));
      }
      
      const propertyTitleMap = new Map(propertiesData.map(p => [p.id, p.title]));
      
      // Add property titles to visitors
      const visitors = visitorsRaw.map(visitor => ({
        ...visitor,
        propertyTitle: propertyTitleMap.get(visitor.propertyId!) || `Propriété ${visitor.propertyId?.substring(0, 8)}`
      }));
      
      res.json({
        visitors,
        totalCount,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(totalCount / limit),
      });
    } catch (error) {
      console.error('Error fetching visitor logs:', error);
      res.status(500).json({ error: 'Failed to fetch visitor logs' });
    }
  });

  app.get('/api/admin/analytics/property/:id', requireBrokerAuth, async (req, res) => {
    try {
      const { propertyAnalytics, visitorLogs } = await import("../shared/schema.js");
      const { desc, sql } = await import("drizzle-orm");
      
      const { id } = req.params;
      
      console.log('🔍 Looking for property analytics with ID:', id);
      
      // Get property analytics
      const analytics = await db.query.propertyAnalytics.findFirst({
        where: eq(propertyAnalytics.propertyId, id),
      });
      
      console.log('📊 Found analytics:', analytics ? 'YES' : 'NO');
      
      if (!analytics) {
        // Let's check what property IDs we actually have
        const allPropertyAnalytics = await db.select({ propertyId: propertyAnalytics.propertyId }).from(propertyAnalytics).limit(5);
        console.log('❌ No analytics found. Available property IDs in database:', allPropertyAnalytics);
        
        res.json({
          propertyId: id,
          totalViews: 0,
          totalClicks: 0,
          desktopViews: 0,
          mobileViews: 0,
          cityViews: {},
          recentVisitors: [],
        });
        return;
      }
      
      // Get recent visitors for this property
      const recentVisitors = await db
        .select()
        .from(visitorLogs)
        .where(eq(visitorLogs.propertyId, id))
        .orderBy(desc(visitorLogs.timestamp))
        .limit(20);
      
      // Parse city views JSON
      let cityViews = {};
      try {
        cityViews = JSON.parse(analytics.cityViews || '{}');
      } catch (e) {
        cityViews = {};
      }
      
      res.json({
        ...analytics,
        cityViews,
        recentVisitors,
      });
    } catch (error) {
      console.error('Error fetching property analytics:', error);
      res.status(500).json({ error: 'Failed to fetch property analytics' });
    }
  });

  app.get('/api/admin/analytics/real-time', requireBrokerAuth, async (req, res) => {
    try {
      const { visitorLogs } = await import("../shared/schema.js");
      const { sql, desc } = await import("drizzle-orm");
      
      // Get active visitors RIGHT NOW (last 6 seconds - heartbeat is every 3 seconds)
      const sixSecondsAgo = new Date(Date.now() - 6 * 1000);
      console.log('🕐 Checking for visitors active after:', sixSecondsAgo.toISOString());
      
      // Check what timestamps we have
      const recentLogs = await db
        .select({
          timestamp: visitorLogs.timestamp,
          sessionId: visitorLogs.sessionId,
        })
        .from(visitorLogs)
        .orderBy(desc(visitorLogs.timestamp))
        .limit(5);
      
      console.log('🕒 Last 5 log timestamps:', recentLogs.map(l => l.timestamp.toISOString()));
      
      const { gt } = await import("drizzle-orm");
      const activeVisitors = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${visitorLogs.sessionId})::int`,
        })
        .from(visitorLogs)
        .where(gt(visitorLogs.timestamp, sixSecondsAgo));
      
      console.log('👥 Active visitors found:', activeVisitors[0]?.count || 0);
      
      // Get recent activity (last 10)
      const recentActivity = await db
        .select()
        .from(visitorLogs)
        .orderBy(desc(visitorLogs.timestamp))
        .limit(10);
      
      console.log('📋 Recent activity count:', recentActivity.length);
      
      res.json({
        activeVisitors: activeVisitors[0]?.count || 0,
        recentActivity,
      });
    } catch (error) {
      console.error('Error fetching real-time analytics:', error);
      res.status(500).json({ error: 'Failed to fetch real-time analytics' });
    }
  });

  // Track page view from client-side navigation
  app.post('/api/analytics/pageview', async (req, res) => {
    try {
      console.log('🔵 RECEIVED PAGEVIEW REQUEST:', req.body);
      
      // Skip if user is authenticated admin/broker
      if (req.session?.isAuthenticated) {
        console.log('⏭️ Skipping: User is authenticated');
        res.json({ success: true, tracked: false });
        return;
      }

      const { v4: uuidv4 } = await import("uuid");
      const { visitorLogs, propertyAnalytics, siteAnalytics } = await import("../shared/schema.js");
      const { sql, eq } = await import("drizzle-orm");
      
      const { pageUrl, referrer } = req.body;
      
      if (!pageUrl) {
        console.log('❌ No pageUrl provided');
        res.status(400).json({ error: 'pageUrl is required' });
        return;
      }
      
      // Get or create session ID
      if (!req.session.visitorId) {
        req.session.visitorId = uuidv4();
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      
      const sessionId = req.session.visitorId;
      const userAgent = req.headers['user-agent'] || '';
      const deviceType = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ? 'mobile' : 'desktop';
      
      // Extract property ID from URL
      const propertyMatch = pageUrl.match(/\/property\/([^/?]+)/);
      const propertyId = propertyMatch ? propertyMatch[1] : undefined;
      
      console.log('📊 CLIENT TRACKING:', { pageUrl, propertyId, sessionId: sessionId.substring(0, 8), deviceType });
      
      // Insert visitor log
      await db.insert(visitorLogs).values({
        sessionId,
        pageUrl,
        propertyId,
        deviceType,
        userAgent,
        referrer,
      });
      
      console.log('✅ Visitor log inserted');
      
      // Update site analytics
      const today = new Date().toISOString().split('T')[0];
      await db.execute(sql`
        INSERT INTO site_analytics (date, total_visitors, total_page_views, unique_sessions, desktop_visitors, mobile_visitors, city_breakdown)
        VALUES (
          ${today},
          1,
          1,
          1,
          ${deviceType === 'desktop' ? 1 : 0},
          ${deviceType === 'mobile' ? 1 : 0},
          '{}'
        )
        ON CONFLICT (date) 
        DO UPDATE SET
          total_page_views = site_analytics.total_page_views + 1,
          desktop_visitors = site_analytics.desktop_visitors + ${deviceType === 'desktop' ? 1 : 0},
          mobile_visitors = site_analytics.mobile_visitors + ${deviceType === 'mobile' ? 1 : 0}
      `);
      
      console.log('✅ Site analytics updated');
      
      // Update property analytics if viewing a property
      if (propertyId) {
        console.log('📈 Updating property analytics for:', propertyId);
        
        const existing = await db.query.propertyAnalytics.findFirst({
          where: eq(propertyAnalytics.propertyId, propertyId),
        });

        if (existing) {
          await db.update(propertyAnalytics)
            .set({
              totalViews: sql`${propertyAnalytics.totalViews} + 1`,
              desktopViews: deviceType === 'desktop'
                ? sql`${propertyAnalytics.desktopViews} + 1`
                : propertyAnalytics.desktopViews,
              mobileViews: deviceType === 'mobile'
                ? sql`${propertyAnalytics.mobileViews} + 1`
                : propertyAnalytics.mobileViews,
              lastViewedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(propertyAnalytics.propertyId, propertyId));
        } else {
          await db.insert(propertyAnalytics).values({
            propertyId,
            totalViews: 1,
            totalClicks: 0,
            desktopViews: deviceType === 'desktop' ? 1 : 0,
            mobileViews: deviceType === 'mobile' ? 1 : 0,
            lastViewedAt: new Date(),
            cityViews: '{}',
          });
        }
        
        console.log('✅ Property analytics updated');
      } else {
        console.log('⚠️ No property ID - skipping property analytics');
      }
      
      res.json({ 
        success: true, 
        tracked: true,
        sessionId: sessionId.substring(0, 8),
        propertyId,
        message: propertyId ? 'Property visit tracked' : 'Page visit tracked (no property)'
      });
    } catch (error) {
      console.error('❌ Error tracking page view:', error);
      console.error('Error details:', error);
      res.status(500).json({ error: 'Failed to track page view', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Heartbeat endpoint to track active users
  app.post('/api/analytics/heartbeat', async (req, res) => {
    try {
      // Skip if user is authenticated admin/broker (no logging to reduce spam)
      if (req.session?.isAuthenticated) {
        res.json({ success: true, tracked: false });
        return;
      }

      const { v4: uuidv4 } = await import("uuid");
      const { visitorLogs } = await import("../shared/schema.js");
      const { eq, sql, lt } = await import("drizzle-orm");
      
      // Get or create session ID
      if (!req.session.visitorId) {
        req.session.visitorId = uuidv4();
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
      
      const sessionId = req.session.visitorId;
      const { desc } = await import("drizzle-orm");
      
      // Clean up old logs (older than 24 hours) every 100 requests to prevent DB bloat
      if (Math.random() < 0.01) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        await db.delete(visitorLogs).where(lt(visitorLogs.timestamp, yesterday)).execute();
      }
      
      // Find the most recent log entry for this session
      const mostRecentLog = await db
        .select()
        .from(visitorLogs)
        .where(eq(visitorLogs.sessionId, sessionId))
        .orderBy(desc(visitorLogs.timestamp))
        .limit(1);
      
      if (mostRecentLog.length > 0) {
        // Update the most recent log entry timestamp (silently)
        const now = new Date();
        await db
          .update(visitorLogs)
          .set({ timestamp: now })
          .where(eq(visitorLogs.id, mostRecentLog[0].id));
      } else {
        // No existing log found, create a basic one
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const deviceType = /Android|webOS|iPhone|iPad|iPod/i.test(userAgent) ? 'mobile' : 'desktop';
        
        await db.insert(visitorLogs).values({
          sessionId,
          pageUrl: '/',
          deviceType,
          userAgent,
          referrer: null,
          timestamp: new Date(),
        });
      }
      
      res.json({ success: true, tracked: true });
    } catch (error) {
      // Silently handle errors for heartbeat to reduce log spam
      res.status(500).json({ error: 'Failed to process heartbeat' });
    }
  });

  app.post('/api/analytics/contact-click', async (req, res) => {
    try {
      const { trackContactClick } = await import("./middleware/analytics");
      const { propertyId } = req.body;
      const sessionId = req.sessionId || req.session?.visitorId;
      
      if (!propertyId || !sessionId) {
        res.status(400).json({ error: 'Missing propertyId or sessionId' });
        return;
      }
      
      await trackContactClick(propertyId, sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking contact click:', error);
      res.status(500).json({ error: 'Failed to track contact click' });
    }
  });

  // Delete all visitor logs (clear activity history only, keep statistics)
  app.delete('/api/admin/analytics/visitors', requireBrokerAuth, async (req, res) => {
    try {
      const { visitorLogs } = await import("../shared/schema.js");
      
      // Delete ONLY visitor logs (keep property analytics and site analytics)
      await db.delete(visitorLogs).execute();
      
      res.json({ success: true, message: 'Visitor logs cleared' });
    } catch (error) {
      console.error('Error deleting visitor logs:', error);
      res.status(500).json({ error: 'Failed to delete visitor logs' });
    }
  });

  // Delete a single visitor log
  app.delete('/api/admin/analytics/visitors/:id', requireBrokerAuth, async (req, res) => {
    try {
      const { visitorLogs } = await import("../shared/schema.js");
      const { id } = req.params;
      
      await db.delete(visitorLogs).where(eq(visitorLogs.id, id)).execute();
      
      res.json({ success: true, message: 'Visitor log deleted' });
    } catch (error) {
      console.error('Error deleting visitor log:', error);
      res.status(500).json({ error: 'Failed to delete visitor log' });
    }
  });

  // Delete property analytics for a specific property
  app.delete('/api/admin/analytics/property/:id', requireBrokerAuth, async (req, res) => {
    try {
      const { propertyAnalytics } = await import("../shared/schema.js");
      const { id } = req.params;
      
      await db.delete(propertyAnalytics).where(eq(propertyAnalytics.propertyId, id)).execute();
      
      res.json({ success: true, message: 'Property analytics deleted' });
    } catch (error) {
      console.error('Error deleting property analytics:', error);
      res.status(500).json({ error: 'Failed to delete property analytics' });
    }
  });

  // Reset all statistics (set all counts to 0)
  app.post('/api/admin/analytics/reset', requireBrokerAuth, async (req, res) => {
    try {
      const { propertyAnalytics, siteAnalytics } = await import("../shared/schema.js");
      
      // Reset all property analytics
      await db.delete(propertyAnalytics).execute();
      
      // Reset site analytics
      await db.delete(siteAnalytics).execute();
      
      res.json({ success: true, message: 'All statistics reset to zero' });
    } catch (error) {
      console.error('Error resetting statistics:', error);
      res.status(500).json({ error: 'Failed to reset statistics' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

