import { compose, withBodySchema, withRouteParams } from '$lib/server/endpoints';
import { withAuthProvider } from '$lib/server/endpoints/dependencies';
import { endpoint_POST, postSchema } from './endpoint';
import type { RequestHandler } from './$types';
import { withEventsRepository } from '$lib/server/endpoints/dependencies';

export const POST: RequestHandler = compose(
	withAuthProvider(),
	withBodySchema(postSchema),
	withRouteParams(),
	withEventsRepository()
)(endpoint_POST);
