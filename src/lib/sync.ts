import { getFeedById, updateFeedMeta } from "@/db/queries/feeds";
import { insertPosts } from "@/db/queries/posts";
import { fetchFeed, parse } from "./rss";

export async function syncFeed(feedId: string) {
	const feed = await getFeedById(feedId);
	if (!feed)
		throw new Error(`Attempted to sync non-existent feed with id ${feedId}`);
	const result = await fetchFeed(feed.url, {
		etag: feed.etag,
		lastModified: feed.lastModified,
	});
	if (!result) return;
	const parsed = parse(result.xml);
	// filter new entries but in the event a feed has no dates fallback on
	// onConflictDoNothing at the db end.
	const newEntries =
		parsed.entries?.filter((entry) => {
			if (!entry.published || !feed.lastFetched) return true;
			return new Date(entry.published) > feed.lastFetched;
		}) ?? [];
	await insertPosts(feed.id, newEntries);
	await updateFeedMeta(feed.id, result.etag, result.lastModified);
}
