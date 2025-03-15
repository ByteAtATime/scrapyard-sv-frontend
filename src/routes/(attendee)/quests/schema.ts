import { z } from 'zod';

export const questSubmissionSchema = z.object({
	questId: z.coerce.number().int().positive('Quest ID is required'),
	teamId: z.coerce.number().int().positive('Team ID is required'),
	youtubeUrl: z
		.string()
		.url('Please enter a valid URL')
		.refine(
			(url) => {
				// Basic validation for YouTube URLs
				return (
					url.includes('youtube.com/watch?v=') ||
					url.includes('youtu.be/') ||
					url.includes('youtube.com/shorts/')
				);
			},
			{
				message: 'Please enter a valid YouTube URL'
			}
		)
});

export type QuestSubmissionFormData = z.infer<typeof questSubmissionSchema>;
