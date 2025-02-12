import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import {
	eventAttendanceTable,
	eventsTable,
	ordersTable,
	pointTransactionsTable,
	usersTable
} from './schema';
import type { z } from 'zod';

export const selectPointTransactionSchema = createSelectSchema(pointTransactionsTable);
export const insertPointTransactionSchema = createInsertSchema(pointTransactionsTable);
export type PointTransactionData = z.infer<typeof selectPointTransactionSchema>;

export const selectUserSchema = createSelectSchema(usersTable);
export const insertUserSchema = createInsertSchema(usersTable);
export type UserData = z.infer<typeof selectUserSchema>;

export const selectEventSchema = createSelectSchema(eventsTable);
export const insertEventSchema = createInsertSchema(eventsTable);
export type EventData = z.infer<typeof selectEventSchema>;

export const selectEventAttendanceSchema = createSelectSchema(eventAttendanceTable);
export const insertEventAttendanceSchema = createInsertSchema(eventsTable);
export type EventAttendanceData = z.infer<typeof selectEventAttendanceSchema>;

export const selectOrderSchema = createSelectSchema(ordersTable);
export const insertOrderSchema = createInsertSchema(ordersTable);
export type OrderData = z.infer<typeof selectOrderSchema>;
