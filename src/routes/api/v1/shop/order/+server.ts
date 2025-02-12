import { compose, withBodySchema } from '$lib/server/endpoints';
import { withAuthProvider, withShopRepository } from '$lib/server/endpoints/dependencies';
import type { RequestHandler } from './$types';
import { endpoint_POST, postSchema } from './endpoint';

export const POST: RequestHandler = compose(
	withAuthProvider(),
	withShopRepository(),
	withBodySchema(postSchema)
)(endpoint_POST);
