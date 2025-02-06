import { pgTable, serial, text, pgEnum, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const authProviderEnum = pgEnum('auth_provider', ['clerk']);

export const transactionStatusEnum = pgEnum('transaction_status', [
	'pending',
	'approved',
	'rejected',
	'deleted'
]);

export const usersTable = pgTable('users', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	authProvider: authProviderEnum('auth_provider').notNull(),
	authProviderId: text('auth_provider_id').notNull(),
	totalPoints: integer('total_points').notNull().default(0),
	isOrganizer: boolean('is_organizer').notNull().default(false)
});

export const pointTransactionsTable = pgTable('point_transactions', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.references(() => usersTable.id)
		.notNull(),
	amount: integer('amount').notNull(),
	reason: text('reason').notNull(),
	authorId: integer('author_id')
		.references(() => usersTable.id)
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	status: transactionStatusEnum('status').notNull().default('pending'),
	reviewerId: integer('reviewer_id').references(() => usersTable.id),
	reviewedAt: timestamp('reviewed_at'),
	rejectionReason: text('rejection_reason')
});
