import { buildClerkProps } from 'clerk-sveltekit/server';

export const load = async ({ locals }) => {
	return {
		...buildClerkProps(locals.auth)
	};
};
