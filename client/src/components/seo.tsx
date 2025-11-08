/**
 * SEO Component
 * 
 * Purpose: Manage HTML head meta tags for search engine optimization
 * Usage: Import and wrap any page with <SEO title="..." description="..." />
 * 
 * Features:
 * - Dynamic page titles
 * - Meta descriptions for Google snippets
 * - Open Graph tags for social media (Facebook, Twitter)
 * - Canonical URLs to prevent duplicate content
 * - Keywords meta tag
 * 
 * Example:
 * <SEO 
 *   title="Appartement 2 Chambres - Hay Khadhra"
 *   description="Bel appartement meublé avec 2 chambres à louer"
 *   keywords="appartement, location, Hay Khadhra"
 *   image="https://example.com/image.jpg"
 * />
 */

import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

export function SEO({
  title = 'Edarna - Location d\'Appartements Vérifiés',
  description = 'Trouvez votre appartement idéal à Hay Khadhra et Cité Olympique. Logements vérifiés, meublés et non meublés disponibles.',
  keywords = 'location appartement, Hay Khadhra, Cité Olympique, Tunis, appartement meublé, immobilier',
  image = '/og-image.jpg',
  url,
  type = 'website',
}: SEOProps) {
  const siteUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const siteName = 'Edarna';
  
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Canonical URL */}
      {url && <link rel="canonical" href={url} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="fr_FR" />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={siteUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      
      {/* Additional SEO */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="French" />
      <meta name="revisit-after" content="7 days" />
      <meta name="author" content="Edarna" />
    </Helmet>
  );
}
