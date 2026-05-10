import { Hono } from "hono";
import { pool } from "@/db";
import env from "@/env";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { debug } from "./routes/debug";
import { feeds } from "./routes/feeds";
import { posts } from "./routes/posts";

const app = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
}>();

app.use("*", async (c, next) => {
	const start = Date.now();
	await next();
	logger.info(
		{
			method: c.req.method,
			path: c.req.path,
			status: c.res.status,
			duration: Date.now() - start,
		},
		"request",
	);
});

app.use("*", async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session) {
		logger.debug("no session");
		c.set("user", null);
		c.set("session", null);
		await next();
		return;
	}

	c.set("user", session.user);
	c.set("session", session.session);
	await next();
});

app.on(["POST", "GET"], "/api/auth/*", (c) => {
	logger.debug("hitting auth handler");
	return auth.handler(c.req.raw);
});

app.route("/", feeds);
app.route("/", posts);

env.ENABLE_DEBUG_ROUTES && app.route("/", debug);

export default {
	port: env.API_PORT,
	fetch: app.fetch,
};

process.once("SIGINT", async () => {
	logger.debug("caught sigint, quitting");
	await pool.end();
	logger.debug("database connection closed");
	process.exit(0);
});
