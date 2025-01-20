import { z } from 'zod';

export const awardPointsSchema = z.object({
	userId: z.number().int().positive(),
	amount: z.number().int().min(1, 'Points must be positive'),
	reason: z
		.string()
		.min(1, 'Reason is required')
		.max(500, 'Reason must be less than 500 characters')
});
