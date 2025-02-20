import { z } from 'zod';

export const teamSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	description: z.string().min(1, 'Description is required')
});

export const teamMemberSchema = z.object({
	userId: z.number().int().positive('User ID is required'),
	role: z.enum(['member', 'leader'], {
		required_error: 'Role is required'
	})
});
