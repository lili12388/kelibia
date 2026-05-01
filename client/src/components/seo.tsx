/**
 * SEO Component for laith-kelibia
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
  title = 'laith-kelibia — Location d\'Appartements',
  description = 'Trouvez votre logement idéal à Kelibia. Appartements vérifiés, meublés et non meublés disponibles à la location.',
  keywords = 'location appartement, Kelibia, appartement meublé, immobilier Kelibia, location Tunisie',
  image = '/darna_logo-removebg-preview.png',
  url,
  type = 'website',
}: SEOProps) {
  const siteUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const siteName = 'laith-kelibia';
  
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
      <meta name="author" content="laith-kelibia" />
    </Helmet>
  );
}
