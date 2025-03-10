import type { EndpointHandler } from '$lib/server/endpoints';
import type { WithAuthProvider, WithScrapperService } from '$lib/server/endpoints/dependencies';
import { SessionAlreadyStartedError } from '$lib/server/scrapper/types';

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
		const sessionData = await scrapperService.createSession(userId);
		return sessionData;
	} catch (e) {
		if (e instanceof SessionAlreadyStartedError) {
			return {
				success: false,
				status: 409,
				error: 'Session already started'
			};
		}

		throw e;
	}
};
