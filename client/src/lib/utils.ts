import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generatePropertyUrl(title: string, id: string, referenceCode?: string | null) {
  const slug = title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, ""); // Trim dashes
    
  let refPart = referenceCode;
  if (refPart && !refPart.toUpperCase().startsWith('REF-')) {
    refPart = `REF-${refPart}`;
  }
  
  return `/maisons/${slug}-${refPart ? refPart : id}`;
}
