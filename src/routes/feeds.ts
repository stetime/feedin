import { Hono } from "hono";
import { z } from "zod";
import { getFeedByUrl, getFeedsByUserId } from "@/db/queries/feeds";
import { getSubscription } from "@/db/queries/subscriptions";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/middleware";
import type { AppContext } from "@/lib/types";

export const feeds = new Hono<AppContext>();
const postFeedSchema = z.object({
	url: z.url(),
});

feeds.get("/feeds", requireAuth, async (c) => {
	const user = c.get("user");
	if (!user) return c.json({ error: "unauthorized" }, 401);
	const userFeeds = await getFeedsByUserId(user.id);
	return c.json(userFeeds);
});

feeds.post("/feeds", requireAuth, async (c) => {
	const user = c.get("user");
	logger.debug("hitting the post");
	if (!user) return c.json({ error: "unauthorized" }, 401);
	const body: unknown = await c.req.json().catch(() => null);
	if (!body) return c.json({ error: "invalid or missing request body" }, 400);
	const validation = postFeedSchema.safeParse(body);
	if (!validation.success) {
		return c.json({ error: z.treeifyError(validation.error) }, 400);
	}
	const { url } = validation.data;
	const existingFeed = await getFeedByUrl(url);
	if (existingFeed) {
		const existingSub = await getSubscription(user.id, existingFeed.id);
		if (existingSub) {
			return c.json({ error: "already subscribed" }, 409);
		}
		// create a sub, return code 201
	}
	// it doesn't exist and we need to parse, insert and return it.
});
