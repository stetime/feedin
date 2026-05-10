import { Hono } from "hono";
import { z } from "zod";
import {
	getFeedById,
	getFeedByUrl,
	getFeedsByUserId,
	insertFeed,
	purgeFeed,
} from "@/db/queries/feeds";
import { insertPosts } from "@/db/queries/posts";
import {
	addSubscription,
	getSubscription,
	getSubscriptionCount,
	purgeSubscription,
} from "@/db/queries/subscriptions";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/middleware";
import { feedSanityCheck, fetchFeed, parse } from "@/lib/rss";
import type { AppContext } from "@/lib/types";

export const feeds = new Hono<AppContext>();
const postFeedSchema = z.object({
	url: z.url(),
});

const feedParamSchema = z.object({
	id: z.uuid(),
});

feeds.get("/feeds", requireAuth, async (c) => {
	const user = c.get("user");
	// biome-ignore lint/style/noNonNullAssertion: requireAuth confirms user exists
	const userFeeds = await getFeedsByUserId(user!.id);
	return c.json(userFeeds);
});

feeds.post("/feeds", requireAuth, async (c) => {
	const user = c.get("user");
	const body: unknown = await c.req.json().catch(() => null);
	if (!body) return c.json({ error: "invalid or missing request body" }, 400);
	const validation = postFeedSchema.safeParse(body);
	if (!validation.success) {
		return c.json({ error: z.treeifyError(validation.error) }, 400);
	}
	const { url } = validation.data;
	const existingFeed = await getFeedByUrl(url);
	if (existingFeed) {
		logger.debug("we hit an existing feed.");
		// biome-ignore lint/style/noNonNullAssertion: requireAuth confirms user exists
		const existingSub = await getSubscription(user!.id, existingFeed.id);
		if (existingSub) {
			logger.debug(`existing subscription found for this user and feed`);
			return c.json({ error: "already subscribed" }, 409);
		}
		// biome-ignore lint/style/noNonNullAssertion: requireAuth confirms user exists
		await addSubscription(user!.id, existingFeed.id);
		return c.json(existingFeed, 201);
	}
	const remoteFeed = await fetchFeed(url);
	if (!remoteFeed) return c.json({ error: "could not fetch feed" }, 400);
	const { xml, finalUrl } = remoteFeed;
	if (!feedSanityCheck(xml))
		return c.json({ error: "not a valid rss/atom feed" }, 400);
	const parsed = parse(xml);
	logger.debug(
		`parsed ${url} as ${parsed.title}, attempting to insert into the database`,
	);
	const insertedFeed = await insertFeed({
		url: finalUrl,
		title: parsed.title ?? (parsed.link as string),
		description: parsed.description,
		etag: remoteFeed.etag ?? undefined,
		lastModified: remoteFeed.lastModified ?? undefined,
		lastFetched: new Date(),
	});
	if (!insertedFeed) return c.json({ error: "failed to insert feed" }, 500);
	await insertPosts(insertedFeed.id, parsed.entries ?? []);
	// biome-ignore lint/style/noNonNullAssertion: requireAuth confirms user exists
	await addSubscription(user!.id, insertedFeed.id);
	// todo: register a job with the message queue
	return c.json(insertedFeed, 201);
});

feeds.delete("/feeds/:id", requireAuth, async (c) => {
	const user = c.get("user");
	const param = feedParamSchema.safeParse({ id: c.req.param("id") });
	if (!param.success) return c.json({ error: "invalid feed id" }, 400);
	const feedId = param.data.id;
	if (!(await getFeedById(feedId)))
		return c.json({ error: "no such feed" }, 404);
	// biome-ignore lint/style/noNonNullAssertion: requireAuth confirms user exists
	if (!(await getSubscription(user!.id, feedId)))
		return c.json({ error: "not subscribed to this feed" }, 401);
	if ((await getSubscriptionCount(feedId)) > 1) {
		// biome-ignore lint/style/noNonNullAssertion: requireAuth confirms user exists
		await purgeSubscription(user!.id, feedId);
		return c.json({ success: true });
	}
	await purgeFeed(feedId);
	return c.json({ success: true });
});
