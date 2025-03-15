import { compose, withBodySchema, withRouteParams } from '$lib/server/endpoints';
import { withQuestService } from '$lib/server/endpoints/dependencies';
import type { RequestHandler } from './$types';
import { endpoint_PUT, reviewSubmissionSchema, paramsSchema } from './endpoint';

export const PUT: RequestHandler = compose(
	withQuestService(),
	withBodySchema(reviewSubmissionSchema),
	withRouteParams(paramsSchema)
)(endpoint_PUT);
