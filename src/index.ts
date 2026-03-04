import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "@/db";
import env from "@/env";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { feed, post, subscription } from "./db/schema";
import { feeds } from "./routes/feeds";

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

app.get("/", (c) => c.json({ message: "test" }));

app.get("/api/posts/:id", async (c) => {
	const id = c.req.param("id");
	if (!id) {
		return c.json({ message: "need an id" });
	}
	const posts = await db
		.select()
		.from(subscription)
		.innerJoin(feed, eq(subscription.feedId, feed.id))
		.leftJoin(post, eq(post.feedId, feed.id))
		.where(eq(subscription.userId, id))
		.orderBy(desc(post.publishedAt));
	return c.json(posts);
});

app.get("/api/posts", async (c) => {
	const user = c.get("user");
	if (!user) return c.body("go away", 401);
	const posts = await db
		.select()
		.from(subscription)
		.innerJoin(feed, eq(subscription.feedId, feed.id))
		.leftJoin(post, eq(post.feedId, feed.id))
		.where(eq(subscription.userId, user.id));
	return c.json(posts);
});

// app.get("/api/feeds", async (c) => {
// 	const user = c.get("user");
// 	if (!user) return c.body("no mate no", 401);
// 	const feeds = await db
// 		.select()
// 		.from(subscription)
// 		.innerJoin(feed, eq(subscription.feedId, feed.id))
// 		.where(eq(subscription.userId, user.id));
// 	return c.json(feeds);
// });

app.get("/test", async (c) => {
	const session = c.get("session");
	const user = c.get("user");
	if (!user) return c.body("no auth piss off", 401);
	logger.debug(user);
	return c.json({
		session,
		user,
	});
});

app.route("/", feeds);

export default {
	port: env.API_PORT,
	fetch: app.fetch,
};
