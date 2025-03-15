import { z } from 'zod';

export const questSubmissionSchema = z.object({
	questId: z.coerce.number().int().positive('Quest ID is required'),
	teamId: z.coerce.number().int().positive('Team ID is required'),
	attachments: z
		.instanceof(File, { message: 'Please upload at least one file' })
		.array()
		.min(1, 'At least one file is required')
		.max(5, 'Maximum 5 files allowed')
});

export type QuestSubmissionFormData = z.infer<typeof questSubmissionSchema>;
