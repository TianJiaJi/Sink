import type { Link } from '../../shared/schemas/link'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const links = sqliteTable('links', {
  slug: text().primaryKey(),
  id: text().notNull(),
  url: text().notNull(),
  comment: text(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  expiration: integer(),
  title: text(),
  description: text(),
  image: text(),
  apple: text(),
  google: text(),
  cloaking: integer({ mode: 'boolean' }),
  redirectWithQuery: integer('redirect_with_query', { mode: 'boolean' }),
  password: text(),
  unsafe: integer({ mode: 'boolean' }),
  geo: text({ mode: 'json' }).$type<Link['geo']>(),
  normalizedUrl: text('normalized_url').notNull(),
  effectiveExpiresAt: integer('effective_expires_at'),
}, table => [
  index('links_created_at_slug_idx').on(table.createdAt, table.slug),
  index('links_normalized_url_idx').on(table.normalizedUrl),
  index('links_id_idx').on(table.id),
])

export const linkTombstones = sqliteTable('link_tombstones', {
  slug: text().primaryKey(),
  deletedAt: integer('deleted_at').notNull(),
})

export const linkMigrationRuns = sqliteTable('link_migration_runs', {
  id: text().primaryKey(),
  expectedCursor: text('expected_cursor'),
  scanned: integer().notNull().default(0),
  inserted: integer().notNull().default(0),
  skipped: integer().notNull().default(0),
  expired: integer().notNull().default(0),
  force: integer({ mode: 'boolean' }).notNull(),
  status: text({ enum: ['running', 'completed'] }).notNull().default('running'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})
