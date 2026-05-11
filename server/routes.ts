import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { requireBrokerAuth } from "./middleware/auth.js";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import { mkdir } from "fs/promises";
import { insertPropertySubmissionSchema, insertReservationSchema, reservations, propertySubmissions, properties, propertyMedia, propertyAnalytics, visitorLogs } from "../shared/schema.js";
import { z } from "zod";
import { db } from "./db.js";
import { eq } from "drizzle-orm";
import fsSync from "fs";
import crypto from "crypto";

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const TMP_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "tmp");
if (!fsSync.existsSync(UPLOADS_DIR)) {
  fsSync.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fsSync.existsSync(TMP_UPLOADS_DIR)) {
  fsSync.mkdirSync(TMP_UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads using disk storage to avoid OOM errors with large videos
const storageConfig = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, TMP_UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname) || '';
    const uniqueSuffix = crypto.randomUUID();
    cb(null, `${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage: storageConfig, // Store on disk instead of memory
  limits: {
    fileSize: 800 * 1024 * 1024, // 800MB limit per file to support large video uploads
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

// Helper function to optimize image and save to disk
async function saveOptimizedImageToFile(inputPath: string, originalName: string): Promise<string> {
  const filename = `${crypto.randomUUID()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, "")}.webp`;
  const filepath = path.join(UPLOADS_DIR, filename);
  
  await sharp(inputPath)
    .resize(1920, 1080, { 
      fit: 'inside',
      withoutEnlargement: true 
    })
    .webp({ quality: 85 })
    .toFile(filepath);
    
  // Clean up temp file
  try { await fsSync.promises.unlink(inputPath); } catch(e) { console.error('Failed to delete tmp file:', e); }
  
  return `/uploads/${filename}`;
}

// Helper function to save video to disk
async function saveVideoToFile(inputPath: string, originalName: string): Promise<string> {
  const extension = path.extname(originalName) || '.mp4';
  const filename = `${crypto.randomUUID()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, "")}${extension}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  
  await fsSync.promises.rename(inputPath, filepath);
  return `/uploads/${filename}`;
}

// Helper function to generate a video thumbnail placeholder
async function generateVideoThumbnailFile(): Promise<string> {
  const filename = `${crypto.randomUUID()}-video-thumb.webp`;
  const filepath = path.join(UPLOADS_DIR, filename);
  
  const svg = `
    <svg width="320" height="240" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="240" fill="#1a1a2e"/>
      <circle cx="160" cy="120" r="50" fill="#6366f1" opacity="0.8"/>
      <path d="M 145 105 L 145 135 L 175 120 Z" fill="white"/>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .webp({ quality: 85 })
    .toFile(filepath);
  
  return `/uploads/${filename}`;
}

const isProduction = process.env.NODE_ENV === 'production';

// ============================================
// SEO: Slug Generation for Clean URLs
// ============================================
function generatePropertySlug(title: string, price: string, rooms: number, location: string): string {
  const parts: string[] = [];
  
  // Add title (main keywords)
  parts.push(title);
  
  // Add S+N rooms notation if not already in title
  const titleLower = title.toLowerCase();
  const titleNormalized = titleLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (rooms > 0 && !titleNormalized.includes(`s+${rooms}`) && !titleNormalized.includes(`s${rooms}`)) {
    parts.push(`s${rooms}`);
  }
  
  // Add location if not already in title
  const locationNormalized = location.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (location && !titleNormalized.includes(locationNormalized)) {
    parts.push(location);
  }
  
  // Add price
  const priceNum = Math.round(parseFloat(price));
  if (priceNum > 0) {
    parts.push(`${priceNum}-tnd`);
  }
  
  return parts.join(' ')
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\bhouse\b/gi, "maison") // French SEO: "house" → "maison"
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing dashes
}

async function ensureUniqueSlug(baseSlug: string, excludePropertyId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const [existing] = await db.select({ id: properties.id })
      .from(properties)
      .where(eq(properties.slug, slug))
      .limit(1);
    
    if (!existing || (excludePropertyId && existing.id === excludePropertyId)) {
      return slug;
    }
    
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ============================================
  // SEO: Auto-backfill slugs on startup
  // ============================================
  (async () => {
    try {
      const allProps = await storage.getAllProperties();
      let backfilled = 0;
      for (const prop of allProps) {
        if (!prop.slug) {
          const baseSlug = generatePropertySlug(prop.title, prop.price, prop.rooms, prop.location);
          const slug = await ensureUniqueSlug(baseSlug, prop.id);
          await db.update(properties).set({ slug }).where(eq(properties.id, prop.id));
          backfilled++;
          console.log(`[SEO] Backfilled slug: ${prop.id} → ${slug}`);
        }
      }
      if (backfilled > 0) console.log(`[SEO] Backfilled ${backfilled} property slugs`);
    } catch (err) {
      console.error('[SEO] Slug backfill error:', err);
    }
  })();

  // ============================================
  // SEO: Dynamic Sitemap.xml
  // ============================================
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const SITE_URL = 'https://laith-kelibia.tn';
      const today = new Date().toISOString().split('T')[0];

      // Fetch all published properties from database
      const allProperties = await storage.getAllProperties();

      // Static pages with SEO-optimized priorities
      const staticPages = [
        { url: '/', changefreq: 'daily', priority: '1.0' },
        { url: '/browse-properties', changefreq: 'daily', priority: '0.9' },
        { url: '/about', changefreq: 'monthly', priority: '0.7' },
      ];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

      // Add static pages
      for (const page of staticPages) {
        xml += `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
      }

      // Add dynamic property pages
      for (const property of allProperties) {
        const propertyDate = today;

        // Primary URL using SEO-friendly /maisons/ path
        const slugUrl = property.slug || property.id;
        xml += `  <url>
    <loc>${SITE_URL}/maisons/${slugUrl}</loc>
    <lastmod>${propertyDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
`;
        // Add property image to sitemap if available
        if (property.media && property.media.length > 0) {
          const primaryMedia = property.media.find((m: any) => m.isPrimary) || property.media[0];
          if (primaryMedia && primaryMedia.mimeType?.startsWith('image/')) {
            xml += `    <image:image>
      <image:loc>${SITE_URL}${primaryMedia.url}</image:loc>
      <image:title>${(property.title || '').replace(/\bHouse\b/gi, 'Maison').replace(/\bApartment\b/gi, 'Appartement').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>
      <image:caption>Location ${(property.propertyType || 'bien').replace(/\bHouse\b/gi, 'Maison').replace(/\bApartment\b/gi, 'Appartement').replace(/&/g, '&amp;')} à ${(property.location || 'Kelibia').replace(/&/g, '&amp;')}</image:caption>
    </image:image>
`;
          }
        }
        xml += `  </url>
`;
      }

      xml += `</urlset>`;

      res.set('Content-Type', 'application/xml');
      res.set('Cache-Control', 'public, max-age=3600'); // Cache 1 hour
      res.send(xml);
    } catch (error) {
      console.error('[SITEMAP] Error generating sitemap:', error);
      res.status(500).send('Error generating sitemap');
    }
  });

  // ============================================
  // SEO: Robots.txt (server-side fallback)
  // ============================================
  app.get('/robots.txt', (req, res) => {
    const robotsTxt = `# Robots.txt pour laith-kelibia.tn


User-agent: *
Allow: /
Allow: /about
Allow: /browse-properties
Allow: /maisons/
Allow: /property/

Disallow: /list-property
Disallow: /admin/
Disallow: /broker/
Disallow: /api/

Sitemap: https://laith-kelibia.tn/sitemap.xml

Crawl-delay: 2
`;
    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache 24 hours
    res.send(robotsTxt);
  });

  // Broker login endpoint
  app.post('/api/broker/login', async (req, res) => {
    try {
      const { password } = req.body;
      
      const BROKER_PASSWORD = process.env.BROKER_PASSWORD;
      if (!BROKER_PASSWORD) {
        console.error('[LOGIN] BROKER_PASSWORD environment variable is not set');
        res.status(500).json({ error: 'Server configuration error' });
        return;
      }
      
      if (password === BROKER_PASSWORD) {
        const jwt = await import('jsonwebtoken');
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          console.error('[LOGIN] JWT_SECRET environment variable is not set');
          res.status(500).json({ error: 'Server configuration error' });
          return;
        }
        const token = jwt.default.sign(
          { isBroker: true, isAuthenticated: true },
          secret,
          { expiresIn: '24h' }
        );
        
        // Set HTTP-only cookie (secure: false until HTTPS/SSL is configured)
        res.cookie('broker_token', token, {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: '/'
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
      console.error('[LOGIN] Error during broker login:', error instanceof Error ? error.message : error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Broker logout endpoint
  app.post('/api/broker/logout', (req, res) => {
    res.clearCookie('broker_token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/'
    });
    
    // Also destroy session
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('[LOGOUT] Session destroy error:', err);
          res.status(500).json({ error: 'Logout failed' });
        } else {
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
    const secret = process.env.JWT_SECRET;
    
    if (token && secret) {
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, secret) as { isBroker: boolean };
        if (decoded.isBroker) {
          res.json({ isAuthenticated: true });
          return;
        }
      } catch (error) {
        // Token invalid or expired - fall through to session check
      }
    }
    
    // Fall back to session check
    res.json({ 
      isAuthenticated: !!(req.session && req.session.isBroker) 
    });
  });

  // Submit a new property
  app.post('/api/properties/submit', upload.array('media', 50), async (req, res) => {
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
        hasMicrowave: req.body.hasMicrowave === 'true',
        hasCoffeeMaker: req.body.hasCoffeeMaker === 'true',
        hasBalcony: req.body.hasBalcony === 'true',
        hasGarden: req.body.hasGarden === 'true',
        hasLinens: req.body.hasLinens === 'true',
        hasTowels: req.body.hasTowels === 'true',
        tvType: req.body.tvType || 'None',
        numDoubleBeds: parseInt(req.body.numDoubleBeds) || 0,
        numSingleBeds: parseInt(req.body.numSingleBeds) || 0,
        hasSofaBed: req.body.hasSofaBed === 'true',
        bedDetails: req.body.bedDetails || null,
        locationRepere: req.body.locationRepere || null,
        nearbyCommodities: req.body.nearbyCommodities || null,
        checkInTime: req.body.checkInTime || "14:00",
        checkOutTime: req.body.checkOutTime || "11:00",
        cancellationPolicy: req.body.cancellationPolicy || null,
        houseRules: req.body.houseRules || null,
        description: req.body.description,
        rooms: parseInt(req.body.rooms) || 0,
        bathrooms: parseInt(req.body.bathrooms) || 1,
        sizeM2: parseInt(req.body.sizeM2) || 0,
        location: req.body.location,
        price: req.body.price,
        referenceCode: req.body.referenceCode || null,
        distanceToBeach: req.body.distanceToBeach || null,
        maxGuests: parseInt(req.body.maxGuests) || 1,
        hasAC: req.body.hasAC === 'true',
        hasWiFi: req.body.hasWiFi === 'true',
        hasParking: req.body.hasParking === 'true',
        hasSeaView: req.body.hasSeaView === 'true',
        nearbyPlaces: req.body.nearbyPlaces || '[]',
        ownerName: req.body.ownerName,
        ownerEmail: req.body.ownerEmail,
        ownerPhone: req.body.ownerPhone,
        status: 'pending',
        googleMapsUrl: req.body.googleMapsUrl || null,
        neighborhoodMapUrl: null,
        hasKitchenUtensils: req.body.hasKitchenUtensils === 'true',
        isQuietNeighborhood: req.body.isQuietNeighborhood === 'true',
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
          
          // Handle images and videos differently with robust error handling
          if (file.mimetype.startsWith('image/')) {
            try {
              url = await saveOptimizedImageToFile(file.path, file.originalname);
              finalMimetype = 'image/webp';
            } catch (imageError) {
              console.error('[SUBMIT] Image optimization failed, using fallback:', imageError);
              // Fallback to direct file save
              url = await saveVideoToFile(file.path, file.originalname);
              finalMimetype = file.mimetype;
            }
          } else if (file.mimetype.startsWith('video/')) {
            try {
              url = await saveVideoToFile(file.path, file.originalname);
              finalMimetype = file.mimetype;
              try {
                thumbnailUrl = await generateVideoThumbnailFile();
              } catch (thumbError) {
                console.error('[SUBMIT] Video thumbnail generation failed:', thumbError);
                thumbnailUrl = null;
              }
            } catch (videoError) {
              console.error('[SUBMIT] Video processing failed, using fallback:', videoError);
              url = await saveVideoToFile(file.path, file.originalname);
              finalMimetype = file.mimetype;
              thumbnailUrl = null;
            }
          } else {
            // Clean up unsupported file
            try { await fsSync.promises.unlink(file.path); } catch(e) {}
            continue; // Skip unsupported file types
          }
          
          try {
            await storage.createSubmissionMedia(
              submission.id,
              file.originalname,
              finalMimetype,
              url,
              i === 0, // First media is primary
              thumbnailUrl
            );
          } catch (dbError) {
            console.error('[SUBMIT] Database save failed for media:', dbError);
            // Don't throw - continue with other files
          }
        }
      }


      res.json({ 
        success: true, 
        submissionId: submission.id 
      });
    } catch (error) {
      console.error('[SUBMIT] Error submitting property:', error instanceof Error ? error.message : error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Validation error', 
          details: error.errors 
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to submit property',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  // Admin submit property - Auto-approve and publish directly
  app.post('/api/broker/properties/submit-admin', requireBrokerAuth, upload.array('media', 50), async (req, res) => {
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
        hasMicrowave: req.body.hasMicrowave === 'true',
        hasCoffeeMaker: req.body.hasCoffeeMaker === 'true',
        hasBalcony: req.body.hasBalcony === 'true',
        hasGarden: req.body.hasGarden === 'true',
        hasLinens: req.body.hasLinens === 'true',
        hasTowels: req.body.hasTowels === 'true',
        tvType: req.body.tvType || 'None',
        numDoubleBeds: parseInt(req.body.numDoubleBeds) || 0,
        numSingleBeds: parseInt(req.body.numSingleBeds) || 0,
        hasSofaBed: req.body.hasSofaBed === 'true',
        bedDetails: req.body.bedDetails || null,
        locationRepere: req.body.locationRepere || null,
        nearbyCommodities: req.body.nearbyCommodities || null,
        checkInTime: req.body.checkInTime || "14:00",
        checkOutTime: req.body.checkOutTime || "11:00",
        cancellationPolicy: req.body.cancellationPolicy || null,
        houseRules: req.body.houseRules || null,
        description: req.body.description,
        rooms: parseInt(req.body.rooms) || 0,
        bathrooms: parseInt(req.body.bathrooms) || 1,
        sizeM2: parseInt(req.body.sizeM2) || 0,
        location: req.body.location,
        price: req.body.price,
        referenceCode: req.body.referenceCode || null,
        distanceToBeach: req.body.distanceToBeach || null,
        maxGuests: parseInt(req.body.maxGuests) || 1,
        hasAC: req.body.hasAC === 'true',
        hasWiFi: req.body.hasWiFi === 'true',
        hasParking: req.body.hasParking === 'true',
        hasSeaView: req.body.hasSeaView === 'true',
        nearbyPlaces: req.body.nearbyPlaces || '[]',
        ownerName: req.body.ownerName,
        ownerEmail: req.body.ownerEmail,
        ownerPhone: req.body.ownerPhone,
        status: 'approved', // Auto-approve for admin
        googleMapsUrl: req.body.googleMapsUrl || null,
        neighborhoodMapUrl: null,
        hasKitchenUtensils: req.body.hasKitchenUtensils === 'true',
        isQuietNeighborhood: req.body.isQuietNeighborhood === 'true',
        showOwnerContact: req.body.showOwnerContact === 'true',
        showGoogleMaps: req.body.showGoogleMaps !== 'false',
        showExactLocation: req.body.showExactLocation === 'true',
        showNeighborhoodMap: req.body.showNeighborhoodMap !== 'false',
        showPrice: req.body.showPrice !== 'false',
        showRooms: req.body.showRooms !== 'false',
        showBathrooms: req.body.showBathrooms !== 'false',
        showSize: req.body.showSize !== 'false',
        showDescription: req.body.showDescription !== 'false',
      });

      console.log('[SUBMIT ADMIN] Parsed property data successfully');
      
      // Create property submission with approved status
      console.log('[SUBMIT ADMIN] Creating submission...');
      const submission = await storage.createPropertySubmission(propertyData);
      console.log('[SUBMIT ADMIN] Created submission with ID:', submission.id);
      
      // Update approved timestamp
      const now = new Date();
      await storage.updatePropertySubmissionStatus(submission.id, 'approved', now);
      console.log('[SUBMIT ADMIN] Updated status to approved');

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
            try {
              // Optimize image and save
              url = await saveOptimizedImageToFile(file.path, file.originalname);
              finalMimetype = 'image/webp';
            } catch (err) {
              console.error('[SUBMIT ADMIN] Image optimization failed:', err);
              url = await saveVideoToFile(file.path, file.originalname);
              finalMimetype = file.mimetype;
            }
          } else if (file.mimetype.startsWith('video/')) {
            try {
              // Save video directly
              url = await saveVideoToFile(file.path, file.originalname);
              finalMimetype = file.mimetype;
              // Generate video thumbnail
              try {
                thumbnailUrl = await generateVideoThumbnailFile();
              } catch (thumbError) {
                console.error('[SUBMIT ADMIN] Thumbnail failed:', thumbError);
                thumbnailUrl = null;
              }
            } catch (err) {
              console.error('[SUBMIT ADMIN] Video save failed:', err);
              url = await saveVideoToFile(file.path, file.originalname);
              finalMimetype = file.mimetype;
            }
          } else {
            try { await fsSync.promises.unlink(file.path); } catch(e) {}
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

      // Generate SEO-friendly slug
      const baseSlug = generatePropertySlug(
        submissionWithMedia.title,
        submissionWithMedia.price,
        submissionWithMedia.rooms,
        submissionWithMedia.location
      );
      const slug = await ensureUniqueSlug(baseSlug);

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
        hasMicrowave: submissionWithMedia.hasMicrowave,
        hasCoffeeMaker: submissionWithMedia.hasCoffeeMaker,
        hasBalcony: submissionWithMedia.hasBalcony,
        hasGarden: submissionWithMedia.hasGarden,
        hasLinens: submissionWithMedia.hasLinens,
        hasTowels: submissionWithMedia.hasTowels,
        tvType: submissionWithMedia.tvType,
        numDoubleBeds: submissionWithMedia.numDoubleBeds,
        numSingleBeds: submissionWithMedia.numSingleBeds,
        hasSofaBed: submissionWithMedia.hasSofaBed,
        bedDetails: submissionWithMedia.bedDetails,
        locationRepere: submissionWithMedia.locationRepere,
        nearbyCommodities: submissionWithMedia.nearbyCommodities,
        checkInTime: submissionWithMedia.checkInTime,
        checkOutTime: submissionWithMedia.checkOutTime,
        cancellationPolicy: submissionWithMedia.cancellationPolicy,
        houseRules: submissionWithMedia.houseRules,
        description: submissionWithMedia.description,
        rooms: submissionWithMedia.rooms,
        bathrooms: submissionWithMedia.bathrooms,
        sizeM2: submissionWithMedia.sizeM2,
        location: submissionWithMedia.location,
        price: submissionWithMedia.price,
        googleMapsUrl: submissionWithMedia.googleMapsUrl,
        referenceCode: submissionWithMedia.referenceCode,
        distanceToBeach: submissionWithMedia.distanceToBeach,
        maxGuests: submissionWithMedia.maxGuests,
        hasAC: submissionWithMedia.hasAC,
        hasWiFi: submissionWithMedia.hasWiFi,
        hasParking: submissionWithMedia.hasParking,
        hasSeaView: submissionWithMedia.hasSeaView,
        nearbyPlaces: submissionWithMedia.nearbyPlaces,
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
        hasKitchenUtensils: submissionWithMedia.hasKitchenUtensils ?? false,
        isQuietNeighborhood: submissionWithMedia.isQuietNeighborhood ?? false,
        slug,
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
      console.error('[SUBMIT ADMIN] FULL ERROR DETAILS:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      if (error instanceof z.ZodError) {
        console.log('[SUBMIT ADMIN] Validation failed:', error.errors);
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
      }
      res.status(500).json({ error: 'Failed to submit property', message: error instanceof Error ? error.message : String(error) });
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

  // Get view counts for all properties (public endpoint)
  app.get('/api/properties/views', async (req, res) => {
    try {
      const views = await db
        .select({
          propertyId: propertyAnalytics.propertyId,
          totalViews: propertyAnalytics.totalViews,
        })
        .from(propertyAnalytics);

      res.json(views);
    } catch (error) {
      console.error('Error fetching property views:', error);
      res.status(500).json({ error: 'Failed to fetch property views' });
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
      
      // Get the property to find its submission ID
      const [property] = await db.select().from(properties).where(eq(properties.id, id));
      
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }
      
      const submissionId = property.submissionId;
      
      // Delete all related records through storage
      await storage.deleteProperty(id);
      
      // Delete the associated submission and its media
      if (submissionId) {
        const { submissionMedia } = await import("../shared/schema.js");
        await db.delete(submissionMedia).where(eq(submissionMedia.submissionId, submissionId));
        await db.delete(propertySubmissions).where(eq(propertySubmissions.id, submissionId));
      }
      
      res.json({ success: true, message: 'Property deleted successfully' });
    } catch (error) {
      console.error('[DELETE] Error deleting property:', error instanceof Error ? error.message : error);
      res.status(500).json({ error: 'Failed to delete property', details: error instanceof Error ? error.message : String(error) });
    }
  });
  
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

      // Generate SEO-friendly slug
      const baseSlug = generatePropertySlug(
        submission.title,
        submission.price,
        submission.rooms,
        submission.location
      );
      const slug = await ensureUniqueSlug(baseSlug);

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
        hasMicrowave: submission.hasMicrowave,
        hasCoffeeMaker: submission.hasCoffeeMaker,
        hasBalcony: submission.hasBalcony,
        hasGarden: submission.hasGarden,
        hasLinens: submission.hasLinens,
        hasTowels: submission.hasTowels,
        tvType: submission.tvType,
        numDoubleBeds: submission.numDoubleBeds,
        numSingleBeds: submission.numSingleBeds,
        hasSofaBed: submission.hasSofaBed,
        bedDetails: submission.bedDetails,
        locationRepere: submission.locationRepere,
        nearbyCommodities: submission.nearbyCommodities,
        checkInTime: submission.checkInTime,
        checkOutTime: submission.checkOutTime,
        cancellationPolicy: submission.cancellationPolicy,
        houseRules: submission.houseRules,
        description: submission.description,
        rooms: submission.rooms,
        bathrooms: submission.bathrooms,
        sizeM2: submission.sizeM2,
        location: submission.location,
        price: submission.price,
        googleMapsUrl: submission.googleMapsUrl,
        referenceCode: submission.referenceCode,
        distanceToBeach: submission.distanceToBeach,
        maxGuests: submission.maxGuests,
        hasAC: submission.hasAC,
        hasWiFi: submission.hasWiFi,
        hasParking: submission.hasParking,
        hasSeaView: submission.hasSeaView,
        nearbyPlaces: submission.nearbyPlaces,
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
        hasKitchenUtensils: submission.hasKitchenUtensils ?? false,
        isQuietNeighborhood: submission.isQuietNeighborhood ?? false,
        slug,
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
        neighborhoodMapUrl = await saveOptimizedImageToFile(req.file.path, req.file.originalname);
      }

      const updateData = {
        title: req.body.title,
        propertyType: req.body.propertyType,
        floorLevel: req.body.floorLevel || null,
        isFurnished: req.body.isFurnished === 'true',
        hasLivingRoom: req.body.hasLivingRoom === 'true',
        hasFridge: req.body.hasFridge === 'true',
        hasGasStove: req.body.hasGasStove === 'true',
        hasMicrowave: req.body.hasMicrowave === 'true',
        hasCoffeeMaker: req.body.hasCoffeeMaker === 'true',
        hasBalcony: req.body.hasBalcony === 'true',
        hasGarden: req.body.hasGarden === 'true',
        hasLinens: req.body.hasLinens === 'true',
        hasTowels: req.body.hasTowels === 'true',
        tvType: req.body.tvType || 'None',
        numDoubleBeds: parseInt(req.body.numDoubleBeds) || 0,
        numSingleBeds: parseInt(req.body.numSingleBeds) || 0,
        hasSofaBed: req.body.hasSofaBed === 'true',
        bedDetails: req.body.bedDetails || null,
        locationRepere: req.body.locationRepere || null,
        nearbyCommodities: req.body.nearbyCommodities || null,
        checkInTime: req.body.checkInTime || "14:00",
        checkOutTime: req.body.checkOutTime || "11:00",
        cancellationPolicy: req.body.cancellationPolicy || null,
        houseRules: req.body.houseRules || null,
        description: req.body.description,
        rooms: parseInt(req.body.rooms) || 0,
        bathrooms: parseInt(req.body.bathrooms) || 1,
        sizeM2: parseInt(req.body.sizeM2) || 0,
        location: req.body.location,
        price: req.body.price,
        referenceCode: req.body.referenceCode || null,
        distanceToBeach: req.body.distanceToBeach || null,
        maxGuests: parseInt(req.body.maxGuests) || 1,
        hasAC: req.body.hasAC === 'true',
        hasWiFi: req.body.hasWiFi === 'true',
        hasParking: req.body.hasParking === 'true',
        hasSeaView: req.body.hasSeaView === 'true',
        nearbyPlaces: req.body.nearbyPlaces || '[]',
        googleMapsUrl: req.body.googleMapsUrl || null,
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
        hasKitchenUtensils: req.body.hasKitchenUtensils === 'true',
        isQuietNeighborhood: req.body.isQuietNeighborhood === 'true',
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
          // Regenerate slug when title/price/location changes
          const newBaseSlug = generatePropertySlug(
            updateData.title,
            updateData.price,
            updateData.rooms,
            updateData.location
          );
          const newSlug = await ensureUniqueSlug(newBaseSlug, publishedProperty.id);
          
          // Update the published property with the same data + new slug
          await db.update(properties)
            .set({ ...updateData, slug: newSlug })
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
            // Find the property media with matching URL
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
      const { sql, desc, gte, and, lte } = await import("drizzle-orm");
      
      // Get time period from query params (default: day)
      const period = (req.query.period as string) || 'day';
      
      console.log('📊 ANALYTICS SUMMARY REQUEST - Period:', period);
      
      // Calculate date range based on period
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      let startDate: Date;
      const endDate = now; // always "now" (do NOT mutate this)

      switch (period) {
        case 'week':
          // 7 days ago from now
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          // 30 days ago from now
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'day':
        default:
          // Start of today (00:00) in server time, end at current time
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      
      // Get stats for the selected period (sum from site_analytics)
      // This is much more robust than counting visitorLogs because visitorLogs are purged every 24h
      const periodStats = await db
        .select({
          totalVisitors: sql<number>`SUM(${siteAnalytics.totalVisitors})::int`,
          totalPageViews: sql<number>`SUM(${siteAnalytics.totalPageViews})::int`,
        })
        .from(siteAnalytics)
        .where(and(
          gte(siteAnalytics.date, startDateStr),
          lte(siteAnalytics.date, today),
        ));

      // Get stats specifically for TODAY (useful if frontend ever needs it specifically)
      const todayStats = await db
        .select({
          totalVisitors: sql<number>`SUM(${siteAnalytics.totalVisitors})::int`,
          totalPageViews: sql<number>`SUM(${siteAnalytics.totalPageViews})::int`,
        })
        .from(siteAnalytics)
        .where(eq(siteAnalytics.date, today));

      const periodVisitors = periodStats[0]?.totalVisitors || 0;
      const periodPageViews = periodStats[0]?.totalPageViews || 0;
      const todayVisitors = todayStats[0]?.totalVisitors || 0;
      const todayPageViews = todayStats[0]?.totalPageViews || 0;
      
      // Count unique properties viewed (distinct properties in property_analytics)
      const uniquePropertiesViewed = await db
        .select({
          count: sql<number>`COUNT(*)::int`,
        })
        .from(propertyAnalytics);

      // Sum of all property views and contacts (clicks)
      const totalPropertyStatsResult = await db
        .select({
          totalViews: sql<number>`SUM(${propertyAnalytics.totalViews})::int`,
          totalClicks: sql<number>`SUM(${propertyAnalytics.totalClicks})::int`,
        })
        .from(propertyAnalytics);
      const totalPropertyViews = totalPropertyStatsResult[0]?.totalViews || 0;
      const totalContacts = totalPropertyStatsResult[0]?.totalClicks || 0;
      
      // Get device breakdown for the period
      const deviceStats = await db
        .select({
          desktop: sql<number>`SUM(${siteAnalytics.desktopVisitors})::int`,
          mobile: sql<number>`SUM(${siteAnalytics.mobileVisitors})::int`,
        })
        .from(siteAnalytics)
        .where(and(
          gte(siteAnalytics.date, startDateStr),
          lte(siteAnalytics.date, today),
        ));
      
      const desktopVisitors = deviceStats[0]?.desktop || 0;
      const mobileVisitors = deviceStats[0]?.mobile || 0;
      
      // Get active visitors RIGHT NOW (last 15 seconds — heartbeat is every 3s, 15s gives 5x buffer)
      const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000);
      const { gt } = await import("drizzle-orm");
      const activeVisitors = await db
        .select({
          count: sql<number>`COUNT(DISTINCT COALESCE(${visitorLogs.visitorIp}, ${visitorLogs.sessionId}))::int`,
        })
        .from(visitorLogs)
        .where(gt(visitorLogs.timestamp, fifteenSecondsAgo));
      
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
        totalVisitors: periodVisitors, // Unique visitors for selected period
        totalPageViews: periodPageViews, // Page views for selected period
        totalPropertyViews, // Sum of all property views
        totalContacts, // Sum of all WhatsApp contact clicks
        desktopVisitors, // Desktop visitors for period
        mobileVisitors, // Mobile visitors for period
        todayVisitors: todayVisitors, // Visitors specifically today
        todayPageViews: todayPageViews, // Page views specifically today
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
      
      // Return ALL visits (including non-property pages for debugging)
      const { properties } = await import("../shared/schema.js");
      
      const visitorsRaw = await db
        .select()
        .from(visitorLogs)
        .orderBy(desc(visitorLogs.timestamp))
        .limit(limit)
        .offset(offset);
      
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
      
      // Get property analytics
      const analytics = await db.query.propertyAnalytics.findFirst({
        where: eq(propertyAnalytics.propertyId, id),
      });
      
      if (!analytics) {
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
      const { sql } = await import("drizzle-orm");
      
      // Get active visitors RIGHT NOW (last 15 seconds — heartbeat is every 3s, 15s gives 5x buffer)
      const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000);
      
      const { gt } = await import("drizzle-orm");
      // Use COALESCE to count by IP hash (unique visitors), falling back to sessionId for older entries
      const activeVisitors = await db
        .select({
          count: sql<number>`COUNT(DISTINCT COALESCE(${visitorLogs.visitorIp}, ${visitorLogs.sessionId}))::int`,
        })
        .from(visitorLogs)
        .where(gt(visitorLogs.timestamp, fifteenSecondsAgo));
      
      res.json({
        activeVisitors: activeVisitors[0]?.count || 0,
      });
    } catch (error) {
      console.error('Error fetching real-time analytics:', error);
      res.status(500).json({ error: 'Failed to fetch real-time analytics' });
    }
  });

  // Track page view from client-side navigation (IP-based unique tracking)
  app.post('/api/analytics/pageview', async (req, res) => {
    try {
      // Skip if user is authenticated admin/broker
      if (req.session?.isAuthenticated || req.session?.isBroker) {
        res.json({ success: true, tracked: false });
        return;
      }

      const { v4: uuidv4 } = await import("uuid");
      const { visitorLogs, propertyAnalytics, siteAnalytics } = await import("../shared/schema.js");
      const { sql, eq } = await import("drizzle-orm");
      
      const { pageUrl, referrer } = req.body;
      
      if (!pageUrl) {
        res.status(400).json({ error: 'pageUrl is required' });
        return;
      }
      
      // Get or create session ID (kept for heartbeat compatibility)
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
      
      // --- IP-based unique visitor fingerprint ---
      // Get the real client IP (supports reverse proxies like nginx/Caddy)
      const rawIp = req.headers['x-forwarded-for']
        ? (req.headers['x-forwarded-for'] as string).split(',')[0].trim()
        : req.headers['x-real-ip'] as string || req.socket.remoteAddress || 'unknown';
      
      // Create a privacy-safe hash: SHA-256(IP + daily salt)
      // Using daily salt means old hashes can't be correlated across days
      const today = new Date().toISOString().split('T')[0];
      const visitorHash = crypto
        .createHash('sha256')
        .update(`${rawIp}:${userAgent}:${today}`)
        .digest('hex')
        .substring(0, 16); // truncate to 16 chars — enough for uniqueness, privacy-friendly
      
      // Extract property slug/id from URL (support both /property/ and /maisons/ routes)
      const propertyMatch = pageUrl.match(/\/(?:property|maisons)\/([^/?]+)/);
      const propertySlugOrId = propertyMatch ? propertyMatch[1] : undefined;
      
      // CRITICAL: Resolve slug to actual UUID so property_analytics uses the real property ID
      // Without this, views are stored under the slug but looked up by UUID → they never match
      let resolvedPropertyId: string | undefined = undefined;
      if (propertySlugOrId) {
        try {
          const resolvedProperty = await storage.getProperty(propertySlugOrId);
          resolvedPropertyId = resolvedProperty?.id;
        } catch (e) {
          // Property not found — skip property tracking
        }
      }
      
      // --- Deduplicate: check if this IP already visited today ---
      const existingVisitToday = await db.query.visitorLogs.findFirst({
        where: sql`${visitorLogs.visitorIp} = ${visitorHash} AND DATE(${visitorLogs.timestamp}) = ${today}`,
      });
      
      const isNewVisitor = !existingVisitToday;
      
      // --- Deduplicate property views: check if this IP already viewed this property today ---
      let isNewPropertyView = false;
      if (resolvedPropertyId) {
        const existingPropertyView = await db.query.visitorLogs.findFirst({
          where: sql`${visitorLogs.visitorIp} = ${visitorHash} AND ${visitorLogs.propertyId} = ${resolvedPropertyId} AND DATE(${visitorLogs.timestamp}) = ${today}`,
        });
        isNewPropertyView = !existingPropertyView;
      }
      
      // Insert visitor log (always log for audit trail, but counters only update for unique visits)
      await db.insert(visitorLogs).values({
        sessionId,
        visitorIp: visitorHash,
        pageUrl,
        propertyId: resolvedPropertyId, // store the real UUID, not the slug
        deviceType,
        userAgent,
        referrer,
      });
      
      // Update site analytics (unique visitors by IP, page views always count)
      await db.execute(sql`
        INSERT INTO site_analytics (date, total_visitors, total_page_views, unique_sessions, desktop_visitors, mobile_visitors, city_breakdown)
        VALUES (
          ${today},
          ${isNewVisitor ? 1 : 0},
          1,
          ${isNewVisitor ? 1 : 0},
          ${deviceType === 'desktop' && isNewVisitor ? 1 : 0},
          ${deviceType === 'mobile' && isNewVisitor ? 1 : 0},
          '{}'
        )
        ON CONFLICT (date) 
        DO UPDATE SET
          total_visitors = site_analytics.total_visitors + ${isNewVisitor ? 1 : 0},
          total_page_views = site_analytics.total_page_views + 1,
          unique_sessions = site_analytics.unique_sessions + ${isNewVisitor ? 1 : 0},
          desktop_visitors = site_analytics.desktop_visitors + ${deviceType === 'desktop' && isNewVisitor ? 1 : 0},
          mobile_visitors = site_analytics.mobile_visitors + ${deviceType === 'mobile' && isNewVisitor ? 1 : 0}
      `);
      
      // Update property analytics ONLY if this is a new unique view for this property today
      if (resolvedPropertyId && isNewPropertyView) {
        const existing = await db.query.propertyAnalytics.findFirst({
          where: eq(propertyAnalytics.propertyId, resolvedPropertyId),
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
            .where(eq(propertyAnalytics.propertyId, resolvedPropertyId));
        } else {
          await db.insert(propertyAnalytics).values({
            propertyId: resolvedPropertyId,
            totalViews: 1,
            totalClicks: 0,
            desktopViews: deviceType === 'desktop' ? 1 : 0,
            mobileViews: deviceType === 'mobile' ? 1 : 0,
            lastViewedAt: new Date(),
            cityViews: '{}',
          });
        }
      }
      
      res.json({ 
        success: true, 
        tracked: true,
        propertyId: resolvedPropertyId || propertySlugOrId,
        isNewVisitor,
        isNewPropertyView,
      });
    } catch (error) {
      console.error('Error tracking page view:', error instanceof Error ? error.message : error);
      res.status(500).json({ error: 'Failed to track page view' });
    }
  });

  // Heartbeat endpoint to track active users (only updates existing entries, never creates new ones)
  app.post('/api/analytics/heartbeat', async (req, res) => {
    try {
      // Skip if user is authenticated admin/broker (no logging to reduce spam)
      if (req.session?.isAuthenticated) {
        res.json({ success: true, tracked: false });
        return;
      }

      const { visitorLogs } = await import("../shared/schema.js");
      const { eq, sql, lt, desc } = await import("drizzle-orm");
      
      // No session = no visitor to track (pageview must happen first)
      const sessionId = req.session?.visitorId;
      if (!sessionId) {
        res.json({ success: true, tracked: false });
        return;
      }
      
      // Clean up old logs (older than 24 hours) every ~100 requests to prevent DB bloat
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
        // Update the most recent log entry timestamp (keeps this user "active")
        await db
          .update(visitorLogs)
          .set({ timestamp: new Date() })
          .where(eq(visitorLogs.id, mostRecentLog[0].id));
      }
      // If no existing log found, do NOT create a phantom entry.
      // The user must have a pageview first to be tracked.
      
      res.json({ success: true, tracked: mostRecentLog.length > 0 });
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
      
      if (!propertyId) {
        res.status(400).json({ error: 'Missing propertyId' });
        return;
      }
      
      let resolvedPropertyId = propertyId;
      try {
        const resolvedProperty = await storage.getProperty(propertyId);
        if (resolvedProperty) {
          resolvedPropertyId = resolvedProperty.id;
        }
      } catch (e) {
        // Ignore resolution error
      }
      
      await trackContactClick(resolvedPropertyId, sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking contact click:', error);
      res.status(500).json({ error: 'Failed to track contact click' });
    }
  });


  // Reset all analytics (set all counts to 0)
  app.post('/api/admin/analytics/reset', requireBrokerAuth, async (req, res) => {
    try {
      console.log('Resetting all analytics data');
      
      const { visitorLogs, siteAnalytics, propertyAnalytics } = await import("../shared/schema.js");
      
      await db.delete(visitorLogs).execute();
      await db.delete(siteAnalytics).execute();
      await db.delete(propertyAnalytics).execute();
      
      res.json({ 
        success: true, 
        message: 'All analytics data has been reset to zero' 
      });
    } catch (error) {
      console.error('Error resetting analytics:', error instanceof Error ? error.message : error);
      res.status(500).json({ error: 'Failed to reset analytics data' });
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

  // Public endpoint: Get owner contact for properties where showOwnerContact is enabled
  app.get('/api/properties/:id/owner-contact', async (req, res) => {
    try {
      const { id } = req.params;
      const { properties, propertySubmissions } = await import("../shared/schema.js");
      
      const [property] = await db.select().from(properties).where(eq(properties.id, id));
      
      if (!property) {
        res.status(404).json({ error: 'Property not found' });
        return;
      }
      
      if (!property.showOwnerContact) {
        res.json({ ownerContactVisible: false });
        return;
      }
      
      // Only return owner info if showOwnerContact is explicitly true
      if (property.submissionId) {
        const [submission] = await db.select({
          ownerName: propertySubmissions.ownerName,
          ownerPhone: propertySubmissions.ownerPhone,
          ownerEmail: propertySubmissions.ownerEmail,
        }).from(propertySubmissions).where(eq(propertySubmissions.id, property.submissionId));
        
        if (submission) {
          res.json({
            ownerContactVisible: true,
            ownerName: submission.ownerName,
            ownerPhone: submission.ownerPhone,
            ownerEmail: submission.ownerEmail,
          });
          return;
        }
      }
      
      res.json({ ownerContactVisible: false });
    } catch (error) {
      console.error('Error fetching owner contact:', error instanceof Error ? error.message : error);
      res.status(500).json({ error: 'Failed to fetch owner contact' });
    }
  });

  // ═══════════════════════════════════════════════
  // RESERVATION / AVAILABILITY TIMELINE ROUTES
  // ═══════════════════════════════════════════════

  // Public: Get reservations for a property (for the availability timeline)
  app.get('/api/properties/:id/reservations', async (req, res) => {
    try {
      const { id } = req.params;
      const propertyReservations = await db
        .select()
        .from(reservations)
        .where(eq(reservations.propertyId, id))
        .orderBy(reservations.startDate);

      // Partially mask client info for public viewers
      const publicReservations = propertyReservations.map(r => ({
        id: r.id,
        startDate: r.startDate,
        endDate: r.endDate,
        status: r.status,
        // Mask: "MR ABDL*** ***" style
        clientName: r.clientName.split(' ').map((part, i) => 
          i === 0 ? part : part.substring(0, 3) + '***'
        ).join(' '),
        clientPhone: r.clientPhone 
          ? r.clientPhone.substring(0, 5) + '***' 
          : null,
      }));

      res.json(publicReservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      res.status(500).json({ error: 'Failed to fetch reservations' });
    }
  });

  // Admin: Get full reservation details (unmasked)
  app.get('/api/broker/properties/:id/reservations', requireBrokerAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const propertyReservations = await db
        .select()
        .from(reservations)
        .where(eq(reservations.propertyId, id))
        .orderBy(reservations.startDate);

      res.json(propertyReservations);
    } catch (error) {
      console.error('Error fetching admin reservations:', error);
      res.status(500).json({ error: 'Failed to fetch reservations' });
    }
  });

  // Admin: Create a reservation
  app.post('/api/broker/properties/:id/reservations', requireBrokerAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertReservationSchema.parse({
        ...req.body,
        propertyId: id,
      });

      const [reservation] = await db
        .insert(reservations)
        .values(data)
        .returning();

      res.json(reservation);
    } catch (error) {
      console.error('Error creating reservation:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create reservation' });
      }
    }
  });

  // Admin: Update a reservation (change status or dates)
  app.patch('/api/broker/reservations/:id', requireBrokerAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { clientName, clientPhone, startDate, endDate, status } = req.body;

      const updateData: Record<string, any> = {};
      if (clientName !== undefined) updateData.clientName = clientName;
      if (clientPhone !== undefined) updateData.clientPhone = clientPhone;
      if (startDate !== undefined) updateData.startDate = startDate;
      if (endDate !== undefined) updateData.endDate = endDate;
      if (status !== undefined) updateData.status = status;

      const [updated] = await db
        .update(reservations)
        .set(updateData)
        .where(eq(reservations.id, id))
        .returning();

      if (!updated) {
        res.status(404).json({ error: 'Reservation not found' });
        return;
      }

      res.json(updated);
    } catch (error) {
      console.error('Error updating reservation:', error);
      res.status(500).json({ error: 'Failed to update reservation' });
    }
  });

  // Admin: Delete a reservation
  app.delete('/api/broker/reservations/:id', requireBrokerAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(reservations).where(eq(reservations.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting reservation:', error);
      res.status(500).json({ error: 'Failed to delete reservation' });
    }
  });

  // ============================================
  // SEO: Backfill slugs for existing properties
  // ============================================
  app.post('/api/broker/backfill-slugs', requireBrokerAuth, async (req, res) => {
    try {
      const allProperties = await storage.getAllProperties();
      let updated = 0;
      
      for (const property of allProperties) {
        if (!property.slug) {
          const baseSlug = generatePropertySlug(
            property.title,
            property.price,
            property.rooms,
            property.location
          );
          const slug = await ensureUniqueSlug(baseSlug, property.id);
          
          await db.update(properties)
            .set({ slug })
            .where(eq(properties.id, property.id));
          
          updated++;
          console.log(`[BACKFILL] ${property.id} → ${slug}`);
        }
      }
      
      res.json({ success: true, updated, total: allProperties.length });
    } catch (error) {
      console.error('[BACKFILL] Error backfilling slugs:', error);
      res.status(500).json({ error: 'Failed to backfill slugs' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
