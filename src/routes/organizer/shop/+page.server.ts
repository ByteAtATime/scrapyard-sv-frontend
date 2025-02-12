import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { shopRepo } from '$lib/server/shop';
import { message, superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { shopItemSchema, editShopItemSchema, deleteShopItemSchema } from './schema';

export const load: PageServerLoad = async () => {
	const items = await shopRepo.getAllItems();

	return {
		items,
		createForm: await superValidate(zod(shopItemSchema)),
		editForm: await superValidate(zod(editShopItemSchema)),
		deleteForm: await superValidate(zod(deleteShopItemSchema))
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await superValidate(request, zod(shopItemSchema));

		if (!form.valid) {
			return fail(400, { createForm: form });
		}

		try {
			await shopRepo.createItem(form.data);
			return message(form, { type: 'success', text: 'Item created successfully' });
		} catch (e) {
			console.error(e);
			return message(form, { type: 'error', text: 'Failed to create item' });
		}
	},

	update: async ({ request }) => {
		const form = await superValidate(request, zod(editShopItemSchema));

		if (!form.valid) {
			return fail(400, { editForm: form });
		}

		try {
			const { id, ...data } = form.data;
			await shopRepo.updateItem(id, data);
			return message(form, { type: 'success', text: 'Item updated successfully' });
		} catch (e) {
			console.error(e);
			return message(form, { type: 'error', text: 'Failed to update item' });
		}
	},

	delete: async ({ request }) => {
		const form = await superValidate(request, zod(deleteShopItemSchema));

		if (!form.valid) {
			return fail(400, { deleteForm: form });
		}

		try {
			await shopRepo.deleteItem(form.data.id);
			return message(form, { type: 'success', text: 'Item deleted successfully' });
		} catch (e) {
			console.error(e);
			return message(form, { type: 'error', text: 'Failed to delete item' });
		}
	}
};
