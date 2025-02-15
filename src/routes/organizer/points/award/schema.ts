import { z } from 'zod';

export const awardPointsSchema = z.object({
	userId: z.number().int().nonnegative(),
	amount: z.number().int(),
	reason: z
		.string()
		.min(1, 'Reason is required')
		.max(500, 'Reason must be less than 500 characters')
});
