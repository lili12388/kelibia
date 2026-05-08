/**
 * SEO Component for Laith Kelibia
 * Location immobilière à Kelibia, Tunisie
 */

import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
}

const SITE_URL = 'https://laith-kelibia.tn';
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;

export function SEO({
  title = 'Laith Kelibia — Location Maisons & Appartements à Kelibia',
  description = 'Location saisonnière à Kelibia : maisons S+2, S+3, appartements meublés, villas vue mer, studios près de la plage. Idéal vacances été au Cap Bon, Tunisie. Réservation facile.',
  keywords = 'location kelibia, location maison kelibia, location appartement kelibia, location villa kelibia, maison vacances kelibia, location saisonnière kelibia, appartement meublé kelibia, location été kelibia, location s+2 kelibia, maison s+1 kelibia, studio kelibia, immobilier kelibia, location cap bon, hébergement kelibia, maison à louer kelibia, vacances kelibia été, dar kelibia',
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noIndex = false,
}: SEOProps) {
  const pageUrl = url || (typeof window !== 'undefined' ? window.location.href : SITE_URL);
  const siteName = 'Laith Kelibia';
  
  // Ensure image URL is absolute
  const absoluteImage = image?.startsWith('http') ? image : `${SITE_URL}${image}`;
  
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={pageUrl} />
      
      {/* Robots */}
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="fr_FR" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
      
      {/* Additional SEO */}
      <meta name="language" content="fr" />
      <meta name="revisit-after" content="3 days" />
      <meta name="author" content="Laith Kelibia" />
      <meta name="geo.region" content="TN-12" />
      <meta name="geo.placename" content="Kelibia, Nabeul, Tunisie" />
    </Helmet>
  );
}
