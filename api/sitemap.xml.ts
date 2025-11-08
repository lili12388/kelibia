/**
 * Sitemap.xml API Endpoint
 * 
 * Purpose: Generate dynamic XML sitemap for search engines
 * Route: GET /sitemap.xml
 * 
 * This sitemap includes:
 * - Homepage
 * - Browse properties page
 * - All individual property detail pages (if database accessible)
 * 
 * SEO Benefits:
 * - Helps Google discover all pages
 * - Updates automatically when properties change
 * - Improves indexing speed
 */

import type { Request, Response } from "express";

export default async function handler(req: Request, res: Response) {
  try {
    const baseUrl = req.headers.host?.includes('localhost') 
      ? `http://${req.headers.host}`
      : `https://${req.headers.host}`;
    
    const currentDate = new Date().toISOString().split('T')[0];

    // Try to fetch properties, but don't fail if database is unavailable
    let propertyUrls = '';
    
    try {
      // Dynamic import to avoid build-time errors
      const { db } = await import("../server/db");
      const { properties } = await import("@shared/schema");
      const { isNotNull } = await import("drizzle-orm");
      
      const publishedProperties = await db
        .select()
        .from(properties)
        .where(isNotNull(properties.publishedAt));

      propertyUrls = publishedProperties.map(property => `  <url>
    <loc>${baseUrl}/property/${property.id}</loc>
    <lastmod>${new Date(property.publishedAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n');
    } catch (dbError) {
      console.error('Database error in sitemap, continuing with static URLs:', dbError);
      // Continue without property URLs if database fails
    }

    // Generate XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Browse Properties Page -->
  <url>
    <loc>${baseUrl}/browse-properties</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- List Property Page -->
  <url>
    <loc>${baseUrl}/list-property</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- Individual Property Pages -->
${propertyUrls}
</urlset>`;

    // Set appropriate headers for XML
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    return res.status(200).send(sitemap);
  } catch (error) {
    console.error('Fatal error generating sitemap:', error);
    
    // Return a minimal valid sitemap even on error
    const baseUrl = req.headers.host?.includes('localhost') 
      ? `http://${req.headers.host}`
      : `https://${req.headers.host}`;
    
    const minimalSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.status(200).send(minimalSitemap);
  }
}
