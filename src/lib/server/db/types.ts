import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import {
	eventAttendanceTable,
	eventsTable,
	ordersTable,
	pointTransactionsTable,
	usersTable,
	teamsTable,
	teamMembersTable,
	scrapsTable,
	scrapperSessionsTable
} from './schema';
import type { z } from 'zod';

export const selectPointTransactionSchema = createSelectSchema(pointTransactionsTable);
export const insertPointTransactionSchema = createInsertSchema(pointTransactionsTable);
export type PointTransactionData = z.infer<typeof selectPointTransactionSchema>;

export const selectUserSchema = createSelectSchema(usersTable);
export const insertUserSchema = createInsertSchema(usersTable);
export interface UserData {
	id: number;
	name: string;
	email: string;
	authProvider: 'clerk';
	authProviderId: string;
	isOrganizer: boolean;
	avatarUrl: string | null;
	totalPoints?: number;
	[key: string]: unknown;
}

export const selectEventSchema = createSelectSchema(eventsTable);
export const insertEventSchema = createInsertSchema(eventsTable);
export type EventData = z.infer<typeof selectEventSchema>;

export const selectEventAttendanceSchema = createSelectSchema(eventAttendanceTable);
export const insertEventAttendanceSchema = createInsertSchema(eventsTable);
export type EventAttendanceData = z.infer<typeof selectEventAttendanceSchema>;

export const selectOrderSchema = createSelectSchema(ordersTable);
export const insertOrderSchema = createInsertSchema(ordersTable);
export type OrderData = z.infer<typeof selectOrderSchema>;

export const selectTeamSchema = createSelectSchema(teamsTable);
export const insertTeamSchema = createInsertSchema(teamsTable);
export type TeamData = z.infer<typeof selectTeamSchema>;

export const selectTeamMemberSchema = createSelectSchema(teamMembersTable);
export const insertTeamMemberSchema = createInsertSchema(teamMembersTable);
export type TeamMemberData = z.infer<typeof selectTeamMemberSchema>;

export interface TeamWithMembersData extends TeamData {
	members: (TeamMemberData & { user: UserData })[];
}

export const selectScrapSchema = createSelectSchema(scrapsTable);
export const insertScrapSchema = createInsertSchema(scrapsTable);
export type ScrapData = z.infer<typeof selectScrapSchema>;

export const selectSessionSchema = createSelectSchema(scrapperSessionsTable);
export const insertSessionSchema = createInsertSchema(scrapperSessionsTable);
export type SessionData = z.infer<typeof selectSessionSchema> & {
	totalPausedSeconds?: number;
};
