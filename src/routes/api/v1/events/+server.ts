import { compose, withBodySchema } from '$lib/server/endpoints';
import { withAuthProvider, withEventsRepository } from '$lib/server/endpoints/dependencies';
import type { RequestHandler } from './$types';
import { endpoint_GET, endpoint_POST, postSchema } from './endpoint';

export const GET: RequestHandler = compose(
	withEventsRepository(),
	withAuthProvider()
)(endpoint_GET);

export const POST: RequestHandler = compose(
	withAuthProvider(),
	withBodySchema(postSchema),
	withEventsRepository()
)(endpoint_POST);
