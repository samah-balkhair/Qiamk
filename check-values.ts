import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { coreValues } from "./drizzle/schema";

async function checkValues() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);
  
  const values = await db.select().from(coreValues).limit(5);
  console.log(`Found ${values.length} values in database`);
  if (values.length > 0) {
    console.log("Sample values:", values.map(v => v.name).join(", "));
  }
}

checkValues().catch(console.error);
