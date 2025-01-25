import { compose } from '$lib/server/endpoints';
import { withAuthProvider, withPointsRepository } from '$lib/server/endpoints/dependencies';
import { endpoint_GET } from './endpoint';

export const GET = compose(withAuthProvider(), withPointsRepository())(endpoint_GET);
