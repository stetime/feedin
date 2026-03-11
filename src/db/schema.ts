import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const feed = pgTable("feed", {
	id: uuid("id").primaryKey().defaultRandom(),
	url: text("url").notNull().unique(),
	title: text("title").notNull(),
	description: text("description"),
	image: text("image"),
	etag: text("etag"),
	lastModified: text("last_modified"),
	lastFetched: timestamp("last_fetched"),
	fetchIntervalMs: integer("fetch_interval_ms").default(3600000).notNull(),
	createdAt: timestamp("created_at")
		.$defaultFn(() => new Date())
		.notNull(),
});

export const post = pgTable(
	"post",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		title: text("title"),
		feedId: uuid("feed_id")
			.notNull()
			.references(() => feed.id, { onDelete: "cascade" }),
		guid: text("guid").notNull(),
		url: text("url"),
		content: text("content"),
		image: text("image"),
		publishedAt: timestamp("published_at"),
		createdAt: timestamp("created_at")
			.$default(() => new Date())
			.notNull(),
		enclosureUrl: text("enclosure_url"),
		enclosureType: text("enclosure_type"),
		enclosureLength: integer("enclosure_length"),
		mediaThumbnail: text("media_thumbnail"),
		mediaContent: text("media_content"),
	},
	(t) => [uniqueIndex("post_feed_guid_idx").on(t.feedId, t.guid)],
);

export const subscription = pgTable(
	"subscription",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		feedId: uuid("feed_id")
			.notNull()
			.references(() => feed.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at")
			.$defaultFn(() => new Date())
			.notNull(),
	},
	(t) => [uniqueIndex("subscription_user_feed_idx").on(t.userId, t.feedId)],
);

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified")
		.$defaultFn(() => false)
		.notNull(),
	image: text("image"),
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").$defaultFn(
		() => /* @__PURE__ */ new Date(),
	),
	updatedAt: timestamp("updated_at").$defaultFn(
		() => /* @__PURE__ */ new Date(),
	),
});
