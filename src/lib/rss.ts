import { arch, platform } from "node:os";
import {
	extractFromXml,
	type FeedData,
	type FeedEntry,
} from "@extractus/feed-extractor";
import { stripTags } from "@ndaidong/bellajs";
import { logger } from "@/lib/logger";

declare module "@extractus/feed-extractor" {
	interface FeedData {
		image?: {
			url: string;
		};
	}
	interface FeedEntry {
		enclosure?: {
			url: string;
			type: string;
			length?: number;
		};
		media?: {
			title: string;
			content: string;
			thumbnail: string;
			description: string;
		};
	}
}

type RawEnclosure = {
	"@_url": string;
	"@_type": string;
	"@_length": string;
};

interface RawMedia {
	"media:title"?: string;
	"@_content"?: string;
	"media:thumbnail"?: {
		"@_url"?: string;
	};
	"media:description"?: string;
}

type FeedHeaders = {
	etag?: string | null;
	lastModified?: string | null;
};

type FetchResult = {
	xml: string;
	etag: string | null;
	lastModified: string | null;
	finalUrl: string;
};

// initial pull

export async function add(url: string) {
	try {
		const controller = new AbortController();
		const id = setTimeout(() => controller.abort(), 10000);
		const res = await fetch(url, {
			redirect: "follow",
			verbose: true,
			signal: controller.signal,
			headers: {
				"User-Agent": `Feedin: Bun ${Bun.version} ${platform} ${arch}`,
			},
		});
		clearTimeout(id);
		if (!res.ok) {
			throw new Error(`status ${res.status} - couldnt fetch ${url}`);
		}
		logger.debug("fetch completed");
		if (res.redirected) {
			logger.debug(`at some point we got redirected: ${res.url}`);
			// update the url in the db with res.url
		}
		const xml = await res.text();
		if (!feedSanityCheck(xml)) {
			logger.debug("not a valid rss/atom/et cetera feed, aborting");
			return;
		}
		const parsed = parse(xml);
		return parsed;
	} catch (error) {
		error instanceof Error && logger.debug(error.message);
	}
}

export function parse(xml: string) {
	const extracted = extractFromXml(xml, {
		useISODateFormat: true,
		descriptionMaxLen: 0,
		xmlParserOptions: {
			ignoreNameSpace: false,
			ignoreAttributes: false,
		},
		getExtraFeedFields: (feedData: FeedData) => {
			return {
				image: feedData.image || "",
			};
		},
		getExtraEntryFields: (entry: {
			enclosure?: RawEnclosure;
			"media:group"?: RawMedia;
		}) => {
			const extra: Partial<FeedEntry> = {};
			const group = entry["media:group"];
			if (group) {
				extra.media = {
					title: group["media:title"] ?? "",
					content: group["@_content"] ?? "",
					thumbnail: group["media:thumbnail"]?.["@_url"] ?? "",
					description: stripTags(group["media:description"] ?? ""),
				};
			}
			if (entry.enclosure) {
				const enc = entry.enclosure;
				extra.enclosure = {
					url: enc["@_url"],
					type: enc["@_type"],
					length: Number(enc["@_length"]),
				};
			}
			return extra;
		},
	});
	return extracted;
}

export function feedSanityCheck(xml: string): boolean {
	logger.debug("running a sanity check");
	const head = xml.trimStart().slice(0, 500);
	if (
		!head.startsWith("<?xml") &&
		!head.startsWith("<rss") &&
		!head.startsWith("<feed") &&
		!head.startsWith("<rdf:RDF")
	)
		return false;

	if (/<html[\s]/i.test(head)) {
		return false;
	}

	return (
		head.includes("<rss") ||
		head.includes("<feed") ||
		head.includes("<rdf:RDF") ||
		head.includes("<channel>") ||
		head.includes('xmlns="http://www.w3.org/2005/Atom"')
	);
}

async function grabFeed(
	url: string,
	headers?: FeedHeaders,
): Promise<FetchResult | null> {
	const controller = new AbortController();
	const id = setTimeout(() => controller.abort(), 10000);
	let res: Response;
	try {
		logger.debug(`fetching url: ${url}`);
		res = await fetch(url, {
			redirect: "follow",
			verbose: true, // bun-only flag
			signal: controller.signal,
			headers: {
				"User-Agent": `Feedin - https://github.com/stetime/feedin`,
				...(headers?.etag && { "If-None-Match": headers.etag }),
				...(headers?.lastModified && {
					"If-Modified-Since": headers.lastModified,
				}),
			},
		});
	} finally {
		clearTimeout(id);
	}
	if (res.status === 304) {
		return null;
	}
	if (!res.ok) {
		throw new Error(`status ${res.status} - couldnt fetch ${url}`);
	}
	return {
		xml: await res.text(),
		etag: res.headers.get("etag"),
		lastModified: res.headers.get("last-modified"),
		finalUrl: res.url,
	};
}
