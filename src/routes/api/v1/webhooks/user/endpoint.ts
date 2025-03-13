import type { EndpointHandler } from '$lib/server/endpoints';
import type { UserService } from '$lib/server/auth/service';
import { z } from 'zod';

// Define schema for Clerk webhook payload
export const webhookSchema = z.object({
	data: z.object({
		id: z.string(),
		profile_image_url: z.string().url().nullable(),
		image_url: z.string().url().nullable()
	}),
	type: z.enum(['user.created', 'user.updated'])
});

export type WebhookPayload = z.infer<typeof webhookSchema>;

export const endpoint_POST: EndpointHandler<{
	userService: UserService;
	body: WebhookPayload;
}> = async ({ userService, body }) => {
	try {
		const { data } = body;
		const avatarUrl = data.profile_image_url || data.image_url || null;
		await userService.updateUserAvatar(data.id, avatarUrl);
		return { success: true };
	} catch (error) {
		console.error('Error processing user webhook:', error);
		return {
			error: 'Failed to process webhook',
			status: 500
		};
	}
};
