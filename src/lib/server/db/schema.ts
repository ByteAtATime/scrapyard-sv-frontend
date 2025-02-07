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

export const eventsTable = pgTable('events', {
	id: serial('id').primaryKey(),
	name: text('title').notNull(),
	description: text('description').notNull(),
	time: timestamp('time').notNull(),
	/** number of points obtained by attending the event */
	attendancePoints: integer('attendance_points').notNull(),
	/** organizer to contact in case of questions */
	contactOrganizerId: integer('contact_organizer_id').references(() => usersTable.id)
});

export const eventAttendanceTable = pgTable('event_attendance', {
	eventId: integer('event_id')
		.references(() => eventsTable.id)
		.notNull(),
	userId: integer('user_id')
		.references(() => usersTable.id)
		.notNull(),
	checkInTime: timestamp('check_in_time').defaultNow().notNull(),
	checkedInBy: integer('checked_in_by')
		.references(() => usersTable.id)
		.notNull(),
	awardPointsTransactionId: integer('award_points_transaction_id').references(
		() => pointTransactionsTable.id
	)
});
