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
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Property Submissions
  createPropertySubmission(data: InsertPropertySubmission): Promise<PropertySubmission>;
  getPropertySubmission(id: string): Promise<PropertySubmissionWithMedia | undefined>;
  getPropertySubmissionsByStatus(status: string): Promise<PropertySubmissionWithMedia[]>;
  updatePropertySubmissionStatus(id: string, status: string, approvedAt?: Date): Promise<PropertySubmission>;
  
  // Submission Media
  createSubmissionMedia(submissionId: string, filename: string, mimeType: string, url: string, isPrimary: boolean): Promise<SubmissionMedia>;
  getSubmissionMedia(submissionId: string): Promise<SubmissionMedia[]>;
  
  // Published Properties
  createProperty(data: Omit<Property, 'id' | 'publishedAt'>): Promise<Property>;
  getProperty(id: string): Promise<PropertyWithMedia | undefined>;
  getAllProperties(): Promise<PropertyWithMedia[]>;
  
  // Property Media
  createPropertyMedia(propertyId: string, filename: string, mimeType: string, url: string, isPrimary: boolean): Promise<PropertyMedia>;
  getPropertyMedia(propertyId: string): Promise<PropertyMedia[]>;
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
    isPrimary: boolean
  ): Promise<SubmissionMedia> {
    const [media] = await db
      .insert(submissionMedia)
      .values({
        submissionId,
        filename,
        mimeType,
        url,
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

  // Published Properties
  async createProperty(data: Omit<Property, 'id' | 'publishedAt'>): Promise<Property> {
    const [property] = await db
      .insert(properties)
      .values(data)
      .returning();
    return property;
  }

  async getProperty(id: string): Promise<PropertyWithMedia | undefined> {
    const [property] = await db.query.properties.findMany({
      where: eq(properties.id, id),
      with: {
        media: true,
      },
    });
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
    isPrimary: boolean
  ): Promise<PropertyMedia> {
    const [media] = await db
      .insert(propertyMedia)
      .values({
        propertyId,
        filename,
        mimeType,
        url,
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
}

export const storage = new DatabaseStorage();
