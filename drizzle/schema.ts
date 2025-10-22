import { pgEnum, pgTable, text, timestamp, varchar, integer, boolean, date } from "drizzle-orm/pg-core";

// Define enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const statusEnum = pgEnum("status", ["active", "completed"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Sessions table - tracks user journey through the values matrix
 */
export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  currentPage: integer("currentPage").default(1).notNull(),
  status: statusEnum("status").default("active").notNull(),
  comparisonsCompleted: integer("comparisonsCompleted").default(0),
  totalComparisons: integer("totalComparisons").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  completedAt: timestamp("completedAt"),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Core values table - stores all available values
 */
export const coreValues = pgTable("coreValues", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  isDefault: boolean("isDefault").default(true).notNull(),
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type CoreValue = typeof coreValues.$inferSelect;
export type InsertCoreValue = typeof coreValues.$inferInsert;

/**
 * Selected values table - tracks which values user selected for their session
 */
export const selectedValues = pgTable("selectedValues", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  valueId: varchar("valueId", { length: 64 }).notNull(),
  definition: text("definition"),
  initialScore: integer("initialScore").default(0),
  finalScore: integer("finalScore").default(0),
  rank: integer("rank"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type SelectedValue = typeof selectedValues.$inferSelect;
export type InsertSelectedValue = typeof selectedValues.$inferInsert;

/**
 * Initial comparisons table - tracks merge sort comparisons
 */
export const initialComparisons = pgTable("initialComparisons", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  value1Id: varchar("value1Id", { length: 64 }).notNull(),
  value2Id: varchar("value2Id", { length: 64 }).notNull(),
  selectedValueId: varchar("selectedValueId", { length: 64 }).notNull(),
  comparisonRound: integer("comparisonRound").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type InitialComparison = typeof initialComparisons.$inferSelect;
export type InsertInitialComparison = typeof initialComparisons.$inferInsert;

/**
 * Scenarios table - stores AI-generated scenarios for final comparisons
 */
export const scenarios = pgTable("scenarios", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  value1Id: varchar("value1Id", { length: 64 }).notNull(),
  value1Definition: text("value1Definition"),
  value2Id: varchar("value2Id", { length: 64 }).notNull(),
  value2Definition: text("value2Definition"),
  scenarioText: text("scenarioText").notNull(),
  selectedValueId: varchar("selectedValueId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type Scenario = typeof scenarios.$inferSelect;
export type InsertScenario = typeof scenarios.$inferInsert;

/**
 * Final results table - stores top 3 governing values
 */
export const finalResults = pgTable("finalResults", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  topValue1Id: varchar("topValue1Id", { length: 64 }).notNull(),
  topValue1Definition: text("topValue1Definition"),
  topValue2Id: varchar("topValue2Id", { length: 64 }).notNull(),
  topValue2Definition: text("topValue2Definition"),
  topValue3Id: varchar("topValue3Id", { length: 64 }).notNull(),
  topValue3Definition: text("topValue3Definition"),
  sentToGhl: boolean("sentToGhl").default(false),
  emailSent: boolean("emailSent").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type FinalResult = typeof finalResults.$inferSelect;
export type InsertFinalResult = typeof finalResults.$inferInsert;

/**
 * Daily quota table - tracks API usage per day
 */
export const dailyQuota = pgTable("dailyQuota", {
  id: varchar("id", { length: 64 }).primaryKey(),
  date: date("date").notNull(),
  scenariosGenerated: integer("scenariosGenerated").default(0).notNull(),
  quotaLimit: integer("quotaLimit").default(1500).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type DailyQuota = typeof dailyQuota.$inferSelect;
export type InsertDailyQuota = typeof dailyQuota.$inferInsert;

