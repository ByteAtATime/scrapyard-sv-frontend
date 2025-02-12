import { compose, withBodySchema } from '$lib/server/endpoints';
import { withAuthProvider, withPointsRepo } from '$lib/server/endpoints/dependencies';
import { endpoint_POST, postSchema } from './endpoint';

export const POST = compose(
	withPointsRepo(),
	withAuthProvider(),
	withBodySchema(postSchema)
)(endpoint_POST);
