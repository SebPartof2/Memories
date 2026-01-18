import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Users table - synced from S-Auth
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // S-Auth subject ID
  email: text("email").notNull(),
  name: text("name"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Trips table
export const trips = sqliteTable("trips", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  startDate: text("start_date"), // ISO date string
  endDate: text("end_date"), // ISO date string
  coverPhotoId: text("cover_photo_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Cities table
export const cities = sqliteTable("cities", {
  id: text("id").primaryKey(),
  tripId: text("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  country: text("country"),
  mapboxId: text("mapbox_id"), // Mapbox place ID
  latitude: text("latitude"), // Stored as text for precision
  longitude: text("longitude"),
  startDate: text("start_date"), // ISO date string
  endDate: text("end_date"), // ISO date string
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Photos table
export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  cityId: text("city_id")
    .notNull()
    .references(() => cities.id, { onDelete: "cascade" }),
  uploadedBy: text("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  r2Key: text("r2_key").notNull(), // R2 object key
  filename: text("filename").notNull(),
  caption: text("caption"),
  takenAt: integer("taken_at", { mode: "timestamp" }),
  latitude: text("latitude"), // GPS latitude from EXIF
  longitude: text("longitude"), // GPS longitude from EXIF
  cameraMake: text("camera_make"), // Camera manufacturer
  cameraModel: text("camera_model"), // Camera model
  width: integer("width"),
  height: integer("height"),
  sizeBytes: integer("size_bytes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  trips: many(trips),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  user: one(users, {
    fields: [trips.userId],
    references: [users.id],
  }),
  cities: many(cities),
  coverPhoto: one(photos, {
    fields: [trips.coverPhotoId],
    references: [photos.id],
  }),
}));

export const citiesRelations = relations(cities, ({ one, many }) => ({
  trip: one(trips, {
    fields: [cities.tripId],
    references: [trips.id],
  }),
  photos: many(photos),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  city: one(cities, {
    fields: [photos.cityId],
    references: [cities.id],
  }),
  uploader: one(users, {
    fields: [photos.uploadedBy],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type City = typeof cities.$inferSelect;
export type NewCity = typeof cities.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
