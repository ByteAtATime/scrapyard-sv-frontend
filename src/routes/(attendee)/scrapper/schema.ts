import { z } from 'zod';

// Schema for submitting a scrap
export const scrapSchema = z.object({
	title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
	description: z
		.string()
		.min(1, 'Description is required')
		.max(1000, 'Description must be less than 1000 characters'),
	images: z
		.instanceof(File, { message: 'Please upload at least one image' })
		.array()
		.min(1, 'At least one image is required')
		.max(5, 'Maximum 5 images allowed')
});

export type ScrapFormData = z.infer<typeof scrapSchema>;

// Schema for voting on a scrap
export const voteSchema = z.object({
	scrapId: z.coerce.number().int().positive('Invalid scrap ID'),
	otherScrapId: z.coerce.number().int().positive('Invalid other scrap ID')
});

export type VoteFormData = z.infer<typeof voteSchema>;

// Empty schemas for other actions
export const startSchema = z.object({});
export const pauseSchema = z.object({});
export const resumeSchema = z.object({});
export const completeSchema = z.object({});
export const cancelSchema = z.object({});
