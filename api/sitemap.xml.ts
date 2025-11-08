/**
 * Sitemap.xml API Endpoint
 * 
 * Purpose: Generate dynamic XML sitemap for search engines
 * Route: GET /sitemap.xml
 * 
 * This sitemap includes:
 * - Homepage
 * - Browse properties page
 * - All individual property detail pages
 * 
 * SEO Benefits:
 * - Helps Google discover all pages
 * - Updates automatically when properties change
 * - Improves indexing speed
 */

import type { Request, Response } from "express";
import { db } from "../server/db";
import { properties } from "@shared/schema";
import { isNotNull } from "drizzle-orm";

export default async function handler(req: Request, res: Response) {
  try {
    // Fetch all published properties (publishedAt is not null)
    const publishedProperties = await db
      .select()
      .from(properties)
      .where(isNotNull(properties.publishedAt));

    const baseUrl = req.headers.host?.includes('localhost') 
      ? `http://${req.headers.host}`
      : `https://${req.headers.host}`;
    
    const currentDate = new Date().toISOString().split('T')[0];

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
  
  <!-- Individual Property Pages -->
${publishedProperties.map(property => `  <url>
    <loc>${baseUrl}/property/${property.id}</loc>
    <lastmod>${new Date(property.publishedAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;

    // Set appropriate headers for XML
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    return res.status(200).send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return res.status(500).send('Error generating sitemap');
  }
}
