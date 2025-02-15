import type { PageServerLoad } from './$types';
import { shopService } from '$lib/server/shop';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { shopItemSchema, editShopItemSchema, deleteShopItemSchema } from './schema';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const items = await shopService.getAllItems();
	const itemsJson = items.map((item) => item.toJson());

	const createForm = await superValidate(zod(shopItemSchema));
	const editForm = await superValidate(zod(editShopItemSchema));
	const deleteForm = await superValidate(zod(deleteShopItemSchema));

	return { items: itemsJson, createForm, editForm, deleteForm };
};

export const actions = {
	create: async ({ request }) => {
		const form = await superValidate(request, zod(shopItemSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		await shopService.createItem(form.data);

		return message(form, 'Item created successfully.');
	},
	update: async ({ request }) => {
		const form = await superValidate(request, zod(editShopItemSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { id, ...data } = form.data;

		await shopService.updateItem(id, data);

		return message(form, 'Item updated successfully.');
	},
	delete: async ({ request }) => {
		const form = await superValidate(request, zod(deleteShopItemSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		await shopService.deleteItem(form.data.id);

		return message(form, 'Item deleted successfully.');
	}
};
