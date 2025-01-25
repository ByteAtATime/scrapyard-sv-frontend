import { compose, withBodySchema } from '$lib/server/endpoints';
import { withAuthProvider, withPointsRepository } from '$lib/server/endpoints/dependencies';
import { endpoint_POST, postSchema } from './endpoint';

export const POST = compose(
	withPointsRepository(),
	withAuthProvider(),
	withBodySchema(postSchema)
)(endpoint_POST);
