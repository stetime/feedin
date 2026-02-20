import { ZodError, z } from "zod";

const EnvSchema = z.object({
	NODE_ENV: z.string().default("development"),
	BETTER_AUTH_SECRET: z.string(),
	BETTER_AUTH_URL: z.url(),
	DB_HOST: z.string(),
	DB_USER: z.string(),
	DB_PASSWORD: z.string(),
	DB_NAME: z.string(),
	DB_PORT: z.coerce.number(),
	DATABASE_URL: z.string(),
});

export type EnvSchema = z.infer<typeof EnvSchema>;

let env: EnvSchema;

try {
	env = EnvSchema.parse(process.env);
} catch (error) {
	if (error instanceof ZodError) {
		let message = "Missing required values in .env:\n";
		error.issues.forEach((issue) => {
			message += `${String(issue.path[0])}\n`;
		});
		throw new Error(message);
	}
	throw error;
}

export default env;
