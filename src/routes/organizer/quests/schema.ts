import { z } from 'zod';

export const createQuestSchema = z.object({
	name: z.string().min(1, 'Quest name is required'),
	description: z.string().min(1, 'Description is required'),
	totalPoints: z.number().min(1, 'Points must be at least 1'),
	endTime: z.coerce.date().default(new Date()),
	status: z.enum(['active', 'completed', 'cancelled']).default('active')
});

export const updateQuestSchema = createQuestSchema.partial();

export type CreateQuestFormData = z.infer<typeof createQuestSchema>;
export type UpdateQuestFormData = z.infer<typeof updateQuestSchema>;
