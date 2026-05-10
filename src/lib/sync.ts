import { getFeedById, getFeedByUrl, updateFeedMeta } from "@/db/queries/feeds";
import { insertPosts } from "@/db/queries/posts";
import { logger } from "@/lib/logger";
import { fetchFeed, parse } from "./rss";

export async function syncFeed(feedId: string) {
	const feed = await getFeedById(feedId);
	if (!feed)
		throw new Error(`Attempted to sync non-existent feed with id ${feedId}`);
	logger.debug(`syncing feed ${feedId} / ${feed.title}`);
	logger.debug(
		`etags: ${feed.etag}, lastModified: ${feed.lastModified}, lastFetched: ${feed.lastFetched}`,
	);
	logger.debug(`running an update on ${feed.lastFetched}`);
	const result = await fetchFeed(feed.url, {
		etag: feed.etag,
		lastModified: feed.lastModified,
	});
	if (!result) {
		await updateFeedMeta(feed.id);
		return;
	}
	const parsed = parse(result.xml);
	// in the event a feed has no pubdates rely on db "on conflict do nothing"
	const newEntries =
		parsed.entries?.filter((entry) => {
			if (!entry.published || !feed.lastFetched) return true;
			return new Date(entry.published) > feed.lastFetched;
		}) ?? [];
	newEntries && logger.debug(newEntries);
	await insertPosts(feed.id, newEntries);
	const { etag, lastModified, finalUrl } = result;
	// handle edge case where two feeds redirect to the same place
	// TODO: if this is something that actually happens in prod, merge the feeds
	const existingFeed = await getFeedByUrl(finalUrl);
	const urlChanged = finalUrl !== feed.url;
	const urlCollision = existingFeed && existingFeed.id !== feed.id;
	if (urlCollision) {
		logger.warn(
			`url collision: feed ${feed.id} redirects to ${finalUrl} already claimed by feed ${existingFeed.id}`,
		);
	}
	await updateFeedMeta(feed.id, {
		etag,
		lastModified,
		url: urlChanged && !urlCollision ? finalUrl : undefined,
	});
}
