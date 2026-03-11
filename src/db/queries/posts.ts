import type { FeedEntry } from "@extractus/feed-extractor";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../index";
import { feed, post, subscription } from "../schema";

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

export async function getAllPostsForUser(userId: string) {
	const query = await db
		.select({
			id: post.id,
			title: post.title,
			url: post.url,
			content: post.content,
			enclosureUrl: post.enclosureUrl,
			enclosureType: post.enclosureType,
			enclosureLength: post.enclosureLength,
			mediaContent: post.mediaContent,
			mediaThumbnail: post.mediaThumbnail,
			image: post.image,
			publishedAt: post.publishedAt,
			feedTitle: feed.title,
			feedImage: feed.image,
			feedUrl: feed.url,
		})
		.from(subscription)
		.innerJoin(feed, eq(feed.id, subscription.feedId))
		.innerJoin(post, eq(post.feedId, feed.id))
		.where(eq(subscription.userId, userId))
		.orderBy(desc(post.publishedAt));
	return query;
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
	if (!entries.length) return;
	await db.insert(post).values(
		entries.map((entry) => ({
			feedId,
			guid: entry.id ?? entry.link ?? crypto.randomUUID(),
			title: entry.title,
			url: entry.link,
			content: entry.description ?? null,
			publishedAt: entry.published ? new Date(entry.published) : null,
			enclosureUrl: entry.enclosure?.url ?? null,
			enclosureType: entry.enclosure?.type ?? null,
			enclosureLength: entry.enclosure?.length ?? null,
			mediaThumbnail: entry.media?.thumbnail ?? null,
			mediaContent: entry.media?.content ?? null,
		})),
	);
}
