import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  sessions,
  coreValues,
  selectedValues,
  initialComparisons,
  scenarios,
  finalResults,
  InsertSession,
  InsertCoreValue,
  InsertSelectedValue,
  InsertInitialComparison,
  InsertScenario,
  InsertFinalResult
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      id: user.id,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "phone"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role === undefined) {
      if (user.id === ENV.ownerId) {
        user.role = 'admin';
        values.role = 'admin';
        updateSet.role = 'admin';
      }
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Sessions
export async function createSession(data: InsertSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(sessions).values(data);
  return data;
}

export async function getSession(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateSession(id: string, data: Partial<InsertSession>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(sessions).set(data).where(eq(sessions.id, id));
}

// Core Values
export async function getAllCoreValues() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(coreValues);
}

export async function addCoreValue(data: InsertCoreValue) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(coreValues).values(data);
  return data;
}

export async function findValueByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(coreValues).where(eq(coreValues.name, name)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Selected Values
export async function addSelectedValue(data: InsertSelectedValue) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(selectedValues).values(data);
  return data;
}

export async function getSelectedValues(sessionId: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(selectedValues).where(eq(selectedValues.sessionId, sessionId));
}

export async function updateSelectedValue(id: string, data: Partial<InsertSelectedValue>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(selectedValues).set(data).where(eq(selectedValues.id, id));
}

export async function getSelectedValuesWithNames(sessionId: string) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: selectedValues.id,
      sessionId: selectedValues.sessionId,
      valueId: selectedValues.valueId,
      valueName: coreValues.name,
      definition: selectedValues.definition,
      initialScore: selectedValues.initialScore,
      finalScore: selectedValues.finalScore,
      rank: selectedValues.rank,
    })
    .from(selectedValues)
    .leftJoin(coreValues, eq(selectedValues.valueId, coreValues.id))
    .where(eq(selectedValues.sessionId, sessionId));
  
  return result;
}

export async function getTopSelectedValues(sessionId: string, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: selectedValues.id,
      sessionId: selectedValues.sessionId,
      valueId: selectedValues.valueId,
      valueName: coreValues.name,
      definition: selectedValues.definition,
      initialScore: selectedValues.initialScore,
      finalScore: selectedValues.finalScore,
      rank: selectedValues.rank,
    })
    .from(selectedValues)
    .leftJoin(coreValues, eq(selectedValues.valueId, coreValues.id))
    .where(eq(selectedValues.sessionId, sessionId))
    .orderBy(desc(selectedValues.initialScore))
    .limit(limit);
  
  return result;
}

// Initial Comparisons
export async function addInitialComparison(data: InsertInitialComparison) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(initialComparisons).values(data);
  return data;
}

export async function getInitialComparisons(sessionId: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(initialComparisons).where(eq(initialComparisons.sessionId, sessionId));
}

// Scenarios
export async function addScenario(data: InsertScenario) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(scenarios).values(data);
  return data;
}

export async function getScenarios(sessionId: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(scenarios).where(eq(scenarios.sessionId, sessionId));
}

export async function updateScenario(id: string, data: Partial<InsertScenario>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(scenarios).set(data).where(eq(scenarios.id, id));
}

// Final Results
export async function addFinalResult(data: InsertFinalResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(finalResults).values(data);
  return data;
}

export async function getFinalResult(sessionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(finalResults).where(eq(finalResults.sessionId, sessionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateFinalResult(id: string, data: Partial<InsertFinalResult>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(finalResults).set(data).where(eq(finalResults.id, id));
}


// Statistics
export async function getCompletedSessionsCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  try {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, "completed"));
    
    return result.length;
  } catch (error) {
    console.error("[Database] Failed to get completed sessions count:", error);
    return 0;
  }
}

