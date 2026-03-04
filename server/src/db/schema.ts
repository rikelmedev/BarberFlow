// drizzle/schema.ts
// Migrado de mysql-core → pg-core para Supabase (PostgreSQL)

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================================
// ENUMS
// ============================================================
export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "starter",
  "pro",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "inactive",
  "trialing",
  "canceled",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "completed",
  "canceled",
]);

// ============================================================
// PROFILES
// ============================================================
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().unique(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    logoUrl: text("logo_url"),
    bio: text("bio"),

    // Subscription
    subscriptionTier: subscriptionTierEnum("subscription_tier")
      .notNull()
      .default("starter"),
    subscriptionStatus: subscriptionStatusEnum("subscription_status")
      .notNull()
      .default("trialing"),
    subscriptionExpiresAt: timestamp("subscription_expires_at", {
      withTimezone: true,
    }),

    // Monthly appointment tracking
    monthlyAppointmentsUsed: integer("monthly_appointments_used")
      .notNull()
      .default(0),
    monthlyAppointmentsLimit: integer("monthly_appointments_limit")
      .notNull()
      .default(30), // 30 = starter; 2147483647 = pro (unlimited)
    currentMonthYear: text("current_month_year")
      .notNull()
      .default(sql`TO_CHAR(NOW(), 'YYYY-MM')`),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("profiles_slug_idx").on(t.slug),
    userIdIdx: uniqueIndex("profiles_user_id_idx").on(t.userId),
  })
);

// ============================================================
// PROFESSIONALS
// ============================================================
export const professionals = pgTable(
  "professionals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    bio: text("bio"),
    photoUrl: text("photo_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    profileIdIdx: index("professionals_profile_id_idx").on(t.profileId),
  })
);

// ============================================================
// SERVICES
// ============================================================
export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    durationMin: integer("duration_min").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    profileIdIdx: index("services_profile_id_idx").on(t.profileId),
  })
);

// ============================================================
// APPOINTMENTS
// ============================================================
export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),

    // Client info (no login required)
    clientName: text("client_name").notNull(),
    clientPhone: text("client_phone").notNull(),
    clientEmail: text("client_email"),

    // Scheduling
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: appointmentStatusEnum("status").notNull().default("pending"),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    profileIdIdx: index("appointments_profile_id_idx").on(t.profileId),
    professionalIdIdx: index("appointments_professional_id_idx").on(
      t.professionalId
    ),
    scheduledAtIdx: index("appointments_scheduled_at_idx").on(t.scheduledAt),
    statusIdx: index("appointments_status_idx").on(t.status),
  })
);

// ============================================================
// HAIRCUT PHOTOS
// ============================================================
export const haircutPhotos = pgTable(
  "haircut_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id").references(() => professionals.id, {
      onDelete: "set null",
    }),
    photoUrl: text("photo_url").notNull(),
    caption: text("caption"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    profileIdIdx: index("haircut_photos_profile_id_idx").on(t.profileId),
  })
);

// ============================================================
// RELATIONS
// ============================================================
export const profilesRelations = relations(profiles, ({ many }) => ({
  professionals: many(professionals),
  services: many(services),
  appointments: many(appointments),
  haircutPhotos: many(haircutPhotos),
}));

export const professionalsRelations = relations(
  professionals,
  ({ one, many }) => ({
    profile: one(profiles, {
      fields: [professionals.profileId],
      references: [profiles.id],
    }),
    appointments: many(appointments),
    haircutPhotos: many(haircutPhotos),
  })
);

export const servicesRelations = relations(services, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [services.profileId],
    references: [profiles.id],
  }),
  appointments: many(appointments),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  profile: one(profiles, {
    fields: [appointments.profileId],
    references: [profiles.id],
  }),
  professional: one(professionals, {
    fields: [appointments.professionalId],
    references: [professionals.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
}));

export const haircutPhotosRelations = relations(haircutPhotos, ({ one }) => ({
  profile: one(profiles, {
    fields: [haircutPhotos.profileId],
    references: [profiles.id],
  }),
  professional: one(professionals, {
    fields: [haircutPhotos.professionalId],
    references: [professionals.id],
  }),
}));

// ============================================================
// TYPE EXPORTS (Inferred from schema)
// ============================================================
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Professional = typeof professionals.$inferSelect;
export type NewProfessional = typeof professionals.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type HaircutPhoto = typeof haircutPhotos.$inferSelect;
export type NewHaircutPhoto = typeof haircutPhotos.$inferInsert;

// ============================================================
// SUBSCRIPTION TIER CONSTANTS
// ============================================================
export const SUBSCRIPTION_LIMITS = {
  starter: {
    monthlyAppointments: 30,
    label: "Starter",
    price: "R$ 49/mês",
  },
  pro: {
    monthlyAppointments: Infinity, // Stored as 2147483647 in DB
    label: "Pro",
    price: "R$ 99/mês",
  },
} as const;
