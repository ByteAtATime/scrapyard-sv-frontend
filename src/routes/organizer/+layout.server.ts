import { ClerkAuthProvider } from '$lib/server/auth/clerk';
import { error } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const authProvider = new ClerkAuthProvider(locals.auth);

	const isOrganizer = await authProvider.isOrganizer();

	if (!isOrganizer) {
		return error(404, 'Not found');
	}
};
