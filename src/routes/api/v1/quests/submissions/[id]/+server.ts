import { compose, withBodySchema } from '$lib/server/endpoints';
import { withQuestService } from '$lib/server/endpoints/dependencies';
import type { RequestHandler } from './$types';
import { endpoint_GET, endpoint_POST, reviewSubmissionSchema } from './endpoint';

export const GET: RequestHandler = compose(withQuestService())(endpoint_GET);

export const POST: RequestHandler = compose(
	withQuestService(),
	withBodySchema(reviewSubmissionSchema)
)(endpoint_POST);
