import type { EndpointHandler } from '$lib/server/endpoints';
import type { WithAuthProvider, WithScrapperService } from '$lib/server/endpoints/dependencies';
import { SessionNotFoundError, InvalidSessionStateError } from '$lib/server/scrapper/types';

export const endpoint_POST: EndpointHandler<WithAuthProvider & WithScrapperService> = async ({
	authProvider,
	scrapperService
}) => {
	const userId = await authProvider.getUserId();
	if (!userId)
		return {
			success: false,
			status: 401,
			body: { message: 'Unauthorized' }
		};

	try {
		const sessionData = await scrapperService.pauseSession(userId);
		return sessionData;
	} catch (e) {
		if (e instanceof SessionNotFoundError) {
			return {
				success: false,
				status: 404,
				error: e.message
			};
		}
		if (e instanceof InvalidSessionStateError) {
			return {
				success: false,
				status: 400,
				error: e.message
			};
		}
		throw e;
	}
};
