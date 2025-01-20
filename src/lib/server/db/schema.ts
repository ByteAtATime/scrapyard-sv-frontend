import { pgTable, serial, text, pgEnum, timestamp, integer } from 'drizzle-orm/pg-core';

export const authProviderEnum = pgEnum('auth_provider', ['clerk']);

export const user = pgTable('user', {
	id: serial('id').primaryKey(),
	email: text('email').notNull().unique(),
	authProvider: authProviderEnum('auth_provider').notNull(),
	authProviderId: text('auth_provider_id').notNull(),
	totalPoints: integer('total_points').notNull().default(0)
});

export const pointTransaction = pgTable('point_transaction', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.references(() => user.id)
		.notNull(),
	amount: integer('amount').notNull(),
	reason: text('reason').notNull(),
	authorId: integer('author_id')
		.references(() => user.id)
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});
