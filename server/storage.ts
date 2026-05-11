// Referenced from javascript_database blueprint integration
import { 
  propertySubmissions, 
  properties,
  submissionMedia,
  propertyMedia,
  type PropertySubmission,
  type InsertPropertySubmission,
  type Property,
  type PropertySubmissionWithMedia,
  type PropertyWithMedia,
  type SubmissionMedia,
  type PropertyMedia,
  visitorLogs,
  propertyAnalytics,
  reservations,
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Property Submissions
  createPropertySubmission(data: InsertPropertySubmission): Promise<PropertySubmission>;
  getPropertySubmission(id: string): Promise<PropertySubmissionWithMedia | undefined>;
  getPropertySubmissionsByStatus(status: string): Promise<PropertySubmissionWithMedia[]>;
  updatePropertySubmissionStatus(id: string, status: string, approvedAt?: Date): Promise<PropertySubmission>;
  
  // Submission Media
  createSubmissionMedia(submissionId: string, filename: string, mimeType: string, url: string, isPrimary: boolean, thumbnailUrl?: string | null): Promise<SubmissionMedia>;
  getSubmissionMedia(submissionId: string): Promise<SubmissionMedia[]>;
  setPrimarySubmissionMedia(submissionId: string, mediaId: string): Promise<void>;
  
  // Published Properties
  createProperty(data: Omit<Property, 'id' | 'publishedAt'>): Promise<Property>;
  getProperty(id: string): Promise<PropertyWithMedia | undefined>;
  getAllProperties(): Promise<PropertyWithMedia[]>;
  deleteProperty(id: string): Promise<void>;
  
  // Property Media
  createPropertyMedia(propertyId: string, filename: string, mimeType: string, url: string, isPrimary: boolean, thumbnailUrl?: string | null): Promise<PropertyMedia>;
  getPropertyMedia(propertyId: string): Promise<PropertyMedia[]>;
  setPrimaryPropertyMedia(propertyId: string, mediaId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Property Submissions
  async createPropertySubmission(data: InsertPropertySubmission): Promise<PropertySubmission> {
    const [submission] = await db
      .insert(propertySubmissions)
      .values(data)
      .returning();
    return submission;
  }

  async getPropertySubmission(id: string): Promise<PropertySubmissionWithMedia | undefined> {
    const [submission] = await db.query.propertySubmissions.findMany({
      where: eq(propertySubmissions.id, id),
      with: {
        media: true,
      },
    });
    return submission;
  }

  async getPropertySubmissionsByStatus(status: string): Promise<PropertySubmissionWithMedia[]> {
    const submissions = await db.query.propertySubmissions.findMany({
      where: eq(propertySubmissions.status, status),
      with: {
        media: true,
      },
      orderBy: (submissions, { desc }) => [desc(submissions.createdAt)],
    });
    return submissions;
  }

  async updatePropertySubmissionStatus(id: string, status: string, approvedAt?: Date): Promise<PropertySubmission> {
    const [updated] = await db
      .update(propertySubmissions)
      .set({ 
        status,
        approvedAt: approvedAt || null,
      })
      .where(eq(propertySubmissions.id, id))
      .returning();
    return updated;
  }

  // Submission Media
  async createSubmissionMedia(
    submissionId: string, 
    filename: string, 
    mimeType: string, 
    url: string, 
    isPrimary: boolean,
    thumbnailUrl?: string | null
  ): Promise<SubmissionMedia> {
    const [media] = await db
      .insert(submissionMedia)
      .values({
        submissionId,
        filename,
        mimeType,
        url,
        thumbnailUrl,
        isPrimary,
      })
      .returning();
    return media;
  }

  async getSubmissionMedia(submissionId: string): Promise<SubmissionMedia[]> {
    return await db
      .select()
      .from(submissionMedia)
      .where(eq(submissionMedia.submissionId, submissionId));
  }

  async setPrimarySubmissionMedia(submissionId: string, mediaId: string): Promise<void> {
    // First, set all media for this submission to non-primary
    await db
      .update(submissionMedia)
      .set({ isPrimary: false })
      .where(eq(submissionMedia.submissionId, submissionId));
    
    // Then set the selected media as primary
    await db
      .update(submissionMedia)
      .set({ isPrimary: true })
      .where(and(
        eq(submissionMedia.submissionId, submissionId),
        eq(submissionMedia.id, mediaId)
      ));
  }

  // Published Properties
  async createProperty(data: Omit<Property, 'id' | 'publishedAt'>): Promise<Property> {
    const [property] = await db
      .insert(properties)
      .values(data)
      .returning();
    return property;
  }

  async getProperty(idOrSlugOrRef: string): Promise<PropertyWithMedia | undefined> {
    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrSlugOrRef);
    
    let property: PropertyWithMedia | undefined;

    if (isUUID) {
      // Direct UUID lookup
      const [byUuid] = await db.query.properties.findMany({
        where: eq(properties.id, idOrSlugOrRef),
        with: { media: true },
      });
      property = byUuid;
    } else {
      // Try slug lookup first (most common for new SEO-friendly URLs)
      const [bySlug] = await db.query.properties.findMany({
        where: eq(properties.slug, idOrSlugOrRef),
        with: { media: true },
      });
      
      if (bySlug) {
        property = bySlug;
      } else {
        // Fallback to reference code
        const [byRef] = await db.query.properties.findMany({
          where: eq(properties.referenceCode, idOrSlugOrRef),
          with: { media: true },
        });
        
        if (byRef) {
          property = byRef;
        } else if (idOrSlugOrRef.toUpperCase().startsWith('REF-')) {
          // Try without REF- prefix
          const withoutPrefix = idOrSlugOrRef.substring(4);
          const [byRefNoPfx] = await db.query.properties.findMany({
            where: eq(properties.referenceCode, withoutPrefix),
            with: { media: true },
          });
          property = byRefNoPfx;
        }
      }
    }

    if (property && property.media) {
      property.media.sort((a, b) => (a.isPrimary ? -1 : b.isPrimary ? 1 : 0));
    }

    return property;
  }

  async getAllProperties(): Promise<PropertyWithMedia[]> {
    const allProperties = await db.query.properties.findMany({
      with: {
        media: true,
      },
      orderBy: (properties, { desc }) => [desc(properties.publishedAt)],
    });
    
    // Sort media for all properties so primary is first
    for (const prop of allProperties) {
      if (prop.media) {
        prop.media.sort((a, b) => (a.isPrimary ? -1 : b.isPrimary ? 1 : 0));
      }
    }
    
    return allProperties;
  }

  // Property Media
  async createPropertyMedia(
    propertyId: string, 
    filename: string, 
    mimeType: string, 
    url: string, 
    isPrimary: boolean,
    thumbnailUrl?: string | null
  ): Promise<PropertyMedia> {
    const [media] = await db
      .insert(propertyMedia)
      .values({
        propertyId,
        filename,
        mimeType,
        url,
        thumbnailUrl,
        isPrimary,
      })
      .returning();
    return media;
  }

  async getPropertyMedia(propertyId: string): Promise<PropertyMedia[]> {
    return await db
      .select()
      .from(propertyMedia)
      .where(eq(propertyMedia.propertyId, propertyId));
  }

  async setPrimaryPropertyMedia(propertyId: string, mediaId: string): Promise<void> {
    // First, set all media for this property to non-primary
    await db
      .update(propertyMedia)
      .set({ isPrimary: false })
      .where(eq(propertyMedia.propertyId, propertyId));
    
    // Then set the selected media as primary
    await db
      .update(propertyMedia)
      .set({ isPrimary: true })
      .where(and(
        eq(propertyMedia.propertyId, propertyId),
        eq(propertyMedia.id, mediaId)
      ));
  }

  async deleteProperty(propertyId: string): Promise<void> {
    await db.delete(visitorLogs).where(eq(visitorLogs.propertyId, propertyId));
    await db.delete(propertyAnalytics).where(eq(propertyAnalytics.propertyId, propertyId));
    await db.delete(propertyMedia).where(eq(propertyMedia.propertyId, propertyId));
    // Important: import reservations to delete if they exist
    await db.delete(reservations).where(eq(reservations.propertyId, propertyId));
    await db.delete(properties).where(eq(properties.id, propertyId));
  }
}

export const storage = new DatabaseStorage();
