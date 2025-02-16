import { ClerkAuthProvider } from '$lib/server/auth';

export const load = async ({ locals }) => {
	const authProvider = new ClerkAuthProvider(locals.auth);

	const isOrganizer = await authProvider.isOrganizer();

	return {
		isOrganizer
	};
};
