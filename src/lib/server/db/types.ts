import { createSelectSchema } from 'drizzle-zod';
import { pointTransactionsTable } from './schema';
import type { z } from 'zod';

export const selectPointTransactionSchema = createSelectSchema(pointTransactionsTable);
export type PointTransactionData = z.infer<typeof selectPointTransactionSchema>;
