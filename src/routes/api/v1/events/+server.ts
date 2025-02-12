import { compose, withBodySchema } from '$lib/server/endpoints';
import { withAuthProvider, withEventsRepo } from '$lib/server/endpoints/dependencies';
import type { RequestHandler } from './$types';
import { endpoint_GET, endpoint_POST, postSchema } from './endpoint';

export const GET: RequestHandler = compose(withEventsRepo(), withAuthProvider())(endpoint_GET);

export const POST: RequestHandler = compose(
	withAuthProvider(),
	withBodySchema(postSchema),
	withEventsRepo()
)(endpoint_POST);
