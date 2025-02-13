import type { PageServerLoad } from './$types';
import { shopService } from '$lib/server/shop';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { purchaseSchema } from './schema';
import { fail } from '@sveltejs/kit';
import { ClerkAuthProvider } from '$lib/server/auth/clerk';

export const load: PageServerLoad = async () => {
	const items = await shopService.getAllItems(true);

	const purchaseForm = await superValidate(zod(purchaseSchema));

	return { items, purchaseForm };
};

export const actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, zod(purchaseSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const authProvider = new ClerkAuthProvider(locals.auth);

		const user = await authProvider.getCurrentUser();

		if (!user) {
			return fail(403, { form, error: 'You must be logged in to purchase items.' });
		}

		try {
			await shopService.purchaseItem(user.id, form.data.itemId);
			return message(form, 'Item purchased successfully.');
		} catch (error) {
			if (error instanceof Error) {
				return fail(400, { form, error: error.message });
			}
			throw error;
		}
	}
};
