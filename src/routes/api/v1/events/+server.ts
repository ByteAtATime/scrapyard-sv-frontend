import { compose, withBodySchema } from '$lib/server/endpoints';
import { withEventsService } from '$lib/server/endpoints/dependencies';
import type { RequestHandler } from './$types';
import { endpoint_GET, endpoint_POST, postSchema } from './endpoint';

export const GET: RequestHandler = compose(withEventsService())(endpoint_GET);

export const POST: RequestHandler = compose(
	withEventsService(),
	withBodySchema(postSchema)
)(endpoint_POST);
