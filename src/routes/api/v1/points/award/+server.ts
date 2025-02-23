import { compose, withBodySchema } from '$lib/server/endpoints';
import { withPointsService } from '$lib/server/endpoints/dependencies';
import { endpoint_POST, postSchema } from './endpoint';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = compose(
	withPointsService(),
	withBodySchema(postSchema)
)(endpoint_POST);
