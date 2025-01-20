import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { pointTransactionsTable, usersTable } from './schema';
import type { z } from 'zod';

export const selectPointTransactionSchema = createSelectSchema(pointTransactionsTable);
export const insertPointTransactionSchema = createInsertSchema(pointTransactionsTable);
export type PointTransactionData = z.infer<typeof selectPointTransactionSchema>;

export const selectUserSchema = createSelectSchema(usersTable);
export const insertUserSchema = createInsertSchema(usersTable);
export type UserData = z.infer<typeof selectUserSchema>;
