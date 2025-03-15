import {
	pgTable,
	serial,
	text,
	pgEnum,
	timestamp,
	integer,
	boolean,
	interval
} from 'drizzle-orm/pg-core';

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
	isOrganizer: boolean('is_organizer').notNull().default(false),
	avatarUrl: text('avatar_url')
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

export const shopItemsTable = pgTable('shop_items', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description').notNull(),
	imageUrl: text('image_url').notNull(),
	price: integer('price').notNull(),
	stock: integer('stock').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
	isOrderable: boolean('is_orderable').notNull().default(true)
});

export const orderStatusEnum = pgEnum('order_status', ['pending', 'fulfilled', 'cancelled']);

export const ordersTable = pgTable('orders', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.references(() => usersTable.id)
		.notNull(),
	shopItemId: integer('shop_item_id')
		.references(() => shopItemsTable.id)
		.notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	status: orderStatusEnum('status').default('pending').notNull()
});

export const teamMemberRoleEnum = pgEnum('team_member_role', ['member', 'leader']);

export const teamsTable = pgTable('teams', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const teamMembersTable = pgTable('team_members', {
	teamId: integer('team_id')
		.references(() => teamsTable.id)
		.notNull(),
	userId: integer('user_id')
		.references(() => usersTable.id)
		.notNull(),
	role: teamMemberRoleEnum('role').notNull().default('member'),
	joinedAt: timestamp('joined_at').defaultNow().notNull()
});

export const teamInvitationStatusEnum = pgEnum('team_invitation_status', [
	'pending',
	'accepted',
	'rejected',
	'cancelled'
]);

export const teamInvitationsTable = pgTable('team_invitations', {
	id: serial('id').primaryKey(),
	teamId: integer('team_id')
		.references(() => teamsTable.id)
		.notNull(),
	userId: integer('user_id')
		.references(() => usersTable.id)
		.notNull(),
	invitedBy: integer('invited_by')
		.references(() => usersTable.id)
		.notNull(),
	status: teamInvitationStatusEnum('status').notNull().default('pending'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
	responseAt: timestamp('response_at')
});

export const shortenedUrlsTable = pgTable('shortened_urls', {
	id: serial('id').primaryKey(),
	originalUrl: text('original_url').notNull(),
	slug: text('slug').notNull().unique(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

// TODO: generalize this for hackathons
export const sessionStatusEnum = pgEnum('session_status', [
	'active',
	'paused',
	'completed',
	'cancelled'
]);

export const questStatusEnum = pgEnum('quest_status', ['active', 'completed', 'cancelled']);

export const questSubmissionStatusEnum = pgEnum('quest_submission_status', [
	'pending',
	'approved',
	'rejected'
]);

export const scrapperSessionsTable = pgTable('scrapper_sessions', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.references(() => usersTable.id)
		.notNull(),
	startTime: timestamp('start_time').defaultNow().notNull(),
	endTime: timestamp('end_time'),
	status: sessionStatusEnum('status').default('active').notNull(),
	totalPausedTime: interval('total_paused_time').default('0 seconds').notNull(),
	lastPausedAt: timestamp('last_paused_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const scrapsTable = pgTable('scraps', {
	id: serial('id').primaryKey(),
	sessionId: integer('session_id')
		.references(() => scrapperSessionsTable.id)
		.notNull(),
	title: text('title').notNull(),
	description: text('description').notNull(),
	attachmentUrls: text('attachment_urls').array().notNull(),
	basePoints: integer('base_points').notNull(),
	totalPoints: integer('total_points').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const scrapVotesTable = pgTable('scrap_votes', {
	id: serial('id').primaryKey(),
	scrapId: integer('scrap_id')
		.references(() => scrapsTable.id)
		.notNull(),
	otherScrapId: integer('other_scrap_id')
		.references(() => scrapsTable.id)
		.notNull(),
	voterId: integer('voter_id')
		.references(() => usersTable.id)
		.notNull(),
	pointsAwarded: integer('points_awarded').notNull(),
	transactionId: integer('transaction_id').references(() => pointTransactionsTable.id),
	voterTransactionId: integer('voter_transaction_id').references(() => pointTransactionsTable.id),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const questsTable = pgTable('quests', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description').notNull(),
	totalPoints: integer('total_points').notNull(),
	endTime: timestamp('end_time').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	status: questStatusEnum('status').default('active').notNull()
});

export const questSubmissionsTable = pgTable('quest_submissions', {
	id: serial('id').primaryKey(),
	questId: integer('quest_id')
		.references(() => questsTable.id)
		.notNull(),
	teamId: integer('team_id')
		.references(() => teamsTable.id)
		.notNull(),
	submittedBy: integer('submitted_by')
		.references(() => usersTable.id)
		.notNull(),
	submittedAt: timestamp('submitted_at').defaultNow().notNull(),
	attachmentUrls: text('attachment_urls').notNull(),
	status: questSubmissionStatusEnum('status').default('pending').notNull(),
	reviewerId: integer('reviewer_id').references(() => usersTable.id),
	reviewedAt: timestamp('reviewed_at'),
	rejectionReason: text('rejection_reason'),
	pointsTransactionId: integer('points_transaction_id').references(() => pointTransactionsTable.id)
});
