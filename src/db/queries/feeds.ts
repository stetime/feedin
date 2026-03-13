import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { db } from "../index";
import { feed, subscription } from "../schema";

export async function getFeedsByUserId(userId: string) {
	return db
		.select({
			feedId: feed.id,
			title: feed.title,
			url: feed.url,
			description: feed.description,
			image: feed.image,
		})
		.from(feed)
		.innerJoin(subscription, eq(subscription.feedId, feed.id))
		.where(eq(subscription.userId, userId));
}

export async function getFeedByUrl(url: string) {
	logger.debug(`querying the db for the url: ${url}`);
	return db.query.feed.findFirst({ where: eq(feed.url, url) });
}

export async function getFeedById(id: string) {
	logger.debug(`querying the db for a feed with id: ${id}`);
	return db.query.feed.findFirst({ where: eq(feed.id, id) });
}

export async function insertFeed(values: typeof feed.$inferInsert) {
	const [result] = await db.insert(feed).values(values).returning();
	return result;
}

export async function purgeFeed(id: string) {
	const [result] = await db.delete(feed).where(eq(feed.id, id)).returning();
	return result;
}

export async function updateFeedMeta(
	feedId: string,
	etag: string | null,
	lastModified: string | null,
) {
	await db
		.update(feed)
		.set({
			etag,
			lastModified,
			lastFetched: new Date(),
		})
		.where(eq(feed.id, feedId));
}
