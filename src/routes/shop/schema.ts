import { z } from 'zod';

export const purchaseSchema = z.object({
	itemId: z.number()
});
