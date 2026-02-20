import { drizzle } from "drizzle-orm/node-postgres";
import env from "@/env"

const db = drizzle(env.DATABASE_URL);

const result = await db.execute("select 1");

console.log(result);
