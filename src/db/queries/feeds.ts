import { eq } from "drizzle-orm";
import { db } from "../index";
import { feed, subscription } from "../schema";

export async function getFeedsByUserId(userId: string) {
	return db
		.select({
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
	return db.query.feed.findFirst({ where: eq(feed.url, url) });
}

export async function insertFeed(values: typeof feed.$inferInsert) {
	const [result] = await db.insert(feed).values(values).returning();
	return result;
}

export async function purgeFeed(id: string) {
	const [result] = await db.delete(feed).where(eq(feed.id, id)).returning();
	return result;
}
