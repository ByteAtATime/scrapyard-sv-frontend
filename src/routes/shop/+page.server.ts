import type { PageServerLoad } from './$types';
import { shopRepository } from '$lib/server/shop';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { purchaseSchema } from './schema';
import { fail } from '@sveltejs/kit';
import { ClerkAuthProvider } from '$lib/server/auth/clerk';

export const load: PageServerLoad = async () => {
	const items = await shopRepository.getAllItems();

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

		const item = await shopRepository.getItemById(form.data.itemId);

		if (!item) {
			return fail(404, { form, error: 'Item not found.' });
		}

		if (user.totalPoints < item.price) {
			return fail(400, { form, error: 'You do not have enough points to purchase this item.' });
		}

		if (item.stock <= 0) {
			return fail(400, { form, error: 'This item is out of stock.' });
		}

		await shopRepository.createOrder(user.id, form.data.itemId);

		return message(form, 'Item purchased successfully.');
	}
};
