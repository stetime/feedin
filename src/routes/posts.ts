import { Hono } from "hono";
import { getAllPostsForUser } from "@/db/queries/posts";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/middleware";
import type { AppContext } from "@/lib/types";

export const posts = new Hono<AppContext>();

posts.get("/posts", requireAuth, async (c) => {
	const user = c.get("user");
	logger.debug("hit the posts route");
	// biome-ignore lint/style/noNonNullAssertion: user def exists
	const posts = await getAllPostsForUser(user!.id);
	logger.debug(posts);
	return c.json(posts);
});

posts.get("/posts/:id", requireAuth, async (c) => {
	const user = c.get("user");
});
