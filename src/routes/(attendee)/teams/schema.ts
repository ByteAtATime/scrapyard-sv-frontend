import { z } from 'zod';

export const inviteSchema = z.object({
	userId: z.number().int().positive('Please select a user to invite')
});

export const invitationActionSchema = z.object({
	invitationId: z.number().int().positive('Invitation ID is required')
});
