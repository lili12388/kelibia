import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generatePropertyUrl(property: { slug?: string | null; title: string; id: string; price?: string; rooms?: number; location?: string; referenceCode?: string | null }) {
  // Use server-generated slug if available (SEO-friendly, no UUID)
  if (property.slug) {
    return `/maisons/${property.slug}`;
  }
  
  // Fallback for properties without slugs (legacy/pre-migration)
  const slug = property.title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  
  return `/maisons/${slug}-${property.id}`;
}

// Translate English property type words to French for display
const propertyTypeTranslations: Record<string, string> = {
  'House': 'Maison',
  'house': 'maison',
  'Apartment': 'Appartement',
  'apartment': 'appartement',
  'Penthouse': 'Penthouse',
  'Room': 'Chambre',
  'room': 'chambre',
  'Duplex': 'Duplex',
  'Floor': 'Étage',
  'floor': 'étage',
  'Furnished': 'Meublé',
  'furnished': 'meublé',
  'Unfurnished': 'Non meublé',
  'unfurnished': 'non meublé',
  'Living room': 'Salon',
  'living room': 'salon',
  'With': 'Avec',
  'with': 'avec',
  'Without': 'Sans',
  'without': 'sans',
};

export function frenchTitle(title: string, rooms?: number): string {
  let result = title;
  
  // Clean up legacy formatting (remove "Avec salon" and dashes)
  result = result.replace(/\s*-\s*Avec salon\b/gi, '');
  result = result.replace(/\bAvec salon\b/gi, '');
  result = result.replace(/\s*-\s*/g, ' ');

  // Replace whole words only (longest first to avoid partial replacements)
  const entries = Object.entries(propertyTypeTranslations).sort((a, b) => b[0].length - a[0].length);
  for (const [eng, fr] of entries) {
    result = result.replace(new RegExp(`\\b${eng}\\b`, 'g'), fr);
  }

  // Insert "s+X" after the property type if it's not already there and rooms is provided
  if (rooms !== undefined && rooms > 0 && !result.toLowerCase().includes(`s+`)) {
    // We assume the first word is the property type (e.g. Appartement, Maison, Studio)
    // Find the first word and insert " s+X" after it
    result = result.replace(/^(\S+)/, `$1 s+${rooms}`);
  }

  // Clean up extra spaces
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}
