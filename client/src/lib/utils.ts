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
