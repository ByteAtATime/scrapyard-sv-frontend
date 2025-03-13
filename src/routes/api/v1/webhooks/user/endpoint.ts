import type { EndpointHandler } from '$lib/server/endpoints';
import type { UserService } from '$lib/server/auth/service';
import { z } from 'zod';

// Define schema for Clerk webhook payload
export const webhookSchema = z.object({
	data: z.object({
		id: z.string(),
		email_addresses: z.array(
			z.object({
				email_address: z.string().email(),
				id: z.string(),
				verification: z.object({
					status: z.string()
				})
			})
		),
		first_name: z.string().nullable(),
		last_name: z.string().nullable(),
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
		const { data, type } = body;

		// Extract the fields we need
		const authProviderId = data.id;
		const email = data.email_addresses[0]?.email_address || '';
		const name = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'User';

		// Use profile_image_url or fall back to image_url
		const avatarUrl = data.profile_image_url || data.image_url || null;

		if (type === 'user.created') {
			await userService.handleUserCreated({
				authProviderId,
				email,
				name,
				avatarUrl
			});
		} else if (type === 'user.updated') {
			await userService.handleUserUpdated({
				authProviderId,
				email,
				name,
				avatarUrl
			});
		}

		return { success: true };
	} catch (error) {
		console.error('Error processing user webhook:', error);
		return {
			error: 'Failed to process webhook',
			status: 500
		};
	}
};
