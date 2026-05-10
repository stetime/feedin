import { and, count, eq } from "drizzle-orm";
import { db } from "../index";
import { subscription } from "../schema";

export async function getSubscription(userId: string, feedId: string) {
	return db.query.subscription.findFirst({
		where: and(
			eq(subscription.userId, userId),
			eq(subscription.feedId, feedId),
		),
	});
}

export async function getSubscriptionCount(feedId: string) {
	const subs = await db
		.select({ count: count() })
		.from(subscription)
		.where(eq(subscription.feedId, feedId));
	return subs[0]?.count ?? 0;
}

export async function addSubscription(userId: string, feedId: string) {
	return db
		.insert(subscription)
		.values({ userId, feedId })
		.onConflictDoNothing()
		.returning();
}

export async function purgeSubscription(userId: string, feedId: string) {
	const [result] = await db
		.delete(subscription)
		.where(
			and(eq(subscription.userId, userId), eq(subscription.feedId, feedId)),
		)
		.returning();
	return result;
}
