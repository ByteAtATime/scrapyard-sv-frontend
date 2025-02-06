import { selectPointTransactionSchema } from '$lib/server/db/types';
import { z } from 'zod';

export const approveSchema = z.object({
	id: selectPointTransactionSchema.shape.id
});

export const rejectSchema = z.object({
	id: selectPointTransactionSchema.shape.id,
	reason: z.string().nonempty()
});

export const deleteSchema = z.object({
	id: selectPointTransactionSchema.shape.id
});
