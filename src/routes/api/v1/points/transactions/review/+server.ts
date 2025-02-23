import { compose, withBodySchema } from '$lib/server/endpoints';
import { withPointsService } from '$lib/server/endpoints/dependencies';
import { endpoint_POST, postSchema } from './endpoint';

export const POST = compose(withPointsService(), withBodySchema(postSchema))(endpoint_POST);
