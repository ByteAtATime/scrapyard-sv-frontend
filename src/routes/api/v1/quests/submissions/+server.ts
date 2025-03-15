import { compose, withBodySchema } from '$lib/server/endpoints';
import { withQuestService } from '$lib/server/endpoints/dependencies';
import type { RequestHandler } from './$types';
import { endpoint_POST, postSubmissionSchema } from './endpoint';

export const POST: RequestHandler = compose(
	withQuestService(),
	withBodySchema(postSubmissionSchema)
)(endpoint_POST);
