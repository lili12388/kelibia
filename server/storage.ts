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

  async getProperty(idOrRef: string): Promise<PropertyWithMedia | undefined> {
    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idOrRef);
    
    let whereClause;
    if (isUUID) {
      whereClause = eq(properties.id, idOrRef);
    } else {
      // Sometimes reference code is stored with or without 'REF-' prefix
      // Let's try exact match first
      whereClause = eq(properties.referenceCode, idOrRef);
    }

    const [property] = await db.query.properties.findMany({
      where: whereClause,
      with: {
        media: true,
      },
    });

    // If not found and we were looking for a reference code that starts with REF-, 
    // maybe it's stored without the prefix in the DB.
    if (!property && !isUUID && idOrRef.toUpperCase().startsWith('REF-')) {
      const withoutPrefix = idOrRef.substring(4);
      const [propertyWithoutPrefix] = await db.query.properties.findMany({
        where: eq(properties.referenceCode, withoutPrefix),
        with: { media: true },
      });
      return propertyWithoutPrefix;
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
}

export const storage = new DatabaseStorage();
