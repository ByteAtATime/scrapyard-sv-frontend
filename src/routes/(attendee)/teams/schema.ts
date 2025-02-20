import { z } from 'zod';

export const inviteSchema = z.object({
	userId: z.number().int().positive('Please select a user to invite')
});
