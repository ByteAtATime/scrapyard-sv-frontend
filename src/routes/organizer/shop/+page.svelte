<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Coins, Pencil, Trash2 } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';

	let { data } = $props();
	const { items } = $derived(data);

	const {
		form: createForm,
		errors: createErrors,
		enhance: createEnhance,
		reset: resetCreate,
		message: createMessage,
		constraints: createConstraints
	} = $derived.by(() => superForm(data.createForm));

	const {
		form: editForm,
		errors: editErrors,
		enhance: editEnhance,
		reset: resetEdit,
		message: editMessage,
		constraints: editConstraints
	} = $derived.by(() => superForm(data.editForm));

	const {
		form: deleteForm,
		enhance: deleteEnhance,
		message: deleteMessage
	} = $derived.by(() => superForm(data.deleteForm));

	let editingItem = $state<(typeof items)[number] | null>(null);
	let isCreateDialogOpen = $state(false);
	let isEditDialogOpen = $state(false);
	let isDeleteDialogOpen = $state(false);

	function onEditClick(item: (typeof items)[number]) {
		editingItem = item;
		$editForm = {
			id: item.id,
			name: item.name,
			description: item.description,
			imageUrl: item.imageUrl,
			price: item.price,
			stock: item.stock
		};
		isEditDialogOpen = true;
	}

	function onDeleteClick(item: (typeof items)[number]) {
		editingItem = item;
		$deleteForm = { id: item.id };
		isDeleteDialogOpen = true;
	}

	$effect(() => {
		if ($createMessage?.type === 'success') {
			isCreateDialogOpen = false;
			resetCreate();
		}
	});

	$effect(() => {
		if ($editMessage?.type === 'success') {
			isEditDialogOpen = false;
			resetEdit();
		}
	});

	$effect(() => {
		if ($deleteMessage?.type === 'success') {
			isDeleteDialogOpen = false;
		}
	});
</script>

<div class="container py-8">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Shop Management</h1>
		<Button onclick={() => (isCreateDialogOpen = true)}>Add Item</Button>
	</div>

	<div class="rounded-md border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Name</Table.Head>
					<Table.Head>Description</Table.Head>
					<Table.Head>Image URL</Table.Head>
					<Table.Head>Price</Table.Head>
					<Table.Head>Stock</Table.Head>
					<Table.Head class="w-[100px]">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each items as item}
					<Table.Row>
						<Table.Cell>{item.name}</Table.Cell>
						<Table.Cell class="max-w-xs truncate">{item.description}</Table.Cell>
						<Table.Cell class="max-w-xs truncate">{item.imageUrl}</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-1">
								<Coins class="h-4 w-4 text-yellow-500" />
								<span>{item.price}</span>
							</div>
						</Table.Cell>
						<Table.Cell>{item.stock}</Table.Cell>
						<Table.Cell>
							<div class="flex gap-2">
								<Button
									variant="ghost"
									size="icon"
									class="h-8 w-8"
									onclick={() => onEditClick(item)}
								>
									<Pencil class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="h-8 w-8 text-destructive"
									onclick={() => onDeleteClick(item)}
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
				{#if items.length === 0}
					<Table.Row>
						<Table.Cell colspan={6} class="text-center">No items found</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<Dialog.Root bind:open={isCreateDialogOpen}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Add Shop Item</Dialog.Title>
		</Dialog.Header>
		<form method="POST" action="?/create" use:createEnhance class="space-y-4">
			<div class="space-y-2">
				<Label for="name">Name</Label>
				<Input
					id="name"
					name="name"
					bind:value={$createForm.name}
					aria-invalid={$createErrors.name ? 'true' : undefined}
					required
				/>
				{#if $createErrors.name}
					<span class="text-sm text-destructive">
						{$createErrors.name[0]}
					</span>
				{/if}
			</div>
			<div class="space-y-2">
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					name="description"
					{...$createConstraints.description}
					bind:value={$createForm.description}
					aria-invalid={$createErrors.description ? 'true' : undefined}
				/>
				{#if $createErrors.description}
					<span class="text-sm text-destructive">
						{$createErrors.description[0]}
					</span>
				{/if}
			</div>
			<div class="space-y-2">
				<Label for="imageUrl">Image URL</Label>
				<Input
					id="imageUrl"
					name="imageUrl"
					type="url"
					{...$createConstraints.imageUrl}
					bind:value={$createForm.imageUrl}
					aria-invalid={$createErrors.imageUrl ? 'true' : undefined}
				/>
				{#if $createErrors.imageUrl}
					<span class="text-sm text-destructive">
						{$createErrors.imageUrl[0]}
					</span>
				{/if}
			</div>
			<div class="space-y-2">
				<Label for="price">Price (points)</Label>
				<Input
					id="price"
					name="price"
					type="number"
					{...$createConstraints.price}
					bind:value={$createForm.price}
					aria-invalid={$createErrors.price ? 'true' : undefined}
				/>
				{#if $createErrors.price}
					<span class="text-sm text-destructive">
						{$createErrors.price[0]}
					</span>
				{/if}
			</div>
			<div class="space-y-2">
				<Label for="stock">Stock</Label>
				<Input
					id="stock"
					name="stock"
					type="number"
					{...$createConstraints.stock}
					bind:value={$createForm.stock}
					aria-invalid={$createErrors.stock ? 'true' : undefined}
				/>
				{#if $createErrors.stock}
					<span class="text-sm text-destructive">
						{$createErrors.stock[0]}
					</span>
				{/if}
			</div>
			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={() => (isCreateDialogOpen = false)}>
					Cancel
				</Button>
				<Button type="submit">Create</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={isEditDialogOpen}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Edit Shop Item</Dialog.Title>
		</Dialog.Header>
		<form method="POST" action="?/update" use:editEnhance class="space-y-4">
			<input type="hidden" name="id" bind:value={$editForm.id} />
			<div class="space-y-2">
				<Label for="edit-name">Name</Label>
				<Input
					id="edit-name"
					name="name"
					{...$editConstraints.name}
					bind:value={$editForm.name}
					aria-invalid={$editErrors.name ? 'true' : undefined}
				/>
				{#if $editErrors.name}
					<span class="text-sm text-destructive">
						{$editErrors.name[0]}
					</span>
				{/if}
			</div>
			<div class="space-y-2">
				<Label for="edit-description">Description</Label>
				<Textarea
					id="edit-description"
					name="description"
					{...$editConstraints.description}
					bind:value={$editForm.description}
					aria-invalid={$editErrors.description ? 'true' : undefined}
				/>
				{#if $editErrors.description}
					<span class="text-sm text-destructive">{$editErrors.description[0]}</span>
				{/if}
			</div>
			<div class="space-y-2">
				<Label for="edit-imageUrl">Image URL</Label>
				<Input
					id="edit-imageUrl"
					name="imageUrl"
					type="url"
					{...$editConstraints.imageUrl}
					bind:value={$editForm.imageUrl}
					aria-invalid={$editErrors.imageUrl ? 'true' : undefined}
				/>
				{#if $editErrors.imageUrl}
					<span class="text-sm text-destructive">{$editErrors.imageUrl[0]}</span>
				{/if}
			</div>
			<div class="space-y-2">
				<Label for="edit-price">Price (points)</Label>
				<Input
					id="edit-price"
					name="price"
					type="number"
					min="1"
					step="1"
					{...$editConstraints.price}
					bind:value={$editForm.price}
					aria-invalid={$editErrors.price ? 'true' : undefined}
				/>
				{#if $editErrors.price}
					<span class="text-sm text-destructive">
						{$editErrors.price[0]}
					</span>
				{/if}
			</div>
			<div class="space-y-2">
				<Label for="edit-stock">Stock</Label>
				<Input
					id="edit-stock"
					name="stock"
					type="number"
					min="0"
					step="1"
					bind:value={$editForm.stock}
					aria-invalid={$editErrors.stock ? 'true' : undefined}
					required
				/>
				{#if $editErrors.stock}
					<span class="text-sm text-destructive">
						{$editErrors.stock[0]}
					</span>
				{/if}
			</div>
			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={() => (isEditDialogOpen = false)}>
					Cancel
				</Button>
				<Button type="submit">Save Changes</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={isDeleteDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete Shop Item</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete "{editingItem?.name}"? This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/delete" use:deleteEnhance class="mt-4">
			<input type="hidden" name="id" bind:value={$deleteForm.id} />
			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={() => (isDeleteDialogOpen = false)}>
					Cancel
				</Button>
				<Button type="submit" variant="destructive">Delete</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
