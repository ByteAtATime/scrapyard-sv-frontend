import { compose, withBodySchema } from '$lib/server/endpoints';
import { withPointsRepo } from '$lib/server/endpoints/dependencies';
import { withAuthProvider } from '$lib/server/endpoints/dependencies';
import { endpoint_POST, postSchema } from './endpoint';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = compose(
	withAuthProvider(),
	withPointsRepo(),
	withBodySchema(postSchema)
)(endpoint_POST);
