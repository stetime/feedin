import { Hono } from "hono";
import { db } from "@/db";

export const debug = new Hono();

debug.get("/debug/users", async (c) => {
	const users = await db.query.user.findMany();
	return c.json(users);
});

debug.get("/debug/feeds", async (c) => {
	const feeds = await db.query.feed.findMany();
	return c.json(feeds);
});

debug.get("/debug/posts", async (c) => {
	const posts = await db.query.post.findMany();
	return c.json(posts);
});

debug.get("/debug/subscriptions", async (c) => {
	const subs = await db.query.subscription.findMany();
	return c.json(subs);
});
