import type { PageServerLoad } from './$types';
import { message, superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { shopItemSchema, editShopItemSchema, deleteShopItemSchema } from './schema';
import { fail } from '@sveltejs/kit';
import { PostgresShopRepo, ShopService } from '$lib/server/shop';
import { ClerkAuthProvider } from '$lib/server/auth';
import { PostgresPointsRepo } from '$lib/server/points';

export const load: PageServerLoad = async ({ locals }) => {
	const shopService = new ShopService(
		new PostgresShopRepo(),
		new ClerkAuthProvider(locals.auth),
		new PostgresPointsRepo()
	);

	const items = await shopService.getAllItems();
	const itemsJson = items.map((item) => item.toJson());

	const createForm = await superValidate(zod(shopItemSchema));
	const editForm = await superValidate(zod(editShopItemSchema));
	const deleteForm = await superValidate(zod(deleteShopItemSchema));

	return { items: itemsJson, createForm, editForm, deleteForm };
};

export const actions = {
	create: async ({ request, locals }) => {
		const shopService = new ShopService(
			new PostgresShopRepo(),
			new ClerkAuthProvider(locals.auth),
			new PostgresPointsRepo()
		);
		const form = await superValidate(request, zod(shopItemSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		await shopService.createItem(form.data);

		return message(form, 'Item created successfully.');
	},
	update: async ({ request, locals }) => {
		const shopService = new ShopService(
			new PostgresShopRepo(),
			new ClerkAuthProvider(locals.auth),
			new PostgresPointsRepo()
		);
		const form = await superValidate(request, zod(editShopItemSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { id, ...data } = form.data;

		await shopService.updateItem(id, data);

		return message(form, 'Item updated successfully.');
	},
	delete: async ({ request, locals }) => {
		const shopService = new ShopService(
			new PostgresShopRepo(),
			new ClerkAuthProvider(locals.auth),
			new PostgresPointsRepo()
		);
		const form = await superValidate(request, zod(deleteShopItemSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		await shopService.deleteItem(form.data.id);

		return message(form, 'Item deleted successfully.');
	}
};
