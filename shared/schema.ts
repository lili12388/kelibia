import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Property submissions table (private, only visible to broker)
export const propertySubmissions = pgTable("property_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  propertyType: text("property_type").notNull(), // Apartment, Studio, House, S+1, S+2, S+3
  floorLevel: text("floor_level"), // Rez-de-chaussée, 1er étage, 2ème étage, etc.
  isFurnished: boolean("is_furnished").notNull().default(false), // whether property is furnished
  hasLivingRoom: boolean("has_living_room").notNull().default(false), // whether property has a living room/salon
  hasFridge: boolean("has_fridge").notNull().default(false), // whether kitchen has a fridge
  hasGasStove: boolean("has_gas_stove").notNull().default(false), // whether house has a gas stove/cooker
  hasMicrowave: boolean("has_microwave").notNull().default(false),
  hasWashingMachine: boolean("has_washing_machine").notNull().default(false),
  hasCoffeeMaker: boolean("has_coffee_maker").notNull().default(false),
  hasBalcony: boolean("has_balcony").notNull().default(false),
  hasGarden: boolean("has_garden").notNull().default(false),
  hasLinens: boolean("has_linens").notNull().default(false),
  hasTowels: boolean("has_towels").notNull().default(false),
  tvType: text("tv_type").notNull().default("None"), // None, Standard, Smart TV
  numDoubleBeds: integer("num_double_beds").notNull().default(0),
  numSingleBeds: integer("num_single_beds").notNull().default(0),
  hasSofaBed: boolean("has_sofa_bed").notNull().default(false),
  bedDetails: text("bed_details"), // e.g. "1 lit double, 2 lits simples"
  locationRepere: text("location_repere"), // e.g. "5 min à pieds de la plage"
  nearbyCommodities: text("nearby_commodities"), // e.g. "Épicerie, Pharmacie à 200m"
  checkInTime: text("check_in_time").default("14:00"),
  checkOutTime: text("check_out_time").default("11:00"),
  cancellationPolicy: text("cancellation_policy"),
  houseRules: text("house_rules"), // e.g. "Non-fumeur, Pas d'animaux"
  description: text("description").notNull(),
  rooms: integer("rooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  sizeM2: integer("size_m2").notNull(),
  location: text("location").notNull(), // exact location within neighborhood
  googleMapsUrl: text("google_maps_url"), // Google Maps link to the property
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  pricePerWeek: decimal("price_per_week", { precision: 10, scale: 2 }),
  referenceCode: text("reference_code"), // e.g. REF-001
  distanceToBeach: text("distance_to_beach"), // e.g. "À 5 minutes à pied"
  maxGuests: integer("max_guests").notNull().default(1),
  hasAC: boolean("has_ac").notNull().default(false),
  hasWiFi: boolean("has_wifi").notNull().default(false),
  hasParking: boolean("has_parking").notNull().default(false),
  hasSeaView: boolean("has_sea_view").notNull().default(false),
  nearbyPlaces: text("nearby_places").default('[]'), // JSON string of nearby places
  neighborhoodMapUrl: text("neighborhood_map_url"), // URL to neighborhood map image (added by broker)
  ownerName: text("owner_name").notNull(),
  ownerEmail: text("owner_email").notNull(),
  ownerPhone: text("owner_phone").notNull(),
  // Admin visibility controls (what regular users can see) - granular per field
  showOwnerContact: boolean("show_owner_contact").notNull().default(false), // show owner contact to public users
  showGoogleMaps: boolean("show_google_maps").notNull().default(true), // show Google Maps link to public users
  showExactLocation: boolean("show_exact_location").notNull().default(false), // show exact address to public users
  showNeighborhoodMap: boolean("show_neighborhood_map").notNull().default(true), // show neighborhood map to public users
  showPrice: boolean("show_price").notNull().default(true), // show price to public users
  showRooms: boolean("show_rooms").notNull().default(true), // show room count to public users
  showBathrooms: boolean("show_bathrooms").notNull().default(true), // show bathroom count to public users
  showSize: boolean("show_size").notNull().default(true), // show size to public users
  showDescription: boolean("show_description").notNull().default(true), // show full description to public users
  hasKitchenUtensils: boolean("has_kitchen_utensils").notNull().default(false),
  isQuietNeighborhood: boolean("is_quiet_neighborhood").notNull().default(false),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
}, (table) => ({
  // Index on status column for faster queries
  statusIdx: index("property_submissions_status_idx").on(table.status),
}));

// Public properties table (approved listings visible to tenants)
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => propertySubmissions.id),
  title: text("title").notNull(),
  propertyType: text("property_type").notNull(), // Apartment, Studio, House, S+1, S+2, S+3
  floorLevel: text("floor_level"), // Rez-de-chaussée, 1er étage, 2ème étage, etc.
  isFurnished: boolean("is_furnished").notNull().default(false), // whether property is furnished
  hasLivingRoom: boolean("has_living_room").notNull().default(false), // whether property has a living room/salon
  hasFridge: boolean("has_fridge").notNull().default(false), // whether kitchen has a fridge
  hasGasStove: boolean("has_gas_stove").notNull().default(false), // whether house has a gas stove/cooker
  hasMicrowave: boolean("has_microwave").notNull().default(false),
  hasWashingMachine: boolean("has_washing_machine").notNull().default(false),
  hasCoffeeMaker: boolean("has_coffee_maker").notNull().default(false),
  hasBalcony: boolean("has_balcony").notNull().default(false),
  hasGarden: boolean("has_garden").notNull().default(false),
  hasLinens: boolean("has_linens").notNull().default(false),
  hasTowels: boolean("has_towels").notNull().default(false),
  tvType: text("tv_type").notNull().default("None"),
  numDoubleBeds: integer("num_double_beds").notNull().default(0),
  numSingleBeds: integer("num_single_beds").notNull().default(0),
  hasSofaBed: boolean("has_sofa_bed").notNull().default(false),
  bedDetails: text("bed_details"),
  locationRepere: text("location_repere"),
  nearbyCommodities: text("nearby_commodities"),
  checkInTime: text("check_in_time").default("14:00"),
  checkOutTime: text("check_out_time").default("11:00"),
  cancellationPolicy: text("cancellation_policy"),
  houseRules: text("house_rules"),
  description: text("description").notNull(),
  rooms: integer("rooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  sizeM2: integer("size_m2").notNull(),
  location: text("location").notNull(),
  googleMapsUrl: text("google_maps_url"), // Google Maps link to the property
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  pricePerWeek: decimal("price_per_week", { precision: 10, scale: 2 }),
  referenceCode: text("reference_code"),
  distanceToBeach: text("distance_to_beach"),
  maxGuests: integer("max_guests").notNull().default(1),
  hasAC: boolean("has_ac").notNull().default(false),
  hasWiFi: boolean("has_wifi").notNull().default(false),
  hasParking: boolean("has_parking").notNull().default(false),
  hasSeaView: boolean("has_sea_view").notNull().default(false),
  hasKitchenUtensils: boolean("has_kitchen_utensils").notNull().default(false),
  isQuietNeighborhood: boolean("is_quiet_neighborhood").notNull().default(false),
  nearbyPlaces: text("nearby_places").default('[]'),
  neighborhoodMapUrl: text("neighborhood_map_url"), // URL to neighborhood map image
  // Admin visibility controls (copied from submission) - granular per field
  showOwnerContact: boolean("show_owner_contact").notNull().default(false), // show owner contact to public users
  showGoogleMaps: boolean("show_google_maps").notNull().default(true), // show Google Maps link to public users
  showExactLocation: boolean("show_exact_location").notNull().default(false), // show exact address to public users
  showNeighborhoodMap: boolean("show_neighborhood_map").notNull().default(true), // show neighborhood map to public users
  showPrice: boolean("show_price").notNull().default(true), // show price to public users
  showRooms: boolean("show_rooms").notNull().default(true), // show room count to public users
  showBathrooms: boolean("show_bathrooms").notNull().default(true), // show bathroom count to public users
  showSize: boolean("show_size").notNull().default(true), // show size to public users
  showDescription: boolean("show_description").notNull().default(true), // show full description to public users
  displayOrder: integer("display_order"), // admin-controlled sort order (1 = first), null = at the end
  slug: text("slug").unique(),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
});

// Media files for submissions (images and videos)
export const submissionMedia = pgTable("submission_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => propertySubmissions.id),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"), // for videos, stores generated thumbnail
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
  thumbnailUrl: text("thumbnail_url"), // for videos, stores generated thumbnail
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

// Analytics tables
export const visitorLogs = pgTable("visitor_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  visitorIp: varchar("visitor_ip"), // hashed IP for unique visitor tracking
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  pageUrl: text("page_url").notNull(),
  propertyId: varchar("property_id"),
  tunisianCity: varchar("tunisian_city"),
  deviceType: varchar("device_type").notNull(), // 'desktop' or 'mobile'
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  timeOnPage: integer("time_on_page").default(0),
  contactClicked: boolean("contact_clicked").default(false),
});

export const propertyAnalytics = pgTable("property_analytics", {
  propertyId: varchar("property_id").primaryKey(),
  totalViews: integer("total_views").default(0),
  totalClicks: integer("total_clicks").default(0),
  desktopViews: integer("desktop_views").default(0),
  mobileViews: integer("mobile_views").default(0),
  lastViewedAt: timestamp("last_viewed_at"),
  cityViews: text("city_views").default('{}'), // JSON string
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siteAnalytics = pgTable("site_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull().unique(), // YYYY-MM-DD format
  totalVisitors: integer("total_visitors").default(0),
  totalPageViews: integer("total_page_views").default(0),
  uniqueSessions: integer("unique_sessions").default(0),
  desktopVisitors: integer("desktop_visitors").default(0),
  mobileVisitors: integer("mobile_visitors").default(0),
  cityBreakdown: text("city_breakdown").default('{}'), // JSON string
  createdAt: timestamp("created_at").defaultNow(),
});

// Reservations table for availability timeline
export const reservations = pgTable("reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"), // optional, partially masked for public
  startDate: text("start_date").notNull(), // YYYY-MM-DD format
  endDate: text("end_date").notNull(), // YYYY-MM-DD format
  status: text("status").notNull().default("pending"), // 'confirmed' or 'pending'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reservationsRelations = relations(reservations, ({ one }) => ({
  property: one(properties, {
    fields: [reservations.propertyId],
    references: [properties.id],
  }),
}));

// Insert schemas
export const insertPropertySubmissionSchema = createInsertSchema(propertySubmissions).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
}).extend({
  title: z.string().default(""),
  description: z.string().default(""),
  location: z.string().default(""),
  price: z.string().regex(/^(\d+(\.\d{1,2})?)?$/, "Price must be a valid number").default(""),
  pricePerWeek: z.string().regex(/^(\d+(\.\d{1,2})?)?$/, "Price must be a valid number").optional().default(""),
  rooms: z.number().min(0).default(1),
  bathrooms: z.number().min(0).default(1),
  maxGuests: z.number().min(0).default(1),
  sizeM2: z.number().min(0, "Size must be 0 or greater").default(0),
  ownerName: z.string().optional().default(""),
  ownerEmail: z.string().optional().default(""),
  ownerPhone: z.string().optional().default(""),
  bedDetails: z.string().nullable().optional(),
  locationRepere: z.string().nullable().optional(),
  nearbyCommodities: z.string().nullable().optional(),
  checkInTime: z.string().optional().default("14:00"),
  checkOutTime: z.string().optional().default("11:00"),
  cancellationPolicy: z.string().nullable().optional(),
  houseRules: z.string().nullable().optional(),
  tvType: z.string().default("None"),
  numDoubleBeds: z.number().min(0).default(0),
  numSingleBeds: z.number().min(0).default(0),
  hasSofaBed: z.boolean().default(false),
  showOwnerContact: z.boolean().default(false),
  showGoogleMaps: z.boolean().default(true),
  showExactLocation: z.boolean().default(false),
  showNeighborhoodMap: z.boolean().default(true),
  showPrice: z.boolean().default(true),
  showRooms: z.boolean().default(true),
  showBathrooms: z.boolean().default(true),
  showSize: z.boolean().default(true),
  showDescription: z.boolean().default(true),
  hasKitchenUtensils: z.boolean().default(false),
  isQuietNeighborhood: z.boolean().default(false),
});

export const insertSubmissionMediaSchema = createInsertSchema(submissionMedia).omit({
  id: true,
  uploadedAt: true,
});

export const insertReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  createdAt: true,
}).extend({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  status: z.enum(["confirmed", "pending"]),
});

// Select types
export type PropertySubmission = typeof propertySubmissions.$inferSelect;
export type InsertPropertySubmission = z.infer<typeof insertPropertySubmissionSchema>;
export type Property = typeof properties.$inferSelect;
export type SubmissionMedia = typeof submissionMedia.$inferSelect;
export type PropertyMedia = typeof propertyMedia.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = z.infer<typeof insertReservationSchema>;

// Extended types with relations for frontend
export type PropertySubmissionWithMedia = PropertySubmission & {
  media: SubmissionMedia[];
};

export type PropertyWithMedia = Property & {
  media: PropertyMedia[];
};

// Analytics types
export type VisitorLog = typeof visitorLogs.$inferSelect;
export type PropertyAnalytics = typeof propertyAnalytics.$inferSelect;
export type SiteAnalytics = typeof siteAnalytics.$inferSelect;

