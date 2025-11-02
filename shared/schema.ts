import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Property submissions table (private, only visible to broker)
export const propertySubmissions = pgTable("property_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rooms: integer("rooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  sizeM2: integer("size_m2").notNull(),
  location: text("location").notNull(), // exact location within neighborhood
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  ownerName: text("owner_name").notNull(),
  ownerEmail: text("owner_email").notNull(),
  ownerPhone: text("owner_phone").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
});

// Public properties table (approved listings visible to tenants)
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => propertySubmissions.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rooms: integer("rooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  sizeM2: integer("size_m2").notNull(),
  location: text("location").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
});

// Media files for submissions (images and videos)
export const submissionMedia = pgTable("submission_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => propertySubmissions.id),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  url: text("url").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false), // primary image for card display
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

// Media files for published properties
export const propertyMedia = pgTable("property_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  url: text("url").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

// Relations
export const propertySubmissionsRelations = relations(propertySubmissions, ({ many, one }) => ({
  media: many(submissionMedia),
  publishedProperty: one(properties, {
    fields: [propertySubmissions.id],
    references: [properties.submissionId],
  }),
}));

export const submissionMediaRelations = relations(submissionMedia, ({ one }) => ({
  submission: one(propertySubmissions, {
    fields: [submissionMedia.submissionId],
    references: [propertySubmissions.id],
  }),
}));

export const propertiesRelations = relations(properties, ({ many, one }) => ({
  media: many(propertyMedia),
  submission: one(propertySubmissions, {
    fields: [properties.submissionId],
    references: [propertySubmissions.id],
  }),
}));

export const propertyMediaRelations = relations(propertyMedia, ({ one }) => ({
  property: one(properties, {
    fields: [propertyMedia.propertyId],
    references: [properties.id],
  }),
}));

// Insert schemas
export const insertPropertySubmissionSchema = createInsertSchema(propertySubmissions).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
}).extend({
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Price must be a valid number"),
  rooms: z.number().min(1, "At least 1 room required"),
  bathrooms: z.number().min(1, "At least 1 bathroom required"),
  sizeM2: z.number().min(1, "Size must be greater than 0"),
  ownerEmail: z.string().email("Valid email required"),
  ownerPhone: z.string().min(8, "Valid phone number required"),
});

export const insertSubmissionMediaSchema = createInsertSchema(submissionMedia).omit({
  id: true,
  uploadedAt: true,
});

// Select types
export type PropertySubmission = typeof propertySubmissions.$inferSelect;
export type InsertPropertySubmission = z.infer<typeof insertPropertySubmissionSchema>;
export type Property = typeof properties.$inferSelect;
export type SubmissionMedia = typeof submissionMedia.$inferSelect;
export type PropertyMedia = typeof propertyMedia.$inferSelect;

// Extended types with relations for frontend
export type PropertySubmissionWithMedia = PropertySubmission & {
  media: SubmissionMedia[];
};

export type PropertyWithMedia = Property & {
  media: PropertyMedia[];
};
