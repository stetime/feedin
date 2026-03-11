import { and, desc, eq } from "drizzle-orm";
import { db } from "../index";
import { feed, post, subscription } from "../schema";
import type { FeedEntry } from "@extractus/feed-extractor";

export async function getAllPosts(userId: string) {
	const posts = await db
		.select()
		.from(subscription)
		.innerJoin(feed, eq(subscription.feedId, feed.id))
		.leftJoin(post, eq(post.feedId, feed.id))
		.where(eq(subscription.userId, userId))
		.orderBy(desc(post.publishedAt));
	return posts;
}

export async function getPostsByFeedId(feedId: string) {
	const posts = await db
		.select()
		.from(post)
		.where(eq(post.feedId, feedId))
		.orderBy(desc(post.publishedAt));
	return posts;
}

export async function insertPosts(feedId: string, entries: FeedEntry[]) {
  if (!entries.length) return
  await db.insert(post).values(
    entries.map(entry => ({
      feedId,
      guid: entry.id ?? entry.link ?? crypto.randomUUID(),
      title: entry.title,
      url: entry.link,
      content: entry.description ?? null,
    }))
  )
}