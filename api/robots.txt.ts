/**
 * Robots.txt API Endpoint
 * 
 * Purpose: Guide search engine crawlers on what to index
 * Route: GET /robots.txt
 * 
 * This file tells search engines:
 * - Allow all public pages to be crawled
 * - Block admin/broker authentication pages
 * - Reference the sitemap location
 * 
 * SEO Benefits:
 * - Prevents duplicate content from admin pages
 * - Directs crawlers to sitemap
 * - Saves crawl budget by blocking unnecessary pages
 */

import type { Request, Response } from "express";

export default function handler(req: Request, res: Response) {
  const baseUrl = req.headers.host?.includes('localhost') 
    ? `http://${req.headers.host}`
    : `https://${req.headers.host}`;

  const robotsTxt = `# Edarna - Robots.txt
# Allow search engines to index public property listings

User-agent: *

# Allow all property and public pages
Allow: /
Allow: /browse-properties
Allow: /property/*
Allow: /list-property

# Block admin and authentication pages
Disallow: /admin-analytics
Disallow: /broker-dashboard
Disallow: /broker-browse
Disallow: /broker-login
Disallow: /api/broker/
Disallow: /api/admin/

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay (optional, helps with server load)
Crawl-delay: 1
`;

  // Set appropriate headers for text file
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  
  return res.status(200).send(robotsTxt);
}
