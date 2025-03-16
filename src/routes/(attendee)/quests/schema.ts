import { z } from 'zod';

export const questSubmissionSchema = z
	.object({
		questId: z.coerce.number().int().positive('Quest ID is required'),
		teamId: z.coerce.number().int().positive('Team ID is required'),
		attachments: z
			.instanceof(File, { message: 'Please upload at least one file' })
			.array()
			.default([]),
		youtubeUrl: z
			.string()
			.url('Please enter a valid URL')
			.refine(
				(url) => {
					if (!url) return true; // Allow empty string
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
			.default('')
	})
	.refine((data) => data.attachments.length > 0 || data.youtubeUrl.length > 0, {
		message: 'Please provide either file attachments or a YouTube URL',
		path: ['attachments'] // Show error on attachments field
	});

export type QuestSubmissionFormData = z.infer<typeof questSubmissionSchema>;
