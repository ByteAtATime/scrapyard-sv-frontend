import { ClerkAuthProvider } from '$lib/server/auth/clerk.js';
import { buildClerkProps } from 'clerk-sveltekit/server';

export const load = async ({ locals }) => {
	const authProvider = new ClerkAuthProvider(locals.auth);

	const isOrganizer = await authProvider.isOrganizer();

	return {
		...buildClerkProps(locals.auth),
		isOrganizer
	};
};
