import { compose, withBodySchema, withRouteParams } from '$lib/server/endpoints';
import { withAuthProvider } from '$lib/server/endpoints/dependencies';
import { endpoint_POST, postSchema } from './endpoint';
import type { RequestHandler } from './$types';
import { withEventsRepo } from '$lib/server/endpoints/dependencies';

export const POST: RequestHandler = compose(
	withAuthProvider(),
	withBodySchema(postSchema),
	withRouteParams(),
	withEventsRepo()
)(endpoint_POST);
