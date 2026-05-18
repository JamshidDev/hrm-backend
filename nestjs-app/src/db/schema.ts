import { pgTable, index, bigserial, varchar, text, timestamp, bigint, json, uuid, jsonb, boolean, integer, foreignKey, unique, smallint, date, doublePrecision, macaddr, inet, check, serial, numeric, time, uniqueIndex, primaryKey, pgSequence } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"


export const terminal_events_partitioned_id_seq = pgSequence("terminal_events_partitioned_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })
export const turnstile_worker_schedule_breaks_id_seq = pgSequence("turnstile_worker_schedule_breaks_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })
export const turnstile_worker_schedules_id_seq = pgSequence("turnstile_worker_schedules_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })

export const app_instructions = pgTable("app_instructions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	menu: varchar({ length: 50 }).notNull(),
	sub_menu: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 255 }),
	title_ru: varchar({ length: 255 }),
	title_en: varchar({ length: 255 }),
	text: text(),
	text_ru: text(),
	text_en: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.menu.asc().nullsLast().op("text_ops")),
	index().using("btree", table.sub_menu.asc().nullsLast().op("text_ops")),
]);

export const activity_log = pgTable("activity_log", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	log_name: varchar({ length: 255 }),
	description: text().notNull(),
	subject_type: varchar({ length: 255 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	subject_id: bigint({ mode: "number" }),
	causer_type: varchar({ length: 255 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	causer_id: bigint({ mode: "number" }),
	properties: json(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	event: varchar({ length: 255 }),
	batch_uuid: uuid(),
}, (table) => [
	index().using("btree", table.log_name.asc().nullsLast().op("text_ops")),
	index("causer").using("btree", table.causer_type.asc().nullsLast().op("int8_ops"), table.causer_id.asc().nullsLast().op("text_ops")),
	index("subject").using("btree", table.subject_type.asc().nullsLast().op("int8_ops"), table.subject_id.asc().nullsLast().op("int8_ops")),
]);

export const chat_news_categories = pgTable("chat_news_categories", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: jsonb().notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
});

export const authentication_log = pgTable("authentication_log", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	authenticatable_type: varchar({ length: 255 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	authenticatable_id: bigint({ mode: "number" }).notNull(),
	ip_address: varchar({ length: 45 }),
	user_agent: text(),
	login_at: timestamp({ mode: 'string' }),
	login_successful: boolean().default(false).notNull(),
	logout_at: timestamp({ mode: 'string' }),
	cleared_by_user: boolean().default(false).notNull(),
	location: json(),
}, (table) => [
	index("authentication_log_authenticatable_type_authenticatable_id_inde").using("btree", table.authenticatable_type.asc().nullsLast().op("int8_ops"), table.authenticatable_id.asc().nullsLast().op("int8_ops")),
]);

export const cache = pgTable("cache", {
	key: varchar({ length: 255 }).primaryKey().notNull(),
	value: text().notNull(),
	expiration: integer().notNull(),
});

export const cache_locks = pgTable("cache_locks", {
	key: varchar({ length: 255 }).primaryKey().notNull(),
	owner: varchar({ length: 255 }).notNull(),
	expiration: integer().notNull(),
});

export const chat_news = pgTable("chat_news", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	slug: varchar({ length: 255 }).notNull(),
	status: smallint().notNull(),
	published_at: timestamp({ mode: 'string' }),
	is_pinned: boolean().default(false).notNull(),
	views_count: integer().default(0).notNull(),
	likes_count: integer().default(0).notNull(),
	dislikes_count: integer().default(0).notNull(),
	comments_count: integer().default(0).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.is_pinned.asc().nullsLast().op("bool_ops")),
	index().using("btree", table.organization_id.asc().nullsLast().op("int2_ops"), table.status.asc().nullsLast().op("int2_ops"), table.published_at.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.status.asc().nullsLast().op("int2_ops"), table.published_at.asc().nullsLast().op("int2_ops")),
	unique("chat_news_slug_unique").on(table.slug),
]);

export const chat_categories_news = pgTable("chat_categories_news", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	chat_news_category_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	chat_news_id: bigint({ mode: "number" }).notNull(),
}, (table) => [
]);

export const chat_news_likes = pgTable("chat_news_likes", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	chat_news_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	reaction: smallint(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
}, (table) => [
	unique("chat_news_likes_chat_news_id_user_id_unique").on(table.chat_news_id, table.user_id),
]);

export const chat_news_media = pgTable("chat_news_media", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	chat_news_id: bigint({ mode: "number" }).notNull(),
	type: varchar({ length: 10 }).notNull(),
	path: varchar({ length: 255 }),
	size: integer(),
	extension: varchar({ length: 10 }),
	order: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.order.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const buildings = pgTable("buildings", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
});

export const command_confirmations = pgTable("command_confirmations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	command_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	position: text(),
	type: varchar({ length: 2 }).notNull(),
	file: varchar({ length: 255 }),
	signature: text(),
	order: smallint().default(sql`'1'`).notNull(),
	main: boolean().default(false).notNull(),
	confirmation_type: smallint().default(sql`'1'`).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
	index("idx_command_confirmations_command_id_type").using("btree", table.command_id.asc().nullsLast().op("int8_ops"), table.type.asc().nullsLast().op("int8_ops")),
]);

export const command_types = pgTable("command_types", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	type: smallint().notNull(),
	file: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.type.asc().nullsLast().op("int2_ops")),
]);

export const chat_news_views = pgTable("chat_news_views", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	chat_news_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
}, (table) => [
	unique("chat_news_views_chat_news_id_user_id_unique").on(table.chat_news_id, table.user_id),
]);

export const chat_user_emoji = pgTable("chat_user_emoji", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	from_user_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	to_user_id: bigint({ mode: "number" }).notNull(),
	text: varchar({ length: 100 }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const cities = pgTable("cities", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	region_id: bigint({ mode: "number" }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	lat: varchar({ length: 30 }),
	long: varchar({ length: 30 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const confirmation_workers = pgTable("confirmation_workers", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	level: smallint().default(sql`'1'`).notNull(),
	position: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const contracts = pgTable("contracts", {
	uuid: uuid().notNull(),
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	director_id: bigint({ mode: "number" }),
	command_status: smallint().default(sql`'1'`).notNull(),
	number: varchar({ length: 100 }),
	contract_date: date(),
	contract_to_date: date(),
	table_number: integer(),
	file: varchar({ length: 255 }),
	confirmation_file: varchar({ length: 255 }),
	generate: smallint().default(sql`'1'`).notNull(),
	type: smallint().default(sql`'1'`).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	confirmation: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.confirmation.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.contract_date.asc().nullsLast().op("date_ops")),
	index().using("btree", table.contract_to_date.asc().nullsLast().op("date_ops")),
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("int2_ops")),
	index("idx_contracts_org_date_worker").using("btree", table.organization_id.asc().nullsLast().op("date_ops"), table.contract_date.asc().nullsLast().op("date_ops"), table.worker_id.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_contracts_worker_date").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.contract_date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
]);

export const contract_types = pgTable("contract_types", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	type: smallint().notNull(),
	file: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.type.asc().nullsLast().op("int2_ops")),
]);

export const contract_additional_types = pgTable("contract_additional_types", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	type: smallint().notNull(),
	file: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.type.asc().nullsLast().op("int2_ops")),
]);

export const department_positions = pgTable("department_positions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	department_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	position_id: bigint({ mode: "number" }),
	sort: integer().default(1).notNull(),
	group: smallint().default(sql`'0'`).notNull(),
	rank: varchar({ length: 3 }),
	max_rank: varchar({ length: 3 }),
	rate: integer().default(100).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	salary: bigint({ mode: "number" }),
	experience: integer().default(0).notNull(),
	education: smallint().default(sql`'1'`).notNull(),
	external: integer(),
	active: boolean().default(true).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	status: smallint().default(sql`'1'`).notNull(),
	changed_status: smallint().default(sql`'1'`).notNull(),
}, (table) => [
	index().using("btree", table.changed_status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.rate.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.sort.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
]);

export const contract_confirmations = pgTable("contract_confirmations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	contract_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	position: varchar({ length: 255 }),
	type: varchar({ length: 2 }).notNull(),
	file: varchar({ length: 255 }),
	signature: text(),
	order: smallint().default(sql`'1'`).notNull(),
	main: boolean().default(false).notNull(),
	confirmation_type: smallint().default(sql`'1'`).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const department_locations = pgTable("department_locations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	department_id: bigint({ mode: "number" }).notNull(),
	geo_type: boolean().default(false).notNull(),
	lat: doublePrecision().notNull(),
	lng: doublePrecision().notNull(),
	radius: integer().default(30).notNull(),
	polygon: json(),
	accuracy_limit: integer(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.geo_type.asc().nullsLast().op("bool_ops")),
]);

export const countries = pgTable("countries", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	lat: varchar({ length: 30 }),
	long: varchar({ length: 30 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_country_deleted_at_null").using("btree", table.id.asc().nullsLast().op("int8_ops")).where(sql`(deleted_at IS NULL)`),
]);

export const document_chats = pgTable("document_chats", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	model_id: bigint({ mode: "number" }).notNull(),
	model_type: varchar({ length: 255 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sender_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	recipient_id: bigint({ mode: "number" }).notNull(),
	message: text().notNull(),
	read_at: timestamp({ mode: 'string' }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const document_files = pgTable("document_files", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	model_id: bigint({ mode: "number" }).notNull(),
	model_type: varchar({ length: 255 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_application_id: bigint({ mode: "number" }),
	file: varchar({ length: 255 }),
	original_name: varchar({ length: 255 }),
	size: integer(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const document_histories = pgTable("document_histories", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	model_id: bigint({ mode: "number" }).notNull(),
	model_type: varchar({ length: 255 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	file: varchar({ length: 255 }),
	status: smallint().default(sql`'1'`).notNull(),
	description: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
]);

export const economist_telegram_users = pgTable("economist_telegram_users", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	bot_token: varchar({ length: 255 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	chat_id: bigint({ mode: "number" }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
}, (table) => [
]);

export const edu_plan_exams = pgTable("edu_plan_exams", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	edu_plan_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lesson_id: bigint({ mode: "number" }),
	exam_type: smallint().default(sql`'3'`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	exam_id: bigint({ mode: "number" }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const deploy_logs = pgTable("deploy_logs", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	version: varchar({ length: 5 }).notNull(),
	changes: text(),
	type: varchar({ length: 5 }).default('front').notNull(),
	path: varchar({ length: 255 }),
	published: boolean().default(false).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
	unique("deploy_logs_version_unique").on(table.version),
]);

export const economist_uploads = pgTable("economist_uploads", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	type: smallint().default(sql`'1'`).notNull(),
	file: varchar({ length: 255 }),
	year: integer().notNull(),
	month: smallint().notNull(),
	day: smallint().default(sql`'1'`).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	comment: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	done: smallint().default(sql`'1'`),
}, (table) => [
	index().using("btree", table.day.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.month.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops")),
]);

export const directions = pgTable("directions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
});

export const exam_positions = pgTable("exam_positions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	exam_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	position_id: bigint({ mode: "number" }),
}, (table) => [
]);

export const exam_tests = pgTable("exam_tests", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	exam_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	exam_category_id: bigint({ mode: "number" }),
	count: integer().default(5).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const exam_category_questions = pgTable("exam_category_questions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	exam_category_id: bigint({ mode: "number" }),
	ques: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const exam_video_chunks = pgTable("exam_video_chunks", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	exam_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_exam_id: bigint({ mode: "number" }).notNull(),
	path: varchar({ length: 255 }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const exam_workers = pgTable("exam_workers", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	exam_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
}, (table) => [
]);

export const groups = pgTable("groups", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	learning_center_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	edu_plan_id: bigint({ mode: "number" }).notNull(),
	code: integer().notNull(),
	name: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const group_workers = pgTable("group_workers", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	group_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }).notNull(),
}, (table) => [
]);

export const hik_central_devices = pgTable("hik_central_devices", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 50 }),
	hik_central_device_id: integer(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	area_name: varchar({ length: 255 }),
	last_sync: timestamp({ mode: 'string' }),
	events_count: integer().default(0).notNull(),
	status: boolean().default(true).notNull(),
}, (table) => [
	index("hcp_last_sync_index").using("btree", table.last_sync.asc().nullsLast().op("timestamp_ops")),
	index().using("btree", table.hik_central_device_id.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.name.asc().nullsLast().op("text_ops")),
	unique("hik_central_devices_pk").on(table.hik_central_device_id),
]);

export const failed_jobs = pgTable("failed_jobs", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	uuid: varchar({ length: 255 }).notNull(),
	connection: text().notNull(),
	queue: text().notNull(),
	payload: text().notNull(),
	exception: text().notNull(),
	failed_at: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	unique("failed_jobs_uuid_unique").on(table.uuid),
]);

export const hik_central_access_levels = pgTable("hik_central_access_levels", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	hik_central_key: smallint().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	name: varchar({ length: 255 }),
	description: varchar({ length: 255 }),
	devices_count: smallint().default(sql`'0'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_department_id: bigint({ mode: "number" }),
	devices: varchar({ length: 255 }),
}, (table) => [
	unique("unique_hik_central_access_levels").on(table.hik_central_key, table.hik_central_access_level_id),
]);

export const h_c_p_error_logs = pgTable("h_c_p_error_logs", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	time: bigint({ mode: "number" }).notNull(),
	path: varchar({ length: 255 }),
	status: boolean().default(false).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	unique("h_c_p_error_logs_time_unique").on(table.time),
]);

export const hcp_added_worker_logs = pgTable("hcp_added_worker_logs", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_photo_id: bigint({ mode: "number" }).notNull(),
	status: varchar({ length: 15 }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
}, (table) => [
]);

export const hmac_users = pgTable("hmac_users", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	public_key: varchar({ length: 255 }).notNull(),
	secret_key: text().notNull(),
	secret_type: varchar({ length: 20 }).notNull(),
	is_active: boolean().default(true).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("public_key_secret_type").using("btree", table.public_key.asc().nullsLast().op("text_ops"), table.secret_type.asc().nullsLast().op("text_ops")),
	unique("hmac_users_public_key_unique").on(table.public_key),
]);

export const export_worker_to_hik_central_jobs = pgTable("export_worker_to_hik_central_jobs", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	name: varchar({ length: 255 }),
	workers_count: integer().default(0).notNull(),
	exported_count: integer().default(0).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	errors: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const h_c_p_device_events = pgTable("h_c_p_device_events", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sync_h_c_p_access_log_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_device_id: bigint({ mode: "number" }).notNull(),
	start_time: timestamp({ mode: 'string' }),
	end_time: timestamp({ mode: 'string' }),
	events_count: integer().default(0).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.end_time.asc().nullsLast().op("timestamp_ops")),
	index().using("btree", table.start_time.asc().nullsLast().op("timestamp_ops")),
]);

export const h_c_p_devices = pgTable("h_c_p_devices", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	device_id: bigint({ mode: "number" }),
	name: varchar({ length: 255 }).notNull(),
	device_code: varchar({ length: 255 }),
	serial_number: varchar({ length: 255 }),
	mac_address: macaddr(),
	ip_address: inet(),
	status: boolean().default(true).notNull(),
	config: boolean().default(false).notNull(),
	log: boolean().default(false).notNull(),
	upload_workers: boolean().default(false).notNull(),
	contract_number: varchar({ length: 255 }),
	contract_date: date(),
	price: doublePrecision(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	unique("h_c_p_devices_device_id_unique").on(table.device_id),
]);

export const hik_central_access_level_devices = pgTable("hik_central_access_level_devices", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_device_id: bigint({ mode: "number" }).notNull(),
}, (table) => [
]);

export const hik_central_departments = pgTable("hik_central_departments", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 255 }),
	hik_central_department_id: integer(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	unique("hik_central_departments_pk").on(table.hik_central_department_id),
]);

export const holidays = pgTable("holidays", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	type: smallint().default(sql`'1'`).notNull(),
	name: varchar({ length: 255 }),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	holiday_date: date().notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
});

export const integration_api_logs = pgTable("integration_api_logs", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	secret: varchar({ length: 50 }),
	endpoint: varchar({ length: 255 }),
	method: varchar({ length: 10 }),
	api_type: varchar({ length: 255 }).default('sanctum').notNull(),
	request_headers: jsonb(),
	request_body: jsonb(),
	response_status: integer(),
	response_headers: jsonb(),
	response_body: jsonb(),
	error: text(),
	duration_ms: integer(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	model_id: bigint({ mode: "number" }),
	model_type: varchar({ length: 255 }),
}, (table) => [
	check("integration_api_logs_api_type_check", sql`(api_type)::text = ANY (ARRAY[('hmac'::character varying)::text, ('sanctum'::character varying)::text, ('jwt'::character varying)::text, ('oauth'::character varying)::text])`),
]);

export const learning_center_users = pgTable("learning_center_users", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	learning_center_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	status: boolean().default(true).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const job_batches = pgTable("job_batches", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	total_jobs: integer().notNull(),
	pending_jobs: integer().notNull(),
	failed_jobs: integer().notNull(),
	failed_job_ids: text().notNull(),
	options: text(),
	cancelled_at: integer(),
	created_at: integer().notNull(),
	finished_at: integer(),
});

export const jobs = pgTable("jobs", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	queue: varchar({ length: 255 }).notNull(),
	payload: text().notNull(),
	attempts: smallint().notNull(),
	reserved_at: integer(),
	available_at: integer().notNull(),
	created_at: integer().notNull(),
}, (table) => [
	index().using("btree", table.queue.asc().nullsLast().op("text_ops")),
]);

export const integration_worker_requests = pgTable("integration_worker_requests", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	request: text(),
	status: smallint().default(sql`'200'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const learning_centers = pgTable("learning_centers", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	code: varchar({ length: 7 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	director_id: bigint({ mode: "number" }),
}, (table) => [
]);

export const lms_certificate_confirmations = pgTable("lms_certificate_confirmations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lms_certificate_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	position: varchar({ length: 255 }),
	type: varchar({ length: 2 }).notNull(),
	file: varchar({ length: 255 }),
	signature: text(),
	order: smallint().default(sql`'1'`).notNull(),
	main: boolean().default(false).notNull(),
	confirmation_type: smallint().default(sql`'1'`).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const languages = pgTable("languages", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 80 }).notNull(),
	name_ru: varchar({ length: 80 }).notNull(),
	name_en: varchar({ length: 80 }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
});

export const lesson_participants = pgTable("lesson_participants", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lesson_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	meeting_id: bigint({ mode: "number" }),
	joined_at: timestamp({ mode: 'string' }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const liveness_sessions = pgTable("liveness_sessions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	session_id: uuid().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	status: varchar({ length: 255 }).default('started').notNull(),
	success: boolean().default(false).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	device_uuid: varchar({ length: 255 }),
	type: varchar({ length: 10 }),
	refImage: text(),
	liveImage: text(),
	face_status: varchar({ length: 10 }),
	payload: json(),
}, (table) => [
	index().using("btree", table.device_uuid.asc().nullsLast().op("text_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
	unique("liveness_sessions_session_id_unique").on(table.session_id),
]);

export const lms_protocol_worker_exams = pgTable("lms_protocol_worker_exams", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	uuid: uuid().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lms_protocol_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_exam_id: bigint({ mode: "number" }).notNull(),
	number: varchar({ length: 15 }),
	file: varchar({ length: 255 }),
	confirmation_file: varchar({ length: 255 }),
	confirmation: smallint().default(sql`'1'`).notNull(),
	generate: smallint().default(sql`'2'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.confirmation.asc().nullsLast().op("int2_ops")),
]);

export const material_lessons = pgTable("material_lessons", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	material_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lesson_id: bigint({ mode: "number" }).notNull(),
}, (table) => [
]);

export const lms_protocol_confirmations = pgTable("lms_protocol_confirmations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lms_protocol_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	position: varchar({ length: 255 }),
	type: varchar({ length: 2 }).notNull(),
	file: varchar({ length: 255 }),
	signature: text(),
	order: smallint().default(sql`'1'`).notNull(),
	main: boolean().default(false).notNull(),
	confirmation_type: smallint().default(sql`'1'`).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const message_archives = pgTable("message_archives", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	type: varchar({ length: 20 }).notNull(),
	message: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const migrations = pgTable("migrations", {
	id: serial().primaryKey().notNull(),
	migration: varchar({ length: 255 }).notNull(),
	batch: integer().notNull(),
});

export const mobile_versions = pgTable("mobile_versions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	platform: varchar({ length: 255 }).notNull(),
	latest_version: varchar({ length: 255 }).notNull(),
	min_supported_version: varchar({ length: 255 }).notNull(),
	force_update: boolean().default(false).notNull(),
	store_url: varchar({ length: 255 }),
	download_url: varchar({ length: 255 }),
	is_active: boolean().default(true).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
});

export const oauth_client_codes = pgTable("oauth_client_codes", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	oauth_client_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	code: varchar({ length: 255 }).notNull(),
	expires_at: timestamp({ mode: 'string' }).notNull(),
	scope: varchar({ length: 255 }).notNull(),
	state: varchar({ length: 255 }).notNull(),
	used: boolean().default(false).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.scope.asc().nullsLast().op("text_ops")),
	index().using("btree", table.state.asc().nullsLast().op("text_ops")),
]);

export const nationalities = pgTable("nationalities", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 50 }).notNull(),
	name_ru: varchar({ length: 50 }),
	name_en: varchar({ length: 50 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
});

export const lms_protocols = pgTable("lms_protocols", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	uuid: uuid().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	edu_plan_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	group_id: bigint({ mode: "number" }),
	protocol_date: date(),
	cert_from: date(),
	cert_to: date(),
	number: integer(),
	file: varchar({ length: 255 }),
	confirmation_file: varchar({ length: 255 }),
	confirmation: smallint().default(sql`'1'`).notNull(),
	generate: smallint().default(sql`'2'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.cert_from.asc().nullsLast().op("date_ops")),
	index().using("btree", table.cert_to.asc().nullsLast().op("date_ops")),
	index().using("btree", table.confirmation.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.protocol_date.asc().nullsLast().op("date_ops")),
]);

export const materials = pgTable("materials", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	learning_center_id: bigint({ mode: "number" }).notNull(),
	type: smallint().default(sql`'3'`).notNull(),
	file_path: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const meds = pgTable("meds", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	status: smallint().default(sql`'1'`).notNull(),
	from: date(),
	to: date(),
	file: varchar({ length: 255 }),
	comment: text(),
	current: boolean().default(true).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("meds_worker_to_inc_idx").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.to.desc().nullsFirst().op("date_ops"), table.id.asc().nullsLast().op("date_ops")),
	unique("unique_worker_med_date").on(table.worker_id, table.from),
]);

export const notifications = pgTable("notifications", {
	id: uuid().primaryKey().notNull(),
	type: varchar({ length: 255 }).notNull(),
	notifiable_type: varchar({ length: 255 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	notifiable_id: bigint({ mode: "number" }).notNull(),
	data: json().notNull(),
	read_at: timestamp({ mode: 'string' }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sender_id: bigint({ mode: "number" }),
}, (table) => [
	index("idx_notifications_data_message_trgm").using("gin", sql`((data ->> 'message'::text))`),
	index("idx_notifications_data_title_trgm").using("gin", sql`((data ->> 'title'::text))`),
	index().using("btree", table.notifiable_type.asc().nullsLast().op("int8_ops"), table.notifiable_id.asc().nullsLast().op("text_ops")),
]);

export const organization_documents = pgTable("organization_documents", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	file: varchar({ length: 255 }),
	document_date: date(),
	type: smallint().default(sql`'1'`).notNull(),
	visibility_type: varchar({ length: 255 }).default('OWN').notNull(),
	title: varchar({ length: 255 }),
	description: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	check("organization_documents_visibility_type_check", sql`(visibility_type)::text = ANY (ARRAY[('OWN'::character varying)::text, ('OWN_AND_BELOW'::character varying)::text, ('ALL'::character varying)::text])`),
]);

export const organization_economist_uploads = pgTable("organization_economist_uploads", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	year: integer().notNull(),
	month: smallint().notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.month.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops")),
]);

export const organization_incentives = pgTable("organization_incentives", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	number: varchar({ length: 255 }),
	reason: varchar({ length: 255 }),
	by_whom: varchar({ length: 255 }),
	gift: varchar({ length: 255 }),
	gift_type: smallint().default(sql`'0'`).notNull(),
	date: date(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	command_id: bigint({ mode: "number" }),
}, (table) => [
	index("org_incentive_worker_date_idx").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	index().using("btree", table.date.asc().nullsLast().op("date_ops")),
]);

export const organization_leaders = pgTable("organization_leaders", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }).notNull(),
	phones: json(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	unique("organization_leaders_organization_id_worker_position_id_unique").on(table.organization_id, table.worker_position_id),
]);

export const organization_phones = pgTable("organization_phones", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	phone: bigint({ mode: "number" }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const organization_terminals = pgTable("organization_terminals", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	terminal_id: bigint({ mode: "number" }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const oauth_clients = pgTable("oauth_clients", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	client_id: varchar({ length: 255 }).notNull(),
	client_secret: varchar({ length: 255 }).notNull(),
	redirect_uri: varchar({ length: 255 }).notNull(),
	in_active: boolean().default(true).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
});

export const otp_services = pgTable("otp_services", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 255 }),
	key: varchar({ length: 20 }).notNull(),
	url: varchar({ length: 255 }),
	credentials: json(),
	status: boolean().default(true).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.key.asc().nullsLast().op("text_ops")),
]);

export const organization_access_levels = pgTable("organization_access_levels", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }).notNull(),
}, (table) => [
]);

export const organization_disciplinaries = pgTable("organization_disciplinaries", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	number: varchar({ length: 255 }),
	reason: varchar({ length: 255 }),
	fine: varchar({ length: 255 }),
	fine_type: smallint().default(sql`'0'`).notNull(),
	date: date(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	command_id: bigint({ mode: "number" }),
}, (table) => [
	index("org_disc_worker_date_idx").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	index().using("btree", table.date.asc().nullsLast().op("date_ops")),
]);

export const organization_financial_assistances = pgTable("organization_financial_assistances", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	command_id: bigint({ mode: "number" }),
	number: varchar({ length: 255 }),
	reason: text(),
	amount_text: varchar({ length: 255 }),
	type: smallint(),
	amount: doublePrecision(),
	date: date(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.date.asc().nullsLast().op("date_ops")),
]);

export const organization_polyclinics = pgTable("organization_polyclinics", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	polyclinic_id: bigint({ mode: "number" }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const organization_services = pgTable("organization_services", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	key: varchar({ length: 16 }).notNull(),
	active: boolean().default(false).notNull(),
	credentials: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.key.asc().nullsLast().op("text_ops")),
]);

export const password_reset_tokens = pgTable("password_reset_tokens", {
	phone: varchar({ length: 255 }).primaryKey().notNull(),
	token: varchar({ length: 255 }).notNull(),
	created_at: timestamp({ mode: 'string' }),
});

export const pensioners = pgTable("pensioners", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	sex: boolean().default(true).notNull(),
	position: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pin: bigint({ mode: "number" }),
	passport: varchar({ length: 12 }),
	address: text(),
	experience: integer().default(0).notNull(),
	year: integer(),
	phone: varchar({ length: 9 }),
	afghan: boolean().default(false).notNull(),
	invalid: boolean().default(false).notNull(),
	chernobyl: boolean().default(false).notNull(),
	railway_title: boolean().default(false).notNull(),
	file: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.afghan.asc().nullsLast().op("bool_ops")),
	index().using("btree", table.chernobyl.asc().nullsLast().op("bool_ops")),
	index().using("btree", table.invalid.asc().nullsLast().op("bool_ops")),
	index().using("btree", table.pin.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.railway_title.asc().nullsLast().op("bool_ops")),
]);

export const position_instructions = pgTable("position_instructions", {
	uuid: uuid().notNull(),
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	director_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	position_id: bigint({ mode: "number" }),
	created: date(),
	number: varchar({ length: 30 }).notNull(),
	file: varchar({ length: 255 }),
	confirmation_file: varchar({ length: 255 }),
	confirmation: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.confirmation.asc().nullsLast().op("int2_ops")),
	unique("position_instructions_number_unique").on(table.number),
]);

export const pension_payment_aggregates = pgTable("pension_payment_aggregates", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	year: integer().notNull(),
	month: smallint().notNull(),
	column: varchar({ length: 255 }).notNull(),
	total_sum: doublePrecision().default(sql`'0'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.column.asc().nullsLast().op("text_ops")),
	index().using("btree", table.month.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops"), table.month.asc().nullsLast().op("int4_ops")),
	unique("pension_payment_aggregates_unique").on(table.organization_id, table.year, table.month, table.column),
]);

export const personal_access_tokens = pgTable("personal_access_tokens", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	tokenable_type: varchar({ length: 255 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	tokenable_id: bigint({ mode: "number" }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	token: varchar({ length: 64 }).notNull(),
	abilities: text(),
	last_used_at: timestamp({ mode: 'string' }),
	expires_at: timestamp({ mode: 'string' }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.tokenable_type.asc().nullsLast().op("int8_ops"), table.tokenable_id.asc().nullsLast().op("int8_ops")),
	unique("personal_access_tokens_token_unique").on(table.token),
]);

export const permissions = pgTable("permissions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	guard_name: varchar({ length: 255 }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
}, (table) => [
	unique("permissions_name_guard_name_unique").on(table.name, table.guard_name),
]);

export const pulse_aggregates = pgTable("pulse_aggregates", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	bucket: integer().notNull(),
	period: integer().notNull(),
	type: varchar({ length: 255 }).notNull(),
	key: text().notNull(),
	key_hash: uuid().notNull().generatedAlwaysAs(sql`(md5(key))::uuid`),
	aggregate: varchar({ length: 255 }).notNull(),
	value: numeric({ precision: 20, scale:  2 }).notNull(),
	count: integer(),
}, (table) => [
	index().using("btree", table.period.asc().nullsLast().op("int4_ops"), table.bucket.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.period.asc().nullsLast().op("int4_ops"), table.type.asc().nullsLast().op("text_ops"), table.aggregate.asc().nullsLast().op("int4_ops"), table.bucket.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
	unique("pulse_aggregates_bucket_period_type_aggregate_key_hash_unique").on(table.bucket, table.period, table.type, table.key_hash, table.aggregate),
]);

export const pulse_entries = pgTable("pulse_entries", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	timestamp: integer().notNull(),
	type: varchar({ length: 255 }).notNull(),
	key: text().notNull(),
	key_hash: uuid().notNull().generatedAlwaysAs(sql`(md5(key))::uuid`),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	value: bigint({ mode: "number" }),
}, (table) => [
	index().using("btree", table.key_hash.asc().nullsLast().op("uuid_ops")),
	index().using("btree", table.timestamp.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.timestamp.asc().nullsLast().op("int4_ops"), table.type.asc().nullsLast().op("uuid_ops"), table.key_hash.asc().nullsLast().op("int4_ops"), table.value.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const pulse_values = pgTable("pulse_values", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	timestamp: integer().notNull(),
	type: varchar({ length: 255 }).notNull(),
	key: text().notNull(),
	key_hash: uuid().notNull().generatedAlwaysAs(sql`(md5(key))::uuid`),
	value: text().notNull(),
}, (table) => [
	index().using("btree", table.timestamp.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
	unique("pulse_values_type_key_hash_unique").on(table.type, table.key_hash),
]);

export const pension_payments = pgTable("pension_payments", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	economist_upload_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pin: bigint({ mode: "number" }),
	year: integer().notNull(),
	month: integer().notNull(),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	income_tax_paid: doublePrecision().default(sql`'0'`).notNull(),
	mandatory_pension_contribution: doublePrecision().default(sql`'0'`).notNull(),
	voluntary_pension_contribution: doublePrecision().default(sql`'0'`).notNull(),
	total_contributions: doublePrecision().default(sql`'0'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.month.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.pin.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops")),
]);

export const quotes = pgTable("quotes", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	author: json().notNull(),
	text: json().notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
});

export const roles = pgTable("roles", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	guard_name: varchar({ length: 255 }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
}, (table) => [
	unique("roles_name_guard_name_unique").on(table.name, table.guard_name),
]);

export const report_details = pgTable("report_details", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	report_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	data: jsonb(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_report_details_active").using("btree", table.organization_id.asc().nullsLast().op("int8_ops"), table.report_id.asc().nullsLast().op("int8_ops")).where(sql`(deleted_at IS NULL)`),
]);

export const report_moth_pers = pgTable("report_moth_pers", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	year: integer().notNull(),
	month: integer().notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
}, (table) => [
	unique("report_moth_pers_organization_id_year_month_unique").on(table.organization_id, table.year, table.month),
]);

export const report_exports = pgTable("report_exports", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	type: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	description: text(),
	photo: varchar({ length: 255 }),
	is_active: boolean().default(true).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const refresh_tokens = pgTable("refresh_tokens", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	token: varchar({ length: 64 }).notNull(),
	service: varchar({ length: 40 }).notNull(),
	service_secret: varchar({ length: 255 }).notNull(),
	expires_at: timestamp({ mode: 'string' }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.service.asc().nullsLast().op("text_ops")),
	index().using("btree", table.service_secret.asc().nullsLast().op("text_ops")),
	unique("refresh_tokens_token_unique").on(table.token),
]);

export const schedules = pgTable("schedules", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 100 }),
	name_ru: varchar({ length: 100 }),
	name_en: varchar({ length: 255 }),
	type: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
});

export const sended_worker_confirmations = pgTable("sended_worker_confirmations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sended_worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	position: varchar({ length: 255 }),
	type: varchar({ length: 2 }).notNull(),
	file: varchar({ length: 255 }),
	signature: text(),
	order: smallint().default(sql`'1'`).notNull(),
	main: boolean().default(false).notNull(),
	confirmation_type: smallint().default(sql`'1'`).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const reports = pgTable("reports", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	uuid: uuid().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	year: smallint(),
	month: smallint(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	director_id: bigint({ mode: "number" }),
	file: varchar({ length: 255 }),
	confirmation_file: varchar({ length: 255 }),
	generate: smallint().default(sql`'1'`).notNull(),
	confirmation: smallint().default(sql`'1'`).notNull(),
	active: boolean().default(false).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_reports_year_month").using("btree", table.year.asc().nullsLast().op("int2_ops"), table.month.asc().nullsLast().op("int2_ops")),
	index("idx_reports_year_month_active").using("btree", table.year.asc().nullsLast().op("int2_ops"), table.month.asc().nullsLast().op("int8_ops"), table.id.asc().nullsLast().op("int2_ops")).where(sql`(deleted_at IS NULL)`),
	index().using("btree", table.confirmation.asc().nullsLast().op("int2_ops")),
]);

export const sended_worker_commissions = pgTable("sended_worker_commissions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sended_worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	commission_id: bigint({ mode: "number" }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const sended_workers = pgTable("sended_workers", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	uuid: uuid().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	polyclinic_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	commission_leader_id: bigint({ mode: "number" }),
	number: integer(),
	start_date: date(),
	file: varchar({ length: 255 }),
	confirmation_file: varchar({ length: 255 }),
	confirmation: smallint().default(sql`'1'`).notNull(),
	status: smallint(),
	generate: smallint().default(sql`'1'`).notNull(),
	comment: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.number.asc().nullsLast().op("int4_ops")),
]);

export const sessions = pgTable("sessions", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	ip_address: varchar({ length: 45 }),
	user_agent: text(),
	payload: text().notNull(),
	last_activity: integer().notNull(),
}, (table) => [
	index().using("btree", table.last_activity.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.user_id.asc().nullsLast().op("int8_ops")),
]);

export const signature_urls = pgTable("signature_urls", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	token: text().notNull(),
	model: varchar({ length: 70 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	confirmation_id: bigint({ mode: "number" }).notNull(),
	data: json(),
	expires_at: timestamp({ mode: 'string' }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
}, (table) => [
	unique("signature_urls_model_confirmation_id_unique").on(table.model, table.confirmation_id),
]);

export const specialization_positions = pgTable("specialization_positions", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	specialization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	position_id: bigint({ mode: "number" }).notNull(),
}, (table) => [
]);

export const sync_h_c_p_access_logs = pgTable("sync_h_c_p_access_logs", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	error: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	sync_datetime: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	type: smallint().default(sql`'1'`).notNull(),
	day: date(),
	events_count: integer().default(0).notNull(),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
]);

export const staffing_approve_positions = pgTable("staffing_approve_positions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	staffing_approve_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	department_position_id: bigint({ mode: "number" }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const statement_aggregates = pgTable("statement_aggregates", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	year: integer().notNull(),
	month: smallint().notNull(),
	code: integer().notNull(),
	total_sum: doublePrecision().default(sql`'0'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.code.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.month.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops"), table.month.asc().nullsLast().op("int4_ops")),
	unique("agg_unique_idx").on(table.organization_id, table.year, table.month, table.code),
]);

export const sync_offline_devices = pgTable("sync_offline_devices", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sync_h_c_p_access_log_id: bigint({ mode: "number" }).notNull(),
	hik_central_device_id: integer().notNull(),
	name: varchar({ length: 255 }),
}, (table) => [
]);

export const station_codes = pgTable("station_codes", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	model_type: varchar({ length: 255 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	model_id: bigint({ mode: "number" }).notNull(),
	code: integer(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.model_type.asc().nullsLast().op("int8_ops"), table.model_id.asc().nullsLast().op("int8_ops")),
]);

export const specializations = pgTable("specializations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	direction_id: bigint({ mode: "number" }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const signatures = pgTable("signatures", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	model_id: bigint({ mode: "number" }).notNull(),
	model_type: varchar({ length: 255 }).notNull(),
	signature: text(),
	type: smallint().default(sql`'1'`).notNull(),
	certificate_code: varchar({ length: 255 }),
	certificate_expired: timestamp({ mode: 'string' }),
	status: boolean().default(false).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const staffing_approves = pgTable("staffing_approves", {
	uuid: uuid().notNull(),
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	number: integer(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	director_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	confirmatory_id: bigint({ mode: "number" }),
	date: date(),
	file: varchar({ length: 255 }),
	confirmation_file: varchar({ length: 255 }),
	generate: smallint().default(sql`'1'`).notNull(),
	confirmation: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.confirmation.asc().nullsLast().op("int2_ops")),
]);

export const statements = pgTable("statements", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	economist_upload_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pin: bigint({ mode: "number" }),
	year: integer().notNull(),
	month: smallint().notNull(),
	full_name: varchar({ length: 150 }),
	position: varchar({ length: 255 }),
	main_salary: doublePrecision().default(sql`'0'`).notNull(),
	work_time: doublePrecision().default(0).notNull(),
	total_one: doublePrecision().default(sql`'0'`).notNull(),
	total_two: doublePrecision().default(sql`'0'`).notNull(),
	total_three: doublePrecision().default(sql`'0'`).notNull(),
	total_four: doublePrecision().default(sql`'0'`).notNull(),
	total_five: doublePrecision().default(sql`'0'`).notNull(),
	s_001: doublePrecision().default(sql`'0'`).notNull(),
	s_002: doublePrecision().default(sql`'0'`).notNull(),
	s_003: doublePrecision().default(sql`'0'`).notNull(),
	s_004: doublePrecision().default(sql`'0'`).notNull(),
	s_005: doublePrecision().default(sql`'0'`).notNull(),
	s_006: doublePrecision().default(sql`'0'`).notNull(),
	s_007: doublePrecision().default(sql`'0'`).notNull(),
	s_008: doublePrecision().default(sql`'0'`).notNull(),
	s_009: doublePrecision().default(sql`'0'`).notNull(),
	s_010: doublePrecision().default(sql`'0'`).notNull(),
	s_011: doublePrecision().default(sql`'0'`).notNull(),
	s_012: doublePrecision().default(sql`'0'`).notNull(),
	s_013: doublePrecision().default(sql`'0'`).notNull(),
	s_014: doublePrecision().default(sql`'0'`).notNull(),
	s_015: doublePrecision().default(sql`'0'`).notNull(),
	s_016: doublePrecision().default(sql`'0'`).notNull(),
	s_017: doublePrecision().default(sql`'0'`).notNull(),
	s_018: doublePrecision().default(sql`'0'`).notNull(),
	s_019: doublePrecision().default(sql`'0'`).notNull(),
	s_020: doublePrecision().default(sql`'0'`).notNull(),
	s_021: doublePrecision().default(sql`'0'`).notNull(),
	s_022: doublePrecision().default(sql`'0'`).notNull(),
	s_023: doublePrecision().default(sql`'0'`).notNull(),
	s_024: doublePrecision().default(sql`'0'`).notNull(),
	s_025: doublePrecision().default(sql`'0'`).notNull(),
	s_026: doublePrecision().default(sql`'0'`).notNull(),
	s_027: doublePrecision().default(sql`'0'`).notNull(),
	s_028: doublePrecision().default(sql`'0'`).notNull(),
	s_029: doublePrecision().default(sql`'0'`).notNull(),
	s_030: doublePrecision().default(sql`'0'`).notNull(),
	s_031: doublePrecision().default(sql`'0'`).notNull(),
	s_032: doublePrecision().default(sql`'0'`).notNull(),
	s_033: doublePrecision().default(sql`'0'`).notNull(),
	s_034: doublePrecision().default(sql`'0'`).notNull(),
	s_035: doublePrecision().default(sql`'0'`).notNull(),
	s_036: doublePrecision().default(sql`'0'`).notNull(),
	s_037: doublePrecision().default(sql`'0'`).notNull(),
	s_038: doublePrecision().default(sql`'0'`).notNull(),
	s_039: doublePrecision().default(sql`'0'`).notNull(),
	s_040: doublePrecision().default(sql`'0'`).notNull(),
	s_041: doublePrecision().default(sql`'0'`).notNull(),
	s_043: doublePrecision().default(sql`'0'`).notNull(),
	s_045: doublePrecision().default(sql`'0'`).notNull(),
	s_046: doublePrecision().default(sql`'0'`).notNull(),
	s_047: doublePrecision().default(sql`'0'`).notNull(),
	s_048: doublePrecision().default(sql`'0'`).notNull(),
	s_049: doublePrecision().default(sql`'0'`).notNull(),
	s_050: doublePrecision().default(sql`'0'`).notNull(),
	s_051: doublePrecision().default(sql`'0'`).notNull(),
	s_052: doublePrecision().default(sql`'0'`).notNull(),
	s_053: doublePrecision().default(sql`'0'`).notNull(),
	s_054: doublePrecision().default(sql`'0'`).notNull(),
	s_055: doublePrecision().default(sql`'0'`).notNull(),
	s_057: doublePrecision().default(sql`'0'`).notNull(),
	s_058: doublePrecision().default(sql`'0'`).notNull(),
	s_059: doublePrecision().default(sql`'0'`).notNull(),
	s_066: doublePrecision().default(sql`'0'`).notNull(),
	s_076: doublePrecision().default(sql`'0'`).notNull(),
	s_060: doublePrecision().default(sql`'0'`).notNull(),
	s_065: doublePrecision().default(sql`'0'`).notNull(),
	s_072: doublePrecision().default(sql`'0'`).notNull(),
	s_073: doublePrecision().default(sql`'0'`).notNull(),
	s_075: doublePrecision().default(sql`'0'`).notNull(),
	s_077: doublePrecision().default(sql`'0'`).notNull(),
	s_078: doublePrecision().default(sql`'0'`).notNull(),
	s_079: doublePrecision().default(sql`'0'`).notNull(),
	s_080: doublePrecision().default(sql`'0'`).notNull(),
	s_081: doublePrecision().default(sql`'0'`).notNull(),
	s_082: doublePrecision().default(sql`'0'`).notNull(),
	s_083: doublePrecision().default(sql`'0'`).notNull(),
	s_084: doublePrecision().default(sql`'0'`).notNull(),
	s_085: doublePrecision().default(sql`'0'`).notNull(),
	s_096: doublePrecision().default(sql`'0'`).notNull(),
	s_097: doublePrecision().default(sql`'0'`).notNull(),
	s_098: doublePrecision().default(sql`'0'`).notNull(),
	s_107: doublePrecision().default(sql`'0'`).notNull(),
	s_175: doublePrecision().default(sql`'0'`).notNull(),
	s_247: doublePrecision().default(sql`'0'`).notNull(),
	s_248: doublePrecision().default(sql`'0'`).notNull(),
	s_250: doublePrecision().default(sql`'0'`).notNull(),
	s_253: doublePrecision().default(sql`'0'`).notNull(),
	s_254: doublePrecision().default(sql`'0'`).notNull(),
	s_256: doublePrecision().default(sql`'0'`).notNull(),
	s_262: doublePrecision().default(sql`'0'`).notNull(),
	s_263: doublePrecision().default(sql`'0'`).notNull(),
	s_266: doublePrecision().default(sql`'0'`).notNull(),
	s_270: doublePrecision().default(sql`'0'`).notNull(),
	s_276: doublePrecision().default(sql`'0'`).notNull(),
	s_281: doublePrecision().default(sql`'0'`).notNull(),
	s_300: doublePrecision().default(sql`'0'`).notNull(),
	s_355: doublePrecision().default(sql`'0'`).notNull(),
	s_363: doublePrecision().default(sql`'0'`).notNull(),
	s_365: doublePrecision().default(sql`'0'`).notNull(),
	s_471: doublePrecision().default(sql`'0'`).notNull(),
	s_472: doublePrecision().default(sql`'0'`).notNull(),
	s_475: doublePrecision().default(sql`'0'`).notNull(),
	s_476: doublePrecision().default(sql`'0'`).notNull(),
	s_478: doublePrecision().default(sql`'0'`).notNull(),
	s_480: doublePrecision().default(sql`'0'`).notNull(),
	s_481: doublePrecision().default(sql`'0'`).notNull(),
	s_042: doublePrecision().default(sql`'0'`).notNull(),
	s_044: doublePrecision().default(sql`'0'`).notNull(),
	s_056: doublePrecision().default(sql`'0'`).notNull(),
	s_246: doublePrecision().default(sql`'0'`).notNull(),
	s_251: doublePrecision().default(sql`'0'`).notNull(),
	s_271: doublePrecision().default(sql`'0'`).notNull(),
	s_272: doublePrecision().default(sql`'0'`).notNull(),
	s_273: doublePrecision().default(sql`'0'`).notNull(),
	s_274: doublePrecision().default(sql`'0'`).notNull(),
	s_275: doublePrecision().default(sql`'0'`).notNull(),
	s_277: doublePrecision().default(sql`'0'`).notNull(),
	s_278: doublePrecision().default(sql`'0'`).notNull(),
	s_368: doublePrecision().default(sql`'0'`).notNull(),
	s_369: doublePrecision().default(sql`'0'`).notNull(),
	s_474: doublePrecision().default(sql`'0'`).notNull(),
	s_482: doublePrecision().default(sql`'0'`).notNull(),
	s_556: doublePrecision().default(sql`'0'`).notNull(),
	s_558: doublePrecision().default(sql`'0'`).notNull(),
	s_560: doublePrecision().default(sql`'0'`).notNull(),
	s_564: doublePrecision().default(sql`'0'`).notNull(),
	s_566: doublePrecision().default(sql`'0'`).notNull(),
	s_061: doublePrecision().default(sql`'0'`).notNull(),
	s_070: doublePrecision().default(sql`'0'`).notNull(),
	s_086: doublePrecision().default(sql`'0'`).notNull(),
	s_228: doublePrecision().default(sql`'0'`).notNull(),
	s_461: doublePrecision().default(sql`'0'`).notNull(),
	s_469: doublePrecision().default(sql`'0'`).notNull(),
	s_470: doublePrecision().default(sql`'0'`).notNull(),
	s_473: doublePrecision().default(sql`'0'`).notNull(),
	s_477: doublePrecision().default(sql`'0'`).notNull(),
	s_479: doublePrecision().default(sql`'0'`).notNull(),
	s_557: doublePrecision().default(sql`'0'`).notNull(),
	s_559: doublePrecision().default(sql`'0'`).notNull(),
	s_563: doublePrecision().default(sql`'0'`).notNull(),
	s_565: doublePrecision().default(sql`'0'`).notNull(),
	s_562: doublePrecision().default(sql`'0'`).notNull(),
	s_600: doublePrecision().default(sql`'0'`).notNull(),
	s_856: doublePrecision().default(sql`'0'`).notNull(),
	s_875: doublePrecision().default(sql`'0'`).notNull(),
	s_876: doublePrecision().default(sql`'0'`).notNull(),
	s_877: doublePrecision().default(sql`'0'`).notNull(),
	s_879: doublePrecision().default(sql`'0'`).notNull(),
	s_880: doublePrecision().default(sql`'0'`).notNull(),
	s_881: doublePrecision().default(sql`'0'`).notNull(),
	s_882: doublePrecision().default(sql`'0'`).notNull(),
	s_883: doublePrecision().default(sql`'0'`).notNull(),
	s_884: doublePrecision().default(sql`'0'`).notNull(),
	s_885: doublePrecision().default(sql`'0'`).notNull(),
	s_886: doublePrecision().default(sql`'0'`).notNull(),
	s_887: doublePrecision().default(sql`'0'`).notNull(),
	s_888: doublePrecision().default(sql`'0'`).notNull(),
	s_889: doublePrecision().default(sql`'0'`).notNull(),
	s_890: doublePrecision().default(sql`'0'`).notNull(),
	s_891: doublePrecision().default(sql`'0'`).notNull(),
	s_892: doublePrecision().default(sql`'0'`).notNull(),
	s_893: doublePrecision().default(sql`'0'`).notNull(),
	s_894: doublePrecision().default(sql`'0'`).notNull(),
	s_895: doublePrecision().default(sql`'0'`).notNull(),
	s_896: doublePrecision().default(sql`'0'`).notNull(),
	s_897: doublePrecision().default(sql`'0'`).notNull(),
	s_898: doublePrecision().default(sql`'0'`).notNull(),
	s_899: doublePrecision().default(sql`'0'`).notNull(),
	s_900: doublePrecision().default(sql`'0'`).notNull(),
	s_901: doublePrecision().default(sql`'0'`).notNull(),
	s_902: doublePrecision().default(sql`'0'`).notNull(),
	s_903: doublePrecision().default(sql`'0'`).notNull(),
	s_904: doublePrecision().default(sql`'0'`).notNull(),
	s_905: doublePrecision().default(sql`'0'`).notNull(),
	s_906: doublePrecision().default(sql`'0'`).notNull(),
	s_907: doublePrecision().default(sql`'0'`).notNull(),
	s_908: doublePrecision().default(sql`'0'`).notNull(),
	s_909: doublePrecision().default(sql`'0'`).notNull(),
	s_910: doublePrecision().default(sql`'0'`).notNull(),
	s_911: doublePrecision().default(sql`'0'`).notNull(),
	s_912: doublePrecision().default(sql`'0'`).notNull(),
	s_913: doublePrecision().default(sql`'0'`).notNull(),
	s_914: doublePrecision().default(sql`'0'`).notNull(),
	s_915: doublePrecision().default(sql`'0'`).notNull(),
	s_916: doublePrecision().default(sql`'0'`).notNull(),
	s_917: doublePrecision().default(sql`'0'`).notNull(),
	s_918: doublePrecision().default(sql`'0'`).notNull(),
	s_919: doublePrecision().default(sql`'0'`).notNull(),
	s_920: doublePrecision().default(sql`'0'`).notNull(),
	s_921: doublePrecision().default(sql`'0'`).notNull(),
	s_922: doublePrecision().default(sql`'0'`).notNull(),
	s_923: doublePrecision().default(sql`'0'`).notNull(),
	s_927: doublePrecision().default(sql`'0'`).notNull(),
	s_929: doublePrecision().default(sql`'0'`).notNull(),
	s_930: doublePrecision().default(sql`'0'`).notNull(),
	s_931: doublePrecision().default(sql`'0'`).notNull(),
	s_932: doublePrecision().default(sql`'0'`).notNull(),
	s_933: doublePrecision().default(sql`'0'`).notNull(),
	s_934: doublePrecision().default(sql`'0'`).notNull(),
	s_935: doublePrecision().default(sql`'0'`).notNull(),
	s_936: doublePrecision().default(sql`'0'`).notNull(),
	s_937: doublePrecision().default(sql`'0'`).notNull(),
	s_990: doublePrecision().default(sql`'0'`).notNull(),
	s_991: doublePrecision().default(sql`'0'`).notNull(),
	s_992: doublePrecision().default(sql`'0'`).notNull(),
	s_997: doublePrecision().default(sql`'0'`).notNull(),
	s_999: doublePrecision().default(sql`'0'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_statements_pin_year_month").using("btree", table.pin.asc().nullsLast().op("int4_ops"), table.year.asc().nullsLast().op("int8_ops"), table.month.asc().nullsLast().op("int8_ops")),
	index("idx_statements_worker_year_month").using("btree", table.worker_id.asc().nullsLast().op("int4_ops"), table.year.asc().nullsLast().op("int8_ops"), table.month.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.month.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.pin.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops"), table.month.asc().nullsLast().op("int4_ops")),
]);

export const specialities = pgTable("specialities", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	code: varchar({ length: 30 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
});

export const teacher_subjects = pgTable("teacher_subjects", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	teacher_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	learning_center_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	subject_id: bigint({ mode: "number" }).notNull(),
}, (table) => [
]);

export const telegram_messages = pgTable("telegram_messages", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	chat_id: bigint({ mode: "number" }).notNull(),
	message: text(),
	status: smallint().notNull(),
	error_msg: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	type: smallint().default(sql`'1'`).notNull(),
}, (table) => [
]);

export const terminal_events_202509_03 = pgTable("terminal_events_202509_03", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_03").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_03").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const tax_five_aggregates = pgTable("tax_five_aggregates", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	year: integer().notNull(),
	month: smallint().notNull(),
	column: varchar({ length: 255 }).notNull(),
	total_sum: doublePrecision().default(sql`'0'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.column.asc().nullsLast().op("text_ops")),
	index().using("btree", table.month.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops"), table.month.asc().nullsLast().op("int4_ops")),
	unique("tax_five_aggregates_unique").on(table.organization_id, table.year, table.month, table.column),
]);

export const tax_five_applications = pgTable("tax_five_applications", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	economist_upload_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pin: bigint({ mode: "number" }),
	year: integer().notNull(),
	month: integer().notNull(),
	full_name: varchar({ length: 255 }),
	total_income: doublePrecision().default(sql`'0'`).notNull(),
	reported_income: doublePrecision().default(sql`'0'`).notNull(),
	income_type: smallint().default(sql`'1'`).notNull(),
	total_tax: doublePrecision().default(sql`'0'`).notNull(),
	reported_tax: doublePrecision().default(sql`'0'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.month.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.pin.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops")),
]);

export const tax_four_aggregates = pgTable("tax_four_aggregates", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	year: integer().notNull(),
	month: smallint().notNull(),
	column: varchar({ length: 255 }).notNull(),
	total_sum: doublePrecision().default(sql`'0'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.column.asc().nullsLast().op("text_ops")),
	index().using("btree", table.month.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops"), table.month.asc().nullsLast().op("int4_ops")),
	unique("tax_four_aggregates_unique").on(table.organization_id, table.year, table.month, table.column),
]);

export const tax_four_applications = pgTable("tax_four_applications", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	economist_upload_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pin: bigint({ mode: "number" }),
	month: integer().notNull(),
	year: integer().notNull(),
	full_name: varchar({ length: 255 }),
	position: varchar({ length: 255 }),
	employee_status: smallint().default(sql`'1'`).notNull(),
	contract_type: smallint().default(sql`'1'`).notNull(),
	total_salary_income: doublePrecision().default(sql`'0'`).notNull(),
	reported_salary_income: doublePrecision().default(sql`'0'`).notNull(),
	total_tax: doublePrecision().default(sql`'0'`).notNull(),
	reported_tax: doublePrecision().default(sql`'0'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.month.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.pin.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops")),
]);

export const telegram_actions = pgTable("telegram_actions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	request: json(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const terminal_events_202509_11 = pgTable("terminal_events_202509_11", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_11").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_11").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_15 = pgTable("terminal_events_202509_15", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_15").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_15").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_19 = pgTable("terminal_events_202509_19", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_19").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_19").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_26 = pgTable("terminal_events_202509_26", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_26").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_26").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_30 = pgTable("terminal_events_202509_30", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_30").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_30").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_03 = pgTable("terminal_events_202510_03", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_03").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_03").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_10 = pgTable("terminal_events_202510_10", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_10").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_10").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_14 = pgTable("terminal_events_202510_14", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_14").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_14").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_18 = pgTable("terminal_events_202510_18", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_18").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_18").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_25 = pgTable("terminal_events_202510_25", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_25").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_25").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_29 = pgTable("terminal_events_202510_29", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_29").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_29").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_01 = pgTable("terminal_events_202511_01", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_01").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_01").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_08 = pgTable("terminal_events_202511_08", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_08").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_08").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_12 = pgTable("terminal_events_202511_12", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_12").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_12").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_16 = pgTable("terminal_events_202511_16", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_16").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_16").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_23 = pgTable("terminal_events_202511_23", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_23").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_23").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_27 = pgTable("terminal_events_202511_27", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_27").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_27").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_02 = pgTable("terminal_events_202512_02", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_02").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_02").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_07 = pgTable("terminal_events_202512_07", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_07").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_07").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_11 = pgTable("terminal_events_202512_11", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_11").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_11").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_15 = pgTable("terminal_events_202512_15", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_15").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_15").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_22 = pgTable("terminal_events_202512_22", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_22").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_22").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_26 = pgTable("terminal_events_202512_26", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_26").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_26").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_30 = pgTable("terminal_events_202512_30", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_30").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_30").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_05 = pgTable("terminal_events_202601_05", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_05").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_05").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_09 = pgTable("terminal_events_202601_09", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_09").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_09").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_13 = pgTable("terminal_events_202601_13", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_13").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_13").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_20 = pgTable("terminal_events_202601_20", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_20").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_20").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_24 = pgTable("terminal_events_202601_24", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_24").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_24").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_28 = pgTable("terminal_events_202601_28", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_28").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_28").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_03 = pgTable("terminal_events_202602_03", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_03").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_03").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_07 = pgTable("terminal_events_202602_07", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_07").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_07").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_11 = pgTable("terminal_events_202602_11", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_11").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_11").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_18 = pgTable("terminal_events_202602_18", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_18").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_18").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_22 = pgTable("terminal_events_202602_22", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_22").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_22").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_26 = pgTable("terminal_events_202602_26", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_26").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_26").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_04 = pgTable("terminal_events_202603_04", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_04").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_04").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_08 = pgTable("terminal_events_202603_08", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_08").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_08").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_12 = pgTable("terminal_events_202603_12", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_12").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_12").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_19 = pgTable("terminal_events_202603_19", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_19").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_19").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_23 = pgTable("terminal_events_202603_23", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_23").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_23").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_27 = pgTable("terminal_events_202603_27", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_27").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_27").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_02 = pgTable("terminal_events_202604_02", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_02").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_02").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_06 = pgTable("terminal_events_202604_06", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_06").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_06").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_10 = pgTable("terminal_events_202604_10", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_10").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_10").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_17 = pgTable("terminal_events_202604_17", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_17").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_17").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_21 = pgTable("terminal_events_202604_21", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_21").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_21").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_25 = pgTable("terminal_events_202604_25", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_25").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_25").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_01 = pgTable("terminal_events_202605_01", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_01").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_01").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_05 = pgTable("terminal_events_202605_05", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_05").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_05").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_09 = pgTable("terminal_events_202605_09", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_09").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_09").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_16 = pgTable("terminal_events_202605_16", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_16").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_16").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_20 = pgTable("terminal_events_202605_20", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_20").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_20").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_24 = pgTable("terminal_events_202605_24", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_24").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_24").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_30 = pgTable("terminal_events_202605_30", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_30").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_30").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_old = pgTable("terminal_events_old", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date: date(),
	event_time: time(),
	auth_type: varchar({ length: 150 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	event_date_and_time: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
}, (table) => [
	index("event_date_and_time_index").using("btree", table.event_date_and_time.asc().nullsLast().op("timestamp_ops")),
	index("idx_terminal_events_in").using("btree", table.event_date.asc().nullsLast().op("timestamp_ops"), table.worker_id.asc().nullsLast().op("timestamp_ops"), table.event_date_and_time.asc().nullsLast().op("timestamp_ops")).where(sql`(direction = true)`),
	index("idx_terminal_events_out").using("btree", table.event_date.asc().nullsLast().op("timestamp_ops"), table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(direction = false)`),
	index("index_worker_events").using("btree", table.worker_id.asc().nullsLast().op("bool_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops"), table.direction.asc().nullsLast().op("bool_ops")),
	index("terminal_events_device_serial_index").using("btree", table.device_serial.asc().nullsLast().op("text_ops")),
	index("terminal_events_direction_index").using("btree", table.direction.asc().nullsLast().op("bool_ops")),
	index("terminal_events_event_date_index").using("btree", table.event_date.asc().nullsLast().op("date_ops")),
	index("terminal_events_event_time_index").using("btree", table.event_time.asc().nullsLast().op("time_ops")),
	index("terminal_events_mask_status_index").using("btree", table.mask_status.asc().nullsLast().op("int2_ops")),
	unique("unique_worker_events").on(table.worker_id, table.direction, table.event_date_and_time),
]);

export const terminal_logs = pgTable("terminal_logs", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	terminal_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	event_time: timestamp({ mode: 'string' }).notNull(),
	event_type: boolean().default(false).notNull(),
	expired: boolean().default(false).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.event_time.asc().nullsLast().op("timestamp_ops")),
	index().using("btree", table.event_type.asc().nullsLast().op("bool_ops")),
]);

export const terminal_mobile_events = pgTable("terminal_mobile_events", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	terminal_event_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	photo: varchar({ length: 255 }),
	lat: varchar({ length: 255 }),
	lng: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pin: bigint({ mode: "number" }),
}, (table) => [
	index().using("btree", table.terminal_event_id.asc().nullsLast().op("int8_ops")),
]);

export const time_sheet_worker_departments = pgTable("time_sheet_worker_departments", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	department_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	work_place_id: bigint({ mode: "number" }),
	active: boolean().default(true).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const time_sheets = pgTable("time_sheets", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	department_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	work_place_id: bigint({ mode: "number" }),
	year: integer().notNull(),
	month: integer().notNull(),
	file: varchar({ length: 255 }),
	confirmation_file: varchar({ length: 255 }),
	status: boolean().default(false).notNull(),
	generate: smallint().default(sql`'2'`).notNull(),
	confirmation: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.month.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops")),
]);

export const timesheet_confirmations = pgTable("timesheet_confirmations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	time_sheet_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	position: varchar({ length: 255 }),
	type: varchar({ length: 2 }).notNull(),
	file: varchar({ length: 255 }),
	signature: text(),
	order: smallint().default(sql`'1'`).notNull(),
	main: boolean().default(false).notNull(),
	confirmation_type: smallint().default(sql`'1'`).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const topic_files = pgTable("topic_files", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	topic_id: bigint({ mode: "number" }),
	file: varchar({ length: 255 }),
	file_extension: varchar({ length: 15 }),
	file_name: varchar({ length: 255 }),
	type: smallint().default(sql`'1'`).notNull(),
	active: boolean().default(true).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const translates = pgTable("translates", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
});

export const turnstile_telegram_photos = pgTable("turnstile_telegram_photos", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hcp_person_id: bigint({ mode: "number" }),
	photo: varchar({ length: 255 }).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	error: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const turnstile_worker_access_levels = pgTable("turnstile_worker_access_levels", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_worker_approve_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }).notNull(),
}, (table) => [
]);

export const turnstile_worker_approve_worker_positions = pgTable("turnstile_worker_approve_worker_positions", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_worker_approve_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }).notNull(),
}, (table) => [
]);

export const topic_organizations = pgTable("topic_organizations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	topic_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
}, (table) => [
]);

export const turnstile_schedule_groups = pgTable("turnstile_schedule_groups", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_type_id: bigint({ mode: "number" }).notNull(),
	order: smallint().default(sql`'1'`).notNull(),
	name: varchar({ length: 255 }).notNull(),
	start_date: date(),
	end_date: date(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	workers_count: integer().default(0).notNull(),
	worker_positions_count: integer().default(0).notNull(),
}, (table) => [
]);

export const turnstile_schedule_types = pgTable("turnstile_schedule_types", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	type: smallint().default(sql`'1'`).notNull(),
	days: json().notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	workers_count: integer().default(0),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	per_day: integer(),
});

export const turnstile_worker_approves = pgTable("turnstile_worker_approves", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	receiver_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	receiver_organization_id: bigint({ mode: "number" }).notNull(),
	title: varchar({ length: 255 }),
	description: text(),
	approved: smallint().default(sql`'1'`).notNull(),
	approved_comment: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const universities = pgTable("universities", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	city_id: bigint({ mode: "number" }),
	education: smallint().default(sql`'1'`).notNull(),
	type: smallint().default(sql`'1'`).notNull(),
	name: varchar({ length: 255 }).notNull(),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.education.asc().nullsLast().op("int2_ops")),
]);

export const user_export_tasks = pgTable("user_export_tasks", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	type: smallint().notNull(),
	file: varchar({ length: 255 }),
	status: smallint().default(sql`'1'`).notNull(),
	message: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	read_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("int2_ops")),
]);

export const upload_files = pgTable("upload_files", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	file_name: varchar({ length: 255 }),
	file_path: varchar({ length: 255 }),
	file_extension: varchar({ length: 7 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
});

export const user_telegrams = pgTable("user_telegrams", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	phone: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	chat_id: bigint({ mode: "number" }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	active: boolean().default(true).notNull(),
}, (table) => [
]);

export const vacancy_applications = pgTable("vacancy_applications", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vacancy_position_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vacancy_user_id: bigint({ mode: "number" }).notNull(),
	status: smallint().default(1).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const vacancy_application_files = pgTable("vacancy_application_files", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vacancy_application_id: bigint({ mode: "number" }).notNull(),
	file_type: smallint().notNull(),
	file: varchar({ length: 255 }),
	file_name: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const vacancy_application_messages = pgTable("vacancy_application_messages", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vacancy_application_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vacancy_user_id: bigint({ mode: "number" }).notNull(),
	message: text().notNull(),
	read: boolean().default(false).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	change_status: smallint().default(sql`'1'`).notNull(),
}, (table) => [
]);

export const vacancy_application_statuses = pgTable("vacancy_application_statuses", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vacancy_application_id: bigint({ mode: "number" }).notNull(),
	type: smallint().default(sql`'1'`).notNull(),
	details: json(),
	status: smallint().default(sql`'1'`).notNull(),
	message: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const vacancy_positions = pgTable("vacancy_positions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	department_position_id: bigint({ mode: "number" }).notNull(),
	rate: integer().default(1).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	city_id: bigint({ mode: "number" }).notNull(),
	experience: doublePrecision().default(sql`'1'`).notNull(),
	salary: doublePrecision().default(sql`'0'`).notNull(),
	work_type: smallint().default(sql`'1'`).notNull(),
	education: smallint().default(sql`'1'`).notNull(),
	address: text(),
	to: timestamp({ mode: 'string' }),
	view_count: integer().default(0).notNull(),
	position_obligations: text(),
	qualification_requirements: text(),
	working_conditions: text(),
	specialties: text(),
	status: boolean().default(false).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	salary_status: boolean().default(true).notNull(),
	phd_status: boolean().default(false).notNull(),
	vacancy_status: smallint().default(sql`'1'`).notNull(),
	finish: smallint().default(sql`'1'`).notNull(),
}, (table) => [
]);

export const vacancy_approve_organizations = pgTable("vacancy_approve_organizations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	from_organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	to_organization_id: bigint({ mode: "number" }).notNull(),
}, (table) => [
]);

export const user_mobile_keys = pgTable("user_mobile_keys", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	device_uuid: varchar({ length: 255 }).notNull(),
	device_model: varchar({ length: 255 }),
	platform: varchar({ length: 255 }),
	fcm_token: text(),
	face: timestamp({ mode: 'string' }),
	notifications: boolean().default(false).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	token_id: bigint({ mode: "number" }),
	last_used_at: timestamp({ mode: 'string' }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.device_uuid.asc().nullsLast().op("text_ops")),
	index().using("btree", table.notifications.asc().nullsLast().op("bool_ops")),
	index().using("btree", table.user_id.asc().nullsLast().op("int8_ops"), table.device_uuid.asc().nullsLast().op("text_ops")),
	unique("user_mobile_keys_user_id_device_uuid_unique").on(table.user_id, table.device_uuid),
]);

export const user_petitions = pgTable("user_petitions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	type: smallint().default(sql`'1'`).notNull(),
	comment: text(),
	result: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	status: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const user_turnstile_devices = pgTable("user_turnstile_devices", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_device_id: bigint({ mode: "number" }).notNull(),
}, (table) => [
	index().using("btree", table.hik_central_device_id.asc().nullsLast().op("int8_ops")),
]);

export const vacancy_application_exams = pgTable("vacancy_application_exams", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vacancy_application_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	exam_id: bigint({ mode: "number" }),
	created: timestamp({ mode: 'string' }),
	ended: timestamp({ mode: 'string' }),
	result: integer(),
	exam_type: boolean().default(false).notNull(),
	active_token: varchar({ length: 255 }),
	user_agent: varchar({ length: 255 }),
	ip_address: varchar({ length: 15 }),
	status: boolean().default(false).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const vacancy_user_careers = pgTable("vacancy_user_careers", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vacancy_user_id: bigint({ mode: "number" }).notNull(),
	from: date(),
	to: date(),
	position: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const vacancy_user_education = pgTable("vacancy_user_education", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vacancy_user_id: bigint({ mode: "number" }).notNull(),
	from: date(),
	to: date(),
	university: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const vacation_schedules = pgTable("vacation_schedules", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }).notNull(),
	month: smallint().notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vacation_schedule_year_id: bigint({ mode: "number" }),
	year: smallint(),
	period_from: date(),
	period_to: date(),
	plan_date: date(),
	real_date: date(),
	table_number: integer(),
	all_days: integer().default(0).notNull(),
	real_days: integer().default(0).notNull(),
	signature: text(),
	confirmation_type: smallint().default(sql`'1'`).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
}, (table) => [
	index().using("btree", table.month.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	unique("unique_vacation_schedule_worker").on(table.worker_id, table.vacation_schedule_year_id),
]);

export const vacations = pgTable("vacations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	contract_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	command_id: bigint({ mode: "number" }),
	type: smallint().default(sql`'1'`).notNull(),
	main_day: integer().default(0).notNull(),
	second_day: integer().default(0).notNull(),
	all_day: integer().default(0).notNull(),
	rest_day: integer().default(0).notNull(),
	period_from: date(),
	period_to: date(),
	from: date(),
	to: date(),
	work_day: date(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.from.asc().nullsLast().op("date_ops")),
	index().using("btree", table.to.asc().nullsLast().op("date_ops")),
	index().using("btree", table.type.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.from.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.from.asc().nullsLast().op("int8_ops"), table.to.asc().nullsLast().op("date_ops")),
	index().using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.to.asc().nullsLast().op("date_ops")),
	unique("vacations_worker_type_to_unique").on(table.worker_id, table.type, table.to),
]);

export const work_days = pgTable("work_days", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	schedule_id: bigint({ mode: "number" }).notNull(),
	day_of_week: smallint().default(sql`'0'`).notNull(),
	start_time: time(),
	end_time: time(),
	type: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const worker_application_confirmations = pgTable("worker_application_confirmations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_application_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	position: varchar({ length: 255 }),
	type: varchar({ length: 2 }).notNull(),
	file: varchar({ length: 255 }),
	signature: text(),
	order: smallint().default(sql`'1'`).notNull(),
	main: boolean().default(false).notNull(),
	confirmation_type: smallint().default(sql`'1'`).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const worker_business_trips = pgTable("worker_business_trips", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	contract_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	command_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	work_place_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	department_id: bigint({ mode: "number" }),
	to_organization: varchar({ length: 255 }),
	type: smallint().default(sql`'1'`).notNull(),
	from: date(),
	to: date(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.to.asc().nullsLast().op("date_ops")),
	index().using("btree", table.type.asc().nullsLast().op("int2_ops")),
	unique("unique_worker_business_trip_type").on(table.worker_position_id, table.type, table.from, table.to),
]);

export const vacancy_users = pgTable("vacancy_users", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	uuid: uuid().notNull(),
	phone: varchar({ length: 255 }).notNull(),
	last_name: varchar({ length: 100 }),
	first_name: varchar({ length: 100 }),
	middle_name: varchar({ length: 100 }),
	photo: varchar({ length: 255 }),
	education: smallint().default(sql`'3'`).notNull(),
	phone_verified_at: timestamp({ mode: 'string' }),
	is_verified: boolean().default(false).notNull(),
	password: varchar({ length: 255 }).notNull(),
	status: boolean().default(true).notNull(),
	sex: boolean().default(false).notNull(),
	birthday: date(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	country_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	city_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	region_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	current_region_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	current_city_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	nationality_id: bigint({ mode: "number" }),
	address: varchar({ length: 255 }),
	marital_status: smallint().default(sql`'1'`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pin: bigint({ mode: "number" }),
	languages: varchar({ length: 255 }),
	remember_token: varchar({ length: 100 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.city_id.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.country_id.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.current_city_id.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.current_region_id.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.nationality_id.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.region_id.asc().nullsLast().op("int8_ops")),
	unique("vacancy_users_phone_unique").on(table.phone),
	unique("vacancy_users_pin_unique").on(table.pin),
]);

export const vacation_schedule_years = pgTable("vacation_schedule_years", {
	uuid: uuid().notNull(),
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	year: smallint().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	director_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	trade_union_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	creator_id: bigint({ mode: "number" }),
	date: date(),
	number: varchar({ length: 255 }),
	file: varchar({ length: 255 }),
	confirmation_file: varchar({ length: 255 }),
	generate: smallint().default(sql`'1'`).notNull(),
	confirmation: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.confirmation.asc().nullsLast().op("int2_ops")),
]);

export const work_durations = pgTable("work_durations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	building_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	year: integer(),
	month: smallint(),
	day: smallint(),
	total_minutes: smallint().default(sql`'0'`).notNull(),
	event_time: timestamp({ mode: 'string' }).notNull(),
	event_type: boolean().default(false).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	access_level_id: bigint({ mode: "number" }),
}, (table) => [
	index().using("btree", table.day.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.event_time.asc().nullsLast().op("timestamp_ops")),
	index().using("btree", table.event_type.asc().nullsLast().op("bool_ops")),
	index().using("btree", table.month.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops")),
	unique("unique_work_durations").on(table.building_id, table.worker_id, table.year, table.month, table.day),
]);

export const worker_academic_degrees = pgTable("worker_academic_degrees", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	type: smallint().default(sql`'2'`).notNull(),
	file: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const worker_academic_titles = pgTable("worker_academic_titles", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	type: smallint().default(sql`'1'`).notNull(),
	file: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const worker_access_levels = pgTable("worker_access_levels", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_hik_central_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_photo_id: bigint({ mode: "number" }),
	hik_central_key: smallint().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_person_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }).notNull(),
	to: timestamp({ mode: 'string' }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	status: smallint().default(sql`'1'`).notNull(),
	errors: json(),
}, (table) => [
	index("idx_person_access_pair").using("btree", table.hik_central_person_id.asc().nullsLast().op("int8_ops"), table.hik_central_access_level_id.asc().nullsLast().op("int8_ops")),
	index("idx_person_id").using("btree", table.hik_central_person_id.asc().nullsLast().op("int8_ops")),
	index("idx_worker_access_pair").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.hik_central_access_level_id.asc().nullsLast().op("int8_ops")),
	index("idx_worker_access_status").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.hik_central_access_level_id.asc().nullsLast().op("int2_ops"), table.status.asc().nullsLast().op("int8_ops")),
	uniqueIndex("wal_person_access_unique").using("btree", table.hik_central_person_id.asc().nullsLast().op("int8_ops"), table.hik_central_access_level_id.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.hik_central_key.asc().nullsLast().op("int2_ops")),
	unique("unique_worker_access_levels").on(table.worker_id, table.hik_central_access_level_id),
]);

export const worker_categories = pgTable("worker_categories", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	year: integer().notNull(),
	month: integer().notNull(),
	external_worker_count: integer().default(0).notNull(),
	external_salary_fund: doublePrecision().default(sql`'0'`).notNull(),
	capital_society_worker_count: integer().default(0).notNull(),
	capital_society_salary_fund: doublePrecision().default(sql`'0'`).notNull(),
	capital_own_use_worker_count: integer().default(0).notNull(),
	capital_own_use_salary_fund: doublePrecision().default(sql`'0'`).notNull(),
	capital_foreign_company_worker_count: integer(),
	capital_foreign_company_salary_fund: doublePrecision(),
	construction_society_worker_count: integer().default(0).notNull(),
	construction_society_salary_fund: doublePrecision().default(sql`'0'`).notNull(),
	construction_own_use_worker_count: integer().default(0).notNull(),
	construction_own_use_salary_fund: doublePrecision().default(sql`'0'`).notNull(),
	construction_foreign_company_worker_count: integer().default(0).notNull(),
	construction_foreign_company_salary_fund: doublePrecision().default(sql`'0'`).notNull(),
	other_society_worker_count: integer().default(0).notNull(),
	other_society_salary_fund: doublePrecision().default(sql`'0'`).notNull(),
	other_own_use_worker_count: integer().default(0).notNull(),
	other_own_use_salary_fund: doublePrecision().default(sql`'0'`).notNull(),
	other_foreign_company_worker_count: integer().default(0).notNull(),
	other_foreign_company_salary_fund: doublePrecision().default(sql`'0'`).notNull(),
	temporary_contract_worker_count: integer().default(0).notNull(),
	temporary_contract_salary_fund: doublePrecision().default(sql`'0'`).notNull(),
	civil_contract_worker_count: integer().default(0).notNull(),
	civil_contract_salary_fund: doublePrecision().default(sql`'0'`).notNull(),
	freelancer_worker_count: integer().default(0).notNull(),
	freelancer_salary_fund: doublePrecision().default(sql`'0'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.month.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops")),
]);

export const worker_exam_confirmations = pgTable("worker_exam_confirmations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_exam_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	position: varchar({ length: 255 }),
	type: varchar({ length: 2 }).notNull(),
	file: varchar({ length: 255 }),
	signature: text(),
	order: smallint().default(sql`'1'`).notNull(),
	main: boolean().default(false).notNull(),
	confirmation_type: smallint().default(sql`'1'`).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const worker_exam_files = pgTable("worker_exam_files", {
	uuid: uuid().notNull(),
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_exam_id: bigint({ mode: "number" }).notNull(),
	type: smallint().default(sql`'1'`).notNull(),
	file: varchar({ length: 255 }),
	confirmation_file: varchar({ length: 255 }),
	download: integer(),
	front_url: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const worker_exam_questions = pgTable("worker_exam_questions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_exam_id: bigint({ mode: "number" }).notNull(),
	question: text().notNull(),
	is_correct: boolean().default(false).notNull(),
	answers: json(),
	result: integer(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const worker_languages = pgTable("worker_languages", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	language_id: bigint({ mode: "number" }),
	file: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const worker_photos = pgTable("worker_photos", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	photo: varchar({ length: 255 }),
	current: boolean().default(true).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	size: bigint({ mode: "number" }),
}, (table) => [
	index().using("btree", table.current.asc().nullsLast().op("bool_ops")),
]);

export const worker_old_careers = pgTable("worker_old_careers", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	sort: integer().default(1).notNull(),
	from_date: date(),
	to_date: date(),
	post_name: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.sort.asc().nullsLast().op("int4_ops")),
]);

export const worker_parties = pgTable("worker_parties", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	party: smallint().default(sql`'2'`).notNull(),
	from_date: date().notNull(),
	to_date: date(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const worker_phones = pgTable("worker_phones", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	phone: bigint({ mode: "number" }),
	code: varchar({ length: 3 }).default('uzb').notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.phone.asc().nullsLast().op("int8_ops")),
]);

export const worker_hik_centrals = pgTable("worker_hik_centrals", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	hik_central_key: smallint().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_person_id: bigint({ mode: "number" }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_photo_id: bigint({ mode: "number" }),
	to: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.hik_central_key.asc().nullsLast().op("int2_ops")),
	unique("unique_worker_persons").on(table.worker_id, table.hik_central_key, table.hik_central_person_id),
]);

export const worker_disabilities = pgTable("worker_disabilities", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	level: smallint().notNull(),
	number: varchar({ length: 255 }),
	from: date(),
	to: date(),
	comment: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.level.asc().nullsLast().op("int2_ops")),
]);

export const worker_military_services = pgTable("worker_military_services", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	name: varchar({ length: 255 }),
	number: varchar({ length: 255 }),
	speciality: varchar({ length: 255 }),
	status: smallint().default(sql`'1'`).notNull(),
	commissariat: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const worker_passports = pgTable("worker_passports", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	serial_number: varchar({ length: 15 }),
	from_date: date(),
	to_date: date(),
	file: varchar({ length: 255 }),
	address: varchar({ length: 255 }),
	code: varchar({ length: 3 }).default('uzb').notNull(),
	current: boolean().default(true).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.current.asc().nullsLast().op("bool_ops")),
	index("worker_passports_current_worker_id_idx").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.id.desc().nullsFirst().op("int8_ops")).where(sql`(current = true)`),
	index().using("btree", table.to_date.asc().nullsLast().op("date_ops")),
]);

export const worker_position_schedules = pgTable("worker_position_schedules", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	schedule_id: bigint({ mode: "number" }).notNull(),
	current: boolean().default(true).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const worker_position_turnstile_privileges = pgTable("worker_position_turnstile_privileges", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }).notNull(),
	type: varchar({ length: 25 }).notNull(),
	comment: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
	unique("unique_worker_position_type").on(table.worker_position_id, table.type),
]);

export const worker_sick_leaves = pgTable("worker_sick_leaves", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }).notNull(),
	from_date: date().notNull(),
	to_date: date(),
	sick: json(),
	type: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const worker_terminals = pgTable("worker_terminals", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	terminal_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_photo_id: bigint({ mode: "number" }).notNull(),
	to: timestamp({ mode: 'string' }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.to.asc().nullsLast().op("timestamp_ops")),
	unique("unique_worker_terminal").on(table.worker_id, table.terminal_id),
]);

export const worker_universities = pgTable("worker_universities", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	university_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	speciality_id: bigint({ mode: "number" }),
	sort: integer().default(1).notNull(),
	from_date: date(),
	to_date: date(),
	number: varchar({ length: 20 }),
	diploma: date(),
	experience: integer().default(0).notNull(),
	file: varchar({ length: 255 }),
	current: boolean().default(false).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_worker_universities_worker").using("btree", table.worker_id.asc().nullsLast().op("int8_ops")).where(sql`(deleted_at IS NULL)`),
	index().using("btree", table.sort.asc().nullsLast().op("int4_ops")),
]);

export const worker_positions = pgTable("worker_positions", {
	uuid: uuid().notNull(),
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	department_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	department_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	contract_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	command_id: bigint({ mode: "number" }),
	type: integer().notNull(),
	position_date: date().notNull(),
	contract_position: boolean().default(false).notNull(),
	overstaffed: boolean().default(false).notNull(),
	probation: smallint().default(sql`'0'`).notNull(),
	vacation_main_day: smallint().default(sql`'0'`).notNull(),
	additional_vacation_day: smallint().default(sql`'0'`).notNull(),
	group: smallint().default(sql`'0'`).notNull(),
	rank: varchar({ length: 3 }),
	rate: smallint().default(sql`'100'`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	salary: bigint({ mode: "number" }),
	post_name: text(),
	status: smallint().default(sql`'2'`).notNull(),
	external: integer(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	to: date(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_type_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	is_turnstile: boolean().default(true).notNull(),
	turnstile_privilege_start_minute: integer().default(0).notNull(),
	turnstile_privilege_end_minute: integer().default(0).notNull(),
}, (table) => [
	index().using("btree", table.organization_id.asc().nullsLast().op("int2_ops"), table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.organization_id.asc().nullsLast().op("int8_ops"), table.status.asc().nullsLast().op("int8_ops"), table.worker_id.asc().nullsLast().op("int2_ops")).where(sql`(deleted_at IS NULL)`),
	index().using("btree", table.rate.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.to.asc().nullsLast().op("date_ops")),
	index().using("btree", table.type.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.worker_id.asc().nullsLast().op("int2_ops"), table.organization_id.asc().nullsLast().op("int8_ops"), table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.worker_id.asc().nullsLast().op("int2_ops"), table.status.asc().nullsLast().op("int2_ops")).where(sql`(deleted_at IS NULL)`),
	index("wp_fast_filter_idx").using("btree", table.deleted_at.asc().nullsLast().op("int2_ops"), table.status.asc().nullsLast().op("int2_ops"), table.organization_id.asc().nullsLast().op("int2_ops"), table.id.asc().nullsLast().op("int2_ops")).where(sql`(deleted_at IS NULL)`),
]);

export const zoom_meetings = pgTable("zoom_meetings", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	model_id: bigint({ mode: "number" }).notNull(),
	model_type: varchar({ length: 255 }).notNull(),
	zoom_uuid: varchar({ length: 50 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	zoom_id: bigint({ mode: "number" }).notNull(),
	meet_date_and_time: timestamp({ mode: 'string' }).notNull(),
	duration: integer().notNull(),
	details: json().notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.zoom_id.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.zoom_uuid.asc().nullsLast().op("text_ops")),
]);

export const zoom_meeting_events = pgTable("zoom_meeting_events", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	zoom_meeting_id: bigint({ mode: "number" }).notNull(),
	event: varchar({ length: 255 }).notNull(),
	details: json().notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const terminal_events_202509_01 = pgTable("terminal_events_202509_01", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_01").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_01").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_02 = pgTable("terminal_events_202509_02", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_02").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_02").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_04 = pgTable("terminal_events_202509_04", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_04").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_04").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_05 = pgTable("terminal_events_202509_05", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_05").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_05").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_06 = pgTable("terminal_events_202509_06", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_06").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_06").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_07 = pgTable("terminal_events_202509_07", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_07").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_07").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_08 = pgTable("terminal_events_202509_08", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_08").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_08").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_09 = pgTable("terminal_events_202509_09", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_09").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_09").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_10 = pgTable("terminal_events_202509_10", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_10").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_10").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_12 = pgTable("terminal_events_202509_12", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_12").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_12").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_13 = pgTable("terminal_events_202509_13", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_13").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_13").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_14 = pgTable("terminal_events_202509_14", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_14").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_14").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_16 = pgTable("terminal_events_202509_16", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_16").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_16").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_17 = pgTable("terminal_events_202509_17", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_17").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_17").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_18 = pgTable("terminal_events_202509_18", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_18").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_18").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_20 = pgTable("terminal_events_202509_20", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_20").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_20").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_21 = pgTable("terminal_events_202509_21", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_21").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_21").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_22 = pgTable("terminal_events_202509_22", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_22").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_22").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_23 = pgTable("terminal_events_202509_23", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_23").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_23").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_24 = pgTable("terminal_events_202509_24", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_24").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_24").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_25 = pgTable("terminal_events_202509_25", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_25").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_25").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_27 = pgTable("terminal_events_202509_27", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_27").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_27").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_28 = pgTable("terminal_events_202509_28", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_28").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_28").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202509_29 = pgTable("terminal_events_202509_29", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202509_29").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202509_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202509_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202509_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202509_29").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_01 = pgTable("terminal_events_202510_01", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_01").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_01").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_02 = pgTable("terminal_events_202510_02", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_02").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_02").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_04 = pgTable("terminal_events_202510_04", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_04").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_04").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_05 = pgTable("terminal_events_202510_05", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_05").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_05").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_06 = pgTable("terminal_events_202510_06", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_06").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_06").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_07 = pgTable("terminal_events_202510_07", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_07").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_07").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_08 = pgTable("terminal_events_202510_08", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_08").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_08").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_09 = pgTable("terminal_events_202510_09", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_09").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_09").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_11 = pgTable("terminal_events_202510_11", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_11").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_11").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_12 = pgTable("terminal_events_202510_12", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_12").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_12").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_13 = pgTable("terminal_events_202510_13", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_13").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_13").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_15 = pgTable("terminal_events_202510_15", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_15").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_15").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_16 = pgTable("terminal_events_202510_16", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_16").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_16").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_17 = pgTable("terminal_events_202510_17", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_17").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_17").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_19 = pgTable("terminal_events_202510_19", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_19").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_19").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_20 = pgTable("terminal_events_202510_20", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_20").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_20").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_21 = pgTable("terminal_events_202510_21", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_21").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_21").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_22 = pgTable("terminal_events_202510_22", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_22").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_22").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_23 = pgTable("terminal_events_202510_23", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_23").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_23").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_24 = pgTable("terminal_events_202510_24", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_24").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_24").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_26 = pgTable("terminal_events_202510_26", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_26").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_26").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_27 = pgTable("terminal_events_202510_27", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_27").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_27").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_28 = pgTable("terminal_events_202510_28", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_28").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_28").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_30 = pgTable("terminal_events_202510_30", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_30").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_30").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202510_31 = pgTable("terminal_events_202510_31", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202510_31").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202510_31").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202510_31").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202510_31").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202510_31").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_02 = pgTable("terminal_events_202511_02", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_02").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_02").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_03 = pgTable("terminal_events_202511_03", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_03").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_03").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_04 = pgTable("terminal_events_202511_04", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_04").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_04").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_05 = pgTable("terminal_events_202511_05", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_05").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_05").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_06 = pgTable("terminal_events_202511_06", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_06").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_06").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_07 = pgTable("terminal_events_202511_07", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_07").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_07").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_09 = pgTable("terminal_events_202511_09", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_09").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_09").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_10 = pgTable("terminal_events_202511_10", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_10").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_10").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_11 = pgTable("terminal_events_202511_11", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_11").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_11").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_13 = pgTable("terminal_events_202511_13", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_13").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_13").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_14 = pgTable("terminal_events_202511_14", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_14").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_14").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_15 = pgTable("terminal_events_202511_15", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_15").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_15").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_17 = pgTable("terminal_events_202511_17", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_17").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_17").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_18 = pgTable("terminal_events_202511_18", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_18").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_18").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_19 = pgTable("terminal_events_202511_19", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_19").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_19").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_20 = pgTable("terminal_events_202511_20", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_20").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_20").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_21 = pgTable("terminal_events_202511_21", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_21").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_21").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_22 = pgTable("terminal_events_202511_22", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_22").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_22").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_24 = pgTable("terminal_events_202511_24", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_24").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_24").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_25 = pgTable("terminal_events_202511_25", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_25").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_25").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_26 = pgTable("terminal_events_202511_26", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_26").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_26").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_28 = pgTable("terminal_events_202511_28", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_28").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_28").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_29 = pgTable("terminal_events_202511_29", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_29").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_29").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202511_30 = pgTable("terminal_events_202511_30", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202511_30").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202511_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202511_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202511_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202511_30").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_01 = pgTable("terminal_events_202512_01", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_01").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_01").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_03 = pgTable("terminal_events_202512_03", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_03").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_03").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_04 = pgTable("terminal_events_202512_04", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_04").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_04").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_05 = pgTable("terminal_events_202512_05", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_05").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_05").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_06 = pgTable("terminal_events_202512_06", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_06").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_06").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_08 = pgTable("terminal_events_202512_08", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_08").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_08").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_09 = pgTable("terminal_events_202512_09", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_09").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_09").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_10 = pgTable("terminal_events_202512_10", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_10").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_10").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_12 = pgTable("terminal_events_202512_12", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_12").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_12").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_13 = pgTable("terminal_events_202512_13", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_13").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_13").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_14 = pgTable("terminal_events_202512_14", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_14").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_14").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_16 = pgTable("terminal_events_202512_16", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_16").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_16").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_17 = pgTable("terminal_events_202512_17", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_17").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_17").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_18 = pgTable("terminal_events_202512_18", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_18").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_18").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_19 = pgTable("terminal_events_202512_19", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_19").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_19").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_20 = pgTable("terminal_events_202512_20", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_20").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_20").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_21 = pgTable("terminal_events_202512_21", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_21").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_21").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_23 = pgTable("terminal_events_202512_23", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_23").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_23").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_24 = pgTable("terminal_events_202512_24", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_24").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_24").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_25 = pgTable("terminal_events_202512_25", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_25").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_25").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_27 = pgTable("terminal_events_202512_27", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_27").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_27").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_28 = pgTable("terminal_events_202512_28", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_28").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_28").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_29 = pgTable("terminal_events_202512_29", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_29").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_29").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202512_31 = pgTable("terminal_events_202512_31", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202512_31").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202512_31").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction = true) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202512_31").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction = false) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202512_31").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202512_31").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_01 = pgTable("terminal_events_202601_01", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_01").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_01").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_02 = pgTable("terminal_events_202601_02", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_02").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_02").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_03 = pgTable("terminal_events_202601_03", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_03").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_03").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_04 = pgTable("terminal_events_202601_04", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_04").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_04").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_06 = pgTable("terminal_events_202601_06", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_06").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_06").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_07 = pgTable("terminal_events_202601_07", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_07").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_07").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_08 = pgTable("terminal_events_202601_08", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_08").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_08").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_10 = pgTable("terminal_events_202601_10", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_10").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_10").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_11 = pgTable("terminal_events_202601_11", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_11").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_11").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_12 = pgTable("terminal_events_202601_12", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_12").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_12").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_14 = pgTable("terminal_events_202601_14", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_14").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_14").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_15 = pgTable("terminal_events_202601_15", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_15").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_15").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_16 = pgTable("terminal_events_202601_16", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_16").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_16").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_17 = pgTable("terminal_events_202601_17", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_17").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_17").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_18 = pgTable("terminal_events_202601_18", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_18").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_18").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_19 = pgTable("terminal_events_202601_19", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_19").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_19").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_21 = pgTable("terminal_events_202601_21", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_21").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_21").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_22 = pgTable("terminal_events_202601_22", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_22").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_22").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_23 = pgTable("terminal_events_202601_23", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_23").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_23").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_25 = pgTable("terminal_events_202601_25", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_25").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_25").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_26 = pgTable("terminal_events_202601_26", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_26").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_26").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_27 = pgTable("terminal_events_202601_27", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_27").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_27").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_29 = pgTable("terminal_events_202601_29", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_29").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_29").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_30 = pgTable("terminal_events_202601_30", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_30").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_30").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202601_31 = pgTable("terminal_events_202601_31", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202601_31").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202601_31").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202601_31").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202601_31").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202601_31").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_01 = pgTable("terminal_events_202602_01", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_01").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_01").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_02 = pgTable("terminal_events_202602_02", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_02").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_02").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_04 = pgTable("terminal_events_202602_04", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_04").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_04").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_05 = pgTable("terminal_events_202602_05", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_05").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_05").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_06 = pgTable("terminal_events_202602_06", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_06").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_06").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_08 = pgTable("terminal_events_202602_08", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_08").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_08").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_09 = pgTable("terminal_events_202602_09", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_09").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_09").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_10 = pgTable("terminal_events_202602_10", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_10").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_10").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_12 = pgTable("terminal_events_202602_12", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_12").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_12").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_13 = pgTable("terminal_events_202602_13", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_13").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_13").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_14 = pgTable("terminal_events_202602_14", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_14").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_14").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_15 = pgTable("terminal_events_202602_15", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_15").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_15").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_16 = pgTable("terminal_events_202602_16", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_16").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_16").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_17 = pgTable("terminal_events_202602_17", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_17").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_17").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_19 = pgTable("terminal_events_202602_19", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_19").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_19").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_20 = pgTable("terminal_events_202602_20", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_20").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_20").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_21 = pgTable("terminal_events_202602_21", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_21").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_21").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_23 = pgTable("terminal_events_202602_23", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_23").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_23").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_24 = pgTable("terminal_events_202602_24", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_24").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_24").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_25 = pgTable("terminal_events_202602_25", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_25").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_25").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_27 = pgTable("terminal_events_202602_27", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_27").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_27").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202602_28 = pgTable("terminal_events_202602_28", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202602_28").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202602_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202602_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202602_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202602_28").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_01 = pgTable("terminal_events_202603_01", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_01").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_01").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_02 = pgTable("terminal_events_202603_02", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_02").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_02").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_03 = pgTable("terminal_events_202603_03", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_03").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_03").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_05 = pgTable("terminal_events_202603_05", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_05").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_05").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_06 = pgTable("terminal_events_202603_06", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_06").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_06").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_07 = pgTable("terminal_events_202603_07", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_07").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_07").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_09 = pgTable("terminal_events_202603_09", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_09").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_09").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_10 = pgTable("terminal_events_202603_10", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_10").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_10").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_11 = pgTable("terminal_events_202603_11", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_11").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_11").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_13 = pgTable("terminal_events_202603_13", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_13").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_13").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_14 = pgTable("terminal_events_202603_14", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_14").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_14").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_15 = pgTable("terminal_events_202603_15", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_15").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_15").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_16 = pgTable("terminal_events_202603_16", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_16").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_16").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_17 = pgTable("terminal_events_202603_17", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_17").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_17").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_18 = pgTable("terminal_events_202603_18", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_18").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_18").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_20 = pgTable("terminal_events_202603_20", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_20").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_20").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_21 = pgTable("terminal_events_202603_21", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_21").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_21").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_22 = pgTable("terminal_events_202603_22", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_22").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_22").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_24 = pgTable("terminal_events_202603_24", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_24").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_24").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_25 = pgTable("terminal_events_202603_25", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_25").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_25").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_26 = pgTable("terminal_events_202603_26", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_26").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_26").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_28 = pgTable("terminal_events_202603_28", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_28").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_28").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_29 = pgTable("terminal_events_202603_29", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_29").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_29").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_30 = pgTable("terminal_events_202603_30", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_30").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_30").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202603_31 = pgTable("terminal_events_202603_31", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202603_31").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202603_31").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202603_31").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202603_31").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202603_31").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_01 = pgTable("terminal_events_202604_01", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_01").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_01").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_01").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_03 = pgTable("terminal_events_202604_03", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_03").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_03").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_04 = pgTable("terminal_events_202604_04", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_04").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_04").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_05 = pgTable("terminal_events_202604_05", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_05").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_05").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_05").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_07 = pgTable("terminal_events_202604_07", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_07").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_07").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_08 = pgTable("terminal_events_202604_08", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_08").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_08").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_09 = pgTable("terminal_events_202604_09", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_09").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_09").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_09").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_11 = pgTable("terminal_events_202604_11", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_11").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_11").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_12 = pgTable("terminal_events_202604_12", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_12").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_12").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_13 = pgTable("terminal_events_202604_13", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_13").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_13").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_14 = pgTable("terminal_events_202604_14", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_14").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_14").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_15 = pgTable("terminal_events_202604_15", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_15").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_15").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_16 = pgTable("terminal_events_202604_16", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_16").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_16").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_16").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_18 = pgTable("terminal_events_202604_18", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_18").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_18").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_19 = pgTable("terminal_events_202604_19", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_19").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_19").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_20 = pgTable("terminal_events_202604_20", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_20").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_20").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_20").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_22 = pgTable("terminal_events_202604_22", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_22").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_22").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_23 = pgTable("terminal_events_202604_23", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_23").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_23").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_24 = pgTable("terminal_events_202604_24", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_24").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_24").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_24").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_26 = pgTable("terminal_events_202604_26", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_26").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_26").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_27 = pgTable("terminal_events_202604_27", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_27").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_27").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_28 = pgTable("terminal_events_202604_28", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_28").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_28").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_29 = pgTable("terminal_events_202604_29", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_29").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_29").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202604_30 = pgTable("terminal_events_202604_30", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202604_30").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202604_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202604_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202604_30").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202604_30").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_02 = pgTable("terminal_events_202605_02", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_02").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_02").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_02").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_03 = pgTable("terminal_events_202605_03", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_03").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_03").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_03").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_04 = pgTable("terminal_events_202605_04", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_04").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_04").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_04").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_06 = pgTable("terminal_events_202605_06", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_06").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_06").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_06").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_07 = pgTable("terminal_events_202605_07", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_07").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_07").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_07").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_08 = pgTable("terminal_events_202605_08", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_08").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_08").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_08").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_10 = pgTable("terminal_events_202605_10", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_10").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_10").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_10").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_11 = pgTable("terminal_events_202605_11", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_11").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_11").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_11").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_12 = pgTable("terminal_events_202605_12", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_12").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_12").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_12").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_13 = pgTable("terminal_events_202605_13", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_13").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_13").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_13").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_14 = pgTable("terminal_events_202605_14", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_14").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_14").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_14").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_15 = pgTable("terminal_events_202605_15", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_15").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_15").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_15").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_17 = pgTable("terminal_events_202605_17", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_17").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_17").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_17").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_18 = pgTable("terminal_events_202605_18", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_18").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_18").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_18").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_19 = pgTable("terminal_events_202605_19", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_19").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_19").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_19").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_21 = pgTable("terminal_events_202605_21", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_21").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_21").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_21").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_22 = pgTable("terminal_events_202605_22", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_22").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_22").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_22").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_23 = pgTable("terminal_events_202605_23", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_23").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_23").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_23").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_25 = pgTable("terminal_events_202605_25", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_25").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_25").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_25").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_26 = pgTable("terminal_events_202605_26", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_26").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_26").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_26").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_27 = pgTable("terminal_events_202605_27", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_27").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_27").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_27").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_28 = pgTable("terminal_events_202605_28", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_28").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_28").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_28").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_29 = pgTable("terminal_events_202605_29", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_29").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_29").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_29").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const terminal_events_202605_31 = pgTable("terminal_events_202605_31", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('terminal_events_partitioned_id_seq'::regclass)`).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hik_central_access_level_id: bigint({ mode: "number" }),
	event_date_and_time: timestamp({ mode: 'string' }).notNull(),
	auth_type: varchar({ length: 60 }),
	device_name: varchar({ length: 255 }),
	device_serial: varchar({ length: 50 }),
	resource_name: varchar({ length: 255 }),
	last_name: varchar({ length: 255 }),
	first_name: varchar({ length: 255 }),
	middle_name: varchar({ length: 255 }),
	direction: boolean(),
	temperature: doublePrecision(),
	mask_status: smallint(),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("idx_access_level_date_terminal_events_202605_31").using("btree", table.hik_central_access_level_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_direction_in_terminal_events_202605_31").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.asc().nullsLast().op("int8_ops")).where(sql`((direction IS TRUE) AND (deleted_at IS NULL))`),
	index("idx_direction_out_terminal_events_202605_31").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("int8_ops")).where(sql`((direction IS FALSE) AND (deleted_at IS NULL))`),
	index("idx_worker_date_terminal_events_202605_31").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.event_date_and_time.desc().nullsFirst().op("timestamp_ops")).where(sql`(deleted_at IS NULL)`),
	unique("unique_worker_events_terminal_events_202605_31").on(table.worker_id, table.event_date_and_time, table.direction),
]);

export const users = pgTable("users", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	uuid: uuid().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	phone: bigint({ mode: "number" }).notNull(),
	phone_verified_at: timestamp({ mode: 'string' }),
	is_verified: boolean().default(false).notNull(),
	password: varchar({ length: 255 }).notNull(),
	status: boolean().default(true).notNull(),
	remember_token: varchar({ length: 100 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	password_changed_at: timestamp({ mode: 'string' }),
}, (table) => [
	unique("users_uuid_unique").on(table.uuid),
	unique("unique_users_columns").on(table.phone, table.worker_id),
	unique("users_phone_unique").on(table.phone),
]);

export const a_i_questions = pgTable("a_i_questions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	question: text().notNull(),
	answer: text().notNull(),
	like: boolean().default(true).notNull(),
	cost: doublePrecision().default(sql`'0'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const app_instruction_photos = pgTable("app_instruction_photos", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	app_instruction_id: bigint({ mode: "number" }).notNull(),
	photo: varchar({ length: 255 }).notNull(),
	lang: varchar({ length: 2 }).default('uz').notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.lang.asc().nullsLast().op("text_ops")),
]);

export const organizations = pgTable("organizations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	city_id: bigint({ mode: "number" }).notNull(),
	sort: smallint().default(sql`'1'`).notNull(),
	code: varchar({ length: 15 }).notNull(),
	name: varchar({ length: 255 }),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	full_name: varchar({ length: 255 }),
	level: integer().notNull(),
	_lft: integer().default(0).notNull(),
	_rgt: integer().default(0).notNull(),
	parent_id: integer(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	inn: bigint({ mode: "number" }),
	lat: varchar({ length: 30 }),
	long: varchar({ length: 30 }),
	address: varchar({ length: 255 }),
	group: boolean().default(false).notNull(),
	external: integer().default(0).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	command_address: varchar({ length: 50 }),
	bot_token: varchar({ length: 255 }),
}, (table) => [
	index().using("btree", table._lft.asc().nullsLast().op("int4_ops"), table._rgt.asc().nullsLast().op("int4_ops"), table.parent_id.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.code.asc().nullsLast().op("text_ops")),
	index().using("btree", table.level.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.sort.asc().nullsLast().op("int2_ops")),
]);

export const chat_news_translations = pgTable("chat_news_translations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	chat_news_id: bigint({ mode: "number" }).notNull(),
	locale: varchar({ length: 2 }).notNull(),
	title: varchar({ length: 255 }),
	short_description: varchar({ length: 255 }),
	content: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.locale.asc().nullsLast().op("text_ops")),
]);

export const regions = pgTable("regions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	country_id: bigint({ mode: "number" }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	lat: varchar({ length: 30 }),
	long: varchar({ length: 30 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const commands = pgTable("commands", {
	uuid: uuid().notNull(),
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	type: smallint().default(sql`'1'`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	director_id: bigint({ mode: "number" }),
	command_date: date(),
	command_number: varchar({ length: 15 }),
	file: varchar({ length: 255 }),
	confirmation_file: varchar({ length: 255 }),
	confirmation: smallint().default(sql`'1'`).notNull(),
	contract_model_type: varchar({ length: 255 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	contract_model_id: bigint({ mode: "number" }),
	generate: smallint().default(sql`'2'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.command_date.asc().nullsLast().op("date_ops")),
	index().using("btree", table.confirmation.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("int2_ops")),
]);

export const workers = pgTable("workers", {
	uuid: uuid().notNull(),
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	country_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	region_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	city_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	current_region_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	current_city_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	nationality_id: bigint({ mode: "number" }),
	last_name: varchar({ length: 100 }),
	first_name: varchar({ length: 100 }),
	middle_name: varchar({ length: 100 }),
	photo: varchar({ length: 255 }),
	birthday: date().notNull(),
	sex: boolean().default(true).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pin: bigint({ mode: "number" }),
	address: varchar({ length: 255 }),
	work_experience: integer().default(0).notNull(),
	experience_date: date(),
	marital_status: smallint().default(sql`'1'`).notNull(),
	external: integer(),
	birth_day: smallint(),
	birth_month: smallint(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	education: smallint().default(sql`'1'`).notNull(),
	card: integer(),
}, (table) => [
	index("idx_workers_deleted_at_null").using("btree", table.id.asc().nullsLast().op("int8_ops")).where(sql`(deleted_at IS NULL)`),
	index().using("btree", table.birth_day.asc().nullsLast().op("int2_ops")),
	index("workers_birth_month_day_idx").using("btree", table.birth_month.asc().nullsLast().op("int2_ops"), table.birth_day.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.birth_month.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.birthday.asc().nullsLast().op("date_ops")),
	index().using("btree", table.city_id.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.country_id.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.current_city_id.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.current_region_id.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.education.asc().nullsLast().op("int2_ops")),
	index("workers_last_name_first_name_middle_name_fulltext").using("gin", sql`(((to_tsvector('english'::regconfig, (last_name)::text) || to_t`),
	index().using("btree", table.nationality_id.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.region_id.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.sex.asc().nullsLast().op("bool_ops")),
	unique("workers_pin_unique").on(table.pin),
	unique("workers_card_unique").on(table.card),
]);

export const contract_additional = pgTable("contract_additional", {
	uuid: uuid().notNull(),
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	contract_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	director_id: bigint({ mode: "number" }),
	command_status: smallint().default(sql`'1'`).notNull(),
	number: integer(),
	contract_date: date(),
	contract_to_date: date(),
	file: varchar({ length: 255 }),
	confirmation_file: varchar({ length: 255 }),
	type: smallint().default(sql`'1'`).notNull(),
	confirmation: smallint().default(sql`'1'`).notNull(),
	generate: smallint().default(sql`'2'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.confirmation.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.contract_date.asc().nullsLast().op("date_ops")),
	index().using("btree", table.type.asc().nullsLast().op("int2_ops")),
]);

export const contract_additional_confirmations = pgTable("contract_additional_confirmations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	contract_additional_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	position: varchar({ length: 255 }),
	type: varchar({ length: 2 }).notNull(),
	file: varchar({ length: 255 }),
	signature: text(),
	order: smallint().default(sql`'1'`).notNull(),
	main: boolean().default(false).notNull(),
	confirmation_type: smallint().default(sql`'1'`).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const departments = pgTable("departments", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	sort: integer().default(1).notNull(),
	name: varchar({ length: 255 }).notNull(),
	level: smallint().notNull(),
	_lft: integer().default(0).notNull(),
	_rgt: integer().default(0).notNull(),
	parent_id: integer(),
	external: integer(),
	active: boolean().default(true).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	comment: text(),
	is_correct: smallint().default(sql`'1'`).notNull(),
}, (table) => [
	index().using("btree", table._lft.asc().nullsLast().op("int4_ops"), table._rgt.asc().nullsLast().op("int4_ops"), table.parent_id.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.level.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.sort.asc().nullsLast().op("int4_ops")),
]);

export const positions = pgTable("positions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	category: smallint().default(sql`'2'`).notNull(),
	file: varchar({ length: 255 }),
	classification_index: integer(),
	classification_code: integer(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
});

export const worker_applications = pgTable("worker_applications", {
	uuid: uuid().notNull(),
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	director_id: bigint({ mode: "number" }),
	number: integer().notNull(),
	year: integer().default(2025).notNull(),
	application_date: date().default('2025-05-10').notNull(),
	type: smallint().default(sql`'1'`).notNull(),
	file: varchar({ length: 255 }),
	confirmation_file: varchar({ length: 255 }),
	status: smallint().default(0).notNull(),
	generate: smallint().default(sql`'2'`).notNull(),
	confirmation: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.number.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.year.asc().nullsLast().op("int4_ops")),
]);

export const edu_plans = pgTable("edu_plans", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 255 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	learning_center_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	specialization_id: bigint({ mode: "number" }).notNull(),
	type: smallint().default(sql`'1'`).notNull(),
	start_date: date(),
	hours: integer(),
	count_groups: integer().default(1).notNull(),
	count_workers: integer().default(30).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	end_date: date(),
	serial: smallint().default(sql`'1'`).notNull(),
}, (table) => [
	index().using("btree", table.start_date.asc().nullsLast().op("date_ops")),
]);

export const exams = pgTable("exams", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	topic_id: bigint({ mode: "number" }),
	name: varchar({ length: 255 }),
	deadline: timestamp({ mode: 'string' }),
	variant: integer().default(4).notNull(),
	minute: integer().default(45).notNull(),
	tests_count: integer().default(36).notNull(),
	chances: integer().default(1).notNull(),
	active: boolean().default(false).notNull(),
	description: text(),
	whom: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	camera: boolean().default(false).notNull(),
}, (table) => [
]);

export const lessons = pgTable("lessons", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	learning_center_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	edu_plan_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	group_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	subject_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	teacher_id: bigint({ mode: "number" }).notNull(),
	name: varchar({ length: 255 }),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	lesson_date: date().notNull(),
	start_time: time().notNull(),
	end_time: time().notNull(),
	zoom_meeting_uuid: varchar({ length: 255 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	zoom_meeting_id: bigint({ mode: "number" }),
	zoom_start_url: text(),
	zoom_join_url: varchar({ length: 255 }),
	zoom_password: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.end_time.asc().nullsLast().op("time_ops")),
	index().using("btree", table.lesson_date.asc().nullsLast().op("date_ops")),
	index().using("btree", table.start_time.asc().nullsLast().op("time_ops")),
]);

export const edu_plan_subjects = pgTable("edu_plan_subjects", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	edu_plan_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	subject_id: bigint({ mode: "number" }).notNull(),
}, (table) => [
]);

export const subjects = pgTable("subjects", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	name_ru: varchar({ length: 255 }),
	name_en: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
});

export const edu_plan_workers = pgTable("edu_plan_workers", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	learning_center_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	edu_plan_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	group_id: bigint({ mode: "number" }),
	status: smallint().default(sql`'1'`).notNull(),
}, (table) => [
]);

export const exam_categories = pgTable("exam_categories", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	name: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
}, (table) => [
]);

export const exam_category_options = pgTable("exam_category_options", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	category_question_id: bigint({ mode: "number" }),
	text: text().notNull(),
	is_correct: boolean().default(false).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const worker_exams = pgTable("worker_exams", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	exam_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }).notNull(),
	created: timestamp({ mode: 'string' }),
	ended: timestamp({ mode: 'string' }),
	result: integer(),
	active_token: varchar({ length: 255 }),
	user_agent: varchar({ length: 255 }),
	ip_address: varchar({ length: 15 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	topic_id: bigint({ mode: "number" }),
	video_path: varchar({ length: 255 }),
}, (table) => [
]);

export const topics = pgTable("topics", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	name: varchar({ length: 255 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	type: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
}, (table) => [
]);

export const export_worker_errors = pgTable("export_worker_errors", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	export_worker_to_hik_central_job_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
	comment: text(),
}, (table) => [
]);

export const teachers = pgTable("teachers", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	learning_center_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const liveness_session_photos = pgTable("liveness_session_photos", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	liveness_session_id: bigint({ mode: "number" }).notNull(),
	photo: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const lms_certificates = pgTable("lms_certificates", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	uuid: uuid().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	edu_plan_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	edu_plan_worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	group_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lms_protocol_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	director_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	user_id: bigint({ mode: "number" }),
	cert_from: date(),
	cert_to: date(),
	serial: varchar({ length: 5 }),
	number: integer(),
	position_type: smallint().default(sql`'1'`).notNull(),
	start_exam_result: varchar({ length: 255 }),
	end_exam_result: varchar({ length: 255 }),
	confirmation_file: varchar({ length: 255 }),
	file: varchar({ length: 255 }),
	confirmation: smallint().default(sql`'1'`).notNull(),
	generate: smallint().default(sql`'2'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.cert_from.asc().nullsLast().op("date_ops")),
	index().using("btree", table.cert_to.asc().nullsLast().op("date_ops")),
	index().using("btree", table.confirmation.asc().nullsLast().op("int2_ops")),
	unique("worker_group_unique").on(table.group_id, table.worker_id),
]);

export const terminals = pgTable("terminals", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	building_id: bigint({ mode: "number" }).notNull(),
	name: varchar({ length: 100 }),
	name_ru: varchar({ length: 100 }),
	name_en: varchar({ length: 100 }),
	ip_address: inet(),
	server_ip: inet(),
	url: varchar({ length: 255 }),
	last_updated: timestamp({ mode: 'string' }),
	type: boolean().default(false).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.ip_address.asc().nullsLast().op("inet_ops")),
	index().using("btree", table.server_ip.asc().nullsLast().op("inet_ops")),
]);

export const position_instruction_workers = pgTable("position_instruction_workers", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	position_instruction_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const report_confirmations = pgTable("report_confirmations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	report_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	position: varchar({ length: 255 }),
	type: varchar({ length: 2 }).notNull(),
	file: varchar({ length: 255 }),
	signature: text(),
	order: smallint().default(sql`'1'`).notNull(),
	main: boolean().default(false).notNull(),
	confirmation_type: smallint().default(sql`'1'`).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const staffing_approve_confirmations = pgTable("staffing_approve_confirmations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	staffing_approve_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	position: varchar({ length: 255 }),
	type: varchar({ length: 2 }).notNull(),
	file: varchar({ length: 255 }),
	signature: text(),
	order: smallint().default(sql`'1'`).notNull(),
	main: boolean().default(false).notNull(),
	confirmation_type: smallint().default(sql`'1'`).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const time_sheet_workers = pgTable("time_sheet_workers", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	time_sheet_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	work_date: date().notNull(),
	hours: integer().default(0).notNull(),
	comment: varchar({ length: 255 }),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.work_date.asc().nullsLast().op("date_ops")),
	unique("unique_timesheet_worker_date").on(table.time_sheet_id, table.worker_position_id, table.status, table.work_date),
]);

export const vacancy_application_exam_questions = pgTable("vacancy_application_exam_questions", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vacancy_application_exam_id: bigint({ mode: "number" }).notNull(),
	question: text().notNull(),
	is_correct: boolean().default(false).notNull(),
	answers: json(),
	result: integer(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
]);

export const vacation_schedule_confirmations = pgTable("vacation_schedule_confirmations", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vacation_schedule_year_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	position: text(),
	type: varchar({ length: 2 }).notNull(),
	file: varchar({ length: 255 }),
	signature: text(),
	order: smallint().default(sql`'1'`).notNull(),
	main: boolean().default(false).notNull(),
	confirmation_type: smallint().default(sql`'1'`).notNull(),
	status: smallint().default(sql`'1'`).notNull(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.status.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.type.asc().nullsLast().op("text_ops")),
	unique("vacation_schedule_year_worker_unique").on(table.vacation_schedule_year_id, table.worker_id),
]);

export const worker_relatives = pgTable("worker_relatives", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	relative_worker_id: bigint({ mode: "number" }),
	relative: smallint().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pin: bigint({ mode: "number" }),
	sort: integer().default(1).notNull(),
	birthday: date(),
	last_name: varchar({ length: 100 }),
	first_name: varchar({ length: 100 }),
	middle_name: varchar({ length: 100 }),
	birth_place: varchar({ length: 255 }),
	post_name: text(),
	address: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.relative.asc().nullsLast().op("int2_ops")),
	index().using("btree", table.sort.asc().nullsLast().op("int4_ops")),
]);

export const worker_relative_disabilities = pgTable("worker_relative_disabilities", {
	id: bigserial({ mode: "number" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_relative_id: bigint({ mode: "number" }).notNull(),
	level: smallint().notNull(),
	number: varchar({ length: 255 }),
	from: date(),
	to: date(),
	comment: text(),
	created_at: timestamp({ mode: 'string' }),
	updated_at: timestamp({ mode: 'string' }),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index().using("btree", table.level.asc().nullsLast().op("int2_ops")),
]);

export const role_has_permissions = pgTable("role_has_permissions", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	permission_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	role_id: bigint({ mode: "number" }).notNull(),
}, (table) => [
	primaryKey({ columns: [table.permission_id, table.role_id], name: "role_has_permissions_pkey"}),
]);

export const model_has_permissions = pgTable("model_has_permissions", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	permission_id: bigint({ mode: "number" }).notNull(),
	model_type: varchar({ length: 255 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	model_id: bigint({ mode: "number" }).notNull(),
}, (table) => [
	index().using("btree", table.model_id.asc().nullsLast().op("text_ops"), table.model_type.asc().nullsLast().op("text_ops")),
	primaryKey({ columns: [table.permission_id, table.model_type, table.model_id], name: "model_has_permissions_pkey"}),
]);

export const model_has_roles = pgTable("model_has_roles", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	role_id: bigint({ mode: "number" }).notNull(),
	model_type: varchar({ length: 255 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	model_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	organization_id: bigint({ mode: "number" }).notNull(),
}, (table) => [
	index().using("btree", table.model_id.asc().nullsLast().op("text_ops"), table.model_type.asc().nullsLast().op("text_ops")),
	primaryKey({ columns: [table.role_id, table.model_type, table.model_id, table.organization_id], name: "model_has_roles_pkey"}),
]);

export const turnstile_worker_schedules_2025_01 = pgTable("turnstile_worker_schedules_2025_01", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2025_01_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2025_01_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2025_01_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2025_01_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2025_01_pkey"}),
	unique("turnstile_worker_schedules_20_worker_id_worker_position_id__key").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2025_02 = pgTable("turnstile_worker_schedules_2025_02", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2025_02_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2025_02_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2025_02_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2025_02_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2025_02_pkey"}),
	unique("turnstile_worker_schedules_20_worker_id_worker_position_id_key1").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2025_03 = pgTable("turnstile_worker_schedules_2025_03", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2025_03_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2025_03_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2025_03_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2025_03_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2025_03_pkey"}),
	unique("turnstile_worker_schedules_20_worker_id_worker_position_id_key2").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2025_04 = pgTable("turnstile_worker_schedules_2025_04", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2025_04_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2025_04_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2025_04_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2025_04_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2025_04_pkey"}),
	unique("turnstile_worker_schedules_20_worker_id_worker_position_id_key3").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2025_05 = pgTable("turnstile_worker_schedules_2025_05", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2025_05_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2025_05_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2025_05_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2025_05_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2025_05_pkey"}),
	unique("turnstile_worker_schedules_20_worker_id_worker_position_id_key4").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2025_06 = pgTable("turnstile_worker_schedules_2025_06", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2025_06_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2025_06_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2025_06_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2025_06_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2025_06_pkey"}),
	unique("turnstile_worker_schedules_20_worker_id_worker_position_id_key5").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2025_07 = pgTable("turnstile_worker_schedules_2025_07", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2025_07_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2025_07_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2025_07_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2025_07_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2025_07_pkey"}),
	unique("turnstile_worker_schedules_20_worker_id_worker_position_id_key6").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2025_08 = pgTable("turnstile_worker_schedules_2025_08", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2025_08_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2025_08_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2025_08_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2025_08_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2025_08_pkey"}),
	unique("turnstile_worker_schedules_20_worker_id_worker_position_id_key7").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2025_09 = pgTable("turnstile_worker_schedules_2025_09", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2025_09_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2025_09_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2025_09_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2025_09_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2025_09_pkey"}),
	unique("turnstile_worker_schedules_20_worker_id_worker_position_id_key8").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2025_10 = pgTable("turnstile_worker_schedules_2025_10", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2025_10_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2025_10_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2025_10_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2025_10_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2025_10_pkey"}),
	unique("turnstile_worker_schedules_20_worker_id_worker_position_id_key9").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2025_11 = pgTable("turnstile_worker_schedules_2025_11", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2025_11_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2025_11_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2025_11_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2025_11_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2025_11_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key10").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2025_12 = pgTable("turnstile_worker_schedules_2025_12", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2025_12_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2025_12_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2025_12_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2025_12_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2025_12_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key11").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2026_01 = pgTable("turnstile_worker_schedules_2026_01", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2026_01_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2026_01_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2026_01_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2026_01_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2026_01_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key12").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2026_02 = pgTable("turnstile_worker_schedules_2026_02", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2026_02_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2026_02_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2026_02_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2026_02_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2026_02_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key13").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2026_03 = pgTable("turnstile_worker_schedules_2026_03", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2026_03_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2026_03_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2026_03_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2026_03_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2026_03_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key14").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2026_04 = pgTable("turnstile_worker_schedules_2026_04", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2026_04_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2026_04_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2026_04_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2026_04_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2026_04_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key15").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2026_05 = pgTable("turnstile_worker_schedules_2026_05", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2026_05_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2026_05_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2026_05_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2026_05_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2026_05_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key16").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2026_06 = pgTable("turnstile_worker_schedules_2026_06", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2026_06_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2026_06_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2026_06_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2026_06_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2026_06_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key17").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2026_07 = pgTable("turnstile_worker_schedules_2026_07", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2026_07_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2026_07_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2026_07_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2026_07_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2026_07_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key18").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2026_08 = pgTable("turnstile_worker_schedules_2026_08", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2026_08_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2026_08_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2026_08_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2026_08_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2026_08_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key19").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2026_09 = pgTable("turnstile_worker_schedules_2026_09", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2026_09_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2026_09_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2026_09_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2026_09_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2026_09_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key20").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2026_10 = pgTable("turnstile_worker_schedules_2026_10", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2026_10_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2026_10_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2026_10_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2026_10_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2026_10_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key21").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2026_11 = pgTable("turnstile_worker_schedules_2026_11", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2026_11_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2026_11_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2026_11_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2026_11_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2026_11_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key22").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2026_12 = pgTable("turnstile_worker_schedules_2026_12", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2026_12_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2026_12_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2026_12_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2026_12_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2026_12_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key23").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2027_01 = pgTable("turnstile_worker_schedules_2027_01", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2027_01_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	uniqueIndex("turnstile_worker_schedules_2027_01_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("turnstile_worker_schedules_2027_01_w_date_index").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2027_01_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2027_01_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2027_01_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key36").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2027_02 = pgTable("turnstile_worker_schedules_2027_02", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2027_02_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	uniqueIndex("turnstile_worker_schedules_2027_02_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("turnstile_worker_schedules_2027_02_w_date_index").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2027_02_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2027_02_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2027_02_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key37").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2027_03 = pgTable("turnstile_worker_schedules_2027_03", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2027_03_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	uniqueIndex("turnstile_worker_schedules_2027_03_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("turnstile_worker_schedules_2027_03_w_date_index").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2027_03_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2027_03_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2027_03_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key38").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2027_04 = pgTable("turnstile_worker_schedules_2027_04", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2027_04_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	uniqueIndex("turnstile_worker_schedules_2027_04_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("turnstile_worker_schedules_2027_04_w_date_index").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2027_04_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2027_04_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2027_04_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key39").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2027_05 = pgTable("turnstile_worker_schedules_2027_05", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2027_05_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	uniqueIndex("turnstile_worker_schedules_2027_05_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("turnstile_worker_schedules_2027_05_w_date_index").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2027_05_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2027_05_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2027_05_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key40").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2027_06 = pgTable("turnstile_worker_schedules_2027_06", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2027_06_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	uniqueIndex("turnstile_worker_schedules_2027_06_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("turnstile_worker_schedules_2027_06_w_date_index").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2027_06_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2027_06_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2027_06_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key41").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2027_07 = pgTable("turnstile_worker_schedules_2027_07", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2027_07_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	uniqueIndex("turnstile_worker_schedules_2027_07_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("turnstile_worker_schedules_2027_07_w_date_index").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2027_07_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2027_07_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2027_07_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key42").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2027_08 = pgTable("turnstile_worker_schedules_2027_08", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2027_08_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	uniqueIndex("turnstile_worker_schedules_2027_08_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("turnstile_worker_schedules_2027_08_w_date_index").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2027_08_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2027_08_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2027_08_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key43").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2027_09 = pgTable("turnstile_worker_schedules_2027_09", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2027_09_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	uniqueIndex("turnstile_worker_schedules_2027_09_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("turnstile_worker_schedules_2027_09_w_date_index").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2027_09_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2027_09_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2027_09_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key44").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2027_10 = pgTable("turnstile_worker_schedules_2027_10", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2027_10_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	uniqueIndex("turnstile_worker_schedules_2027_10_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("turnstile_worker_schedules_2027_10_w_date_index").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2027_10_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2027_10_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2027_10_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key45").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2027_11 = pgTable("turnstile_worker_schedules_2027_11", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2027_11_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	uniqueIndex("turnstile_worker_schedules_2027_11_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("turnstile_worker_schedules_2027_11_w_date_index").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2027_11_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2027_11_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2027_11_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key46").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2027_12 = pgTable("turnstile_worker_schedules_2027_12", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2027_12_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	uniqueIndex("turnstile_worker_schedules_2027_12_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("turnstile_worker_schedules_2027_12_w_date_index").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2027_12_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2027_12_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2027_12_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key47").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2028_01 = pgTable("turnstile_worker_schedules_2028_01", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2028_01_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2028_01_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2028_01_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2028_01_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2028_01_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key24").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2028_02 = pgTable("turnstile_worker_schedules_2028_02", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2028_02_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2028_02_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2028_02_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2028_02_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2028_02_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key25").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2028_03 = pgTable("turnstile_worker_schedules_2028_03", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2028_03_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2028_03_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2028_03_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2028_03_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2028_03_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key26").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2028_04 = pgTable("turnstile_worker_schedules_2028_04", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2028_04_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2028_04_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2028_04_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2028_04_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2028_04_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key27").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2028_05 = pgTable("turnstile_worker_schedules_2028_05", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2028_05_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2028_05_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2028_05_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2028_05_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2028_05_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key28").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2028_06 = pgTable("turnstile_worker_schedules_2028_06", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2028_06_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2028_06_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2028_06_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2028_06_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2028_06_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key29").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2028_07 = pgTable("turnstile_worker_schedules_2028_07", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2028_07_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2028_07_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2028_07_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2028_07_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2028_07_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key30").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2028_08 = pgTable("turnstile_worker_schedules_2028_08", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2028_08_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2028_08_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2028_08_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2028_08_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2028_08_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key31").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2028_09 = pgTable("turnstile_worker_schedules_2028_09", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2028_09_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2028_09_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2028_09_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2028_09_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2028_09_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key32").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2028_10 = pgTable("turnstile_worker_schedules_2028_10", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2028_10_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2028_10_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2028_10_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2028_10_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2028_10_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key33").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2028_11 = pgTable("turnstile_worker_schedules_2028_11", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2028_11_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2028_11_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2028_11_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2028_11_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2028_11_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key34").on(table.worker_id, table.worker_position_id, table.date),
]);

export const turnstile_worker_schedules_2028_12 = pgTable("turnstile_worker_schedules_2028_12", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).default(sql`nextval('turnstile_worker_schedules_id_seq'::regclass)`).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	worker_position_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	turnstile_schedule_group_id: bigint({ mode: "number" }),
	date: date().notNull(),
	work_status: smallint(),
	start_time: time(),
	end_time: time(),
	daily_minutes: integer().default(0),
	daytime: integer().default(0),
	evening_time: integer().default(0),
	fact_daily_minutes: integer(),
	fact_daytime: integer(),
	fact_evening_time: integer(),
	cause: smallint().default(1),
	created_at: timestamp({ mode: 'string' }).defaultNow(),
	updated_at: timestamp({ mode: 'string' }).defaultNow(),
	deleted_at: timestamp({ mode: 'string' }),
}, (table) => [
	index("turnstile_worker_schedules_2028_12_position_date_index").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")),
	uniqueIndex("turnstile_worker_schedules_2028_12_unique_wp_date").using("btree", table.worker_id.asc().nullsLast().op("int8_ops"), table.worker_position_id.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("int8_ops")),
	index("turnstile_worker_schedules_2028_12_worker_position_id_date_idx").using("btree", table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("date_ops")).where(sql`(deleted_at IS NULL)`),
	index("turnstile_worker_schedules_2028_12_wp_date_index").using("btree", table.worker_id.asc().nullsLast().op("date_ops"), table.worker_position_id.asc().nullsLast().op("int8_ops"), table.date.asc().nullsLast().op("int8_ops")),
	primaryKey({ columns: [table.id, table.date], name: "turnstile_worker_schedules_2028_12_pkey"}),
	unique("turnstile_worker_schedules_2_worker_id_worker_position_id_key35").on(table.worker_id, table.worker_position_id, table.date),
]);
