import { compose } from '$lib/server/endpoints';
import { withAuthProvider, withPointsRepo } from '$lib/server/endpoints/dependencies';
import { endpoint_GET } from './endpoint';

export const GET = compose(withAuthProvider(), withPointsRepo())(endpoint_GET);
