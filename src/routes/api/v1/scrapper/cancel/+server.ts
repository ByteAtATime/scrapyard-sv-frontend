import { compose } from '$lib/server/endpoints';
import { withScrapperService, withAuthProvider } from '$lib/server/endpoints/dependencies';
import { endpoint_POST } from './endpoint';

// Cancel a session
export const POST = compose(withAuthProvider(), withScrapperService())(endpoint_POST);
