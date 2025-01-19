import { buildClerkProps } from 'clerk-sveltekit/server';

export const load = ({ locals }) => {
	return {
		...buildClerkProps(locals.auth)
	};
};
