import { compose, withBodySchema, withRouteParams } from '$lib/server/endpoints';
import { withEventsService } from '$lib/server/endpoints/dependencies';
import { endpoint_POST, postSchema, routeSchema } from './endpoint';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = compose(
	withEventsService(),
	withBodySchema(postSchema),
	withRouteParams(routeSchema)
)(endpoint_POST);
