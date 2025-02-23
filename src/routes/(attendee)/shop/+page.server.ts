import type { PageServerLoad } from './$types';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { purchaseSchema } from './schema';
import { fail } from '@sveltejs/kit';
import { ClerkAuthProvider } from '$lib/server/auth/clerk';
import { PostgresShopRepo, ShopService } from '$lib/server/shop';
import { PostgresPointsRepo } from '$lib/server/points';

export const load: PageServerLoad = async ({ locals }) => {
	const shopService = new ShopService(
		new PostgresShopRepo(),
		new ClerkAuthProvider(locals.auth),
		new PostgresPointsRepo()
	);
	const items = await shopService.getAllItems(true);
	const itemsJson = items.map((item) => item.toJson());

	const purchaseForm = await superValidate(zod(purchaseSchema));

	return { items: itemsJson, purchaseForm };
};

export const actions = {
	default: async ({ request, locals, fetch }) => {
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
			const response = await fetch('/api/v1/shop/order', {
				method: 'POST',
				body: JSON.stringify({ itemId: form.data.itemId })
			});

			if (!response.ok) {
				const { error } = await response.json();

				return fail(400, { form, error });
			}

			return message(form, 'Item purchased successfully.');
		} catch (error) {
			if (error instanceof Error) {
				return fail(400, { form, error: error.message });
			}
			throw error;
		}
	}
};
