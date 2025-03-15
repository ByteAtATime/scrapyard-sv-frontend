<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Coins, Pencil, Trash2, Upload } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { CONFIG } from '$lib/config';

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
	
	// File upload states
	let createFileInput = $state<HTMLInputElement | null>(null);
	let editFileInput = $state<HTMLInputElement | null>(null);
	let createImageFile = $state<File | null>(null);
	let editImageFile = $state<File | null>(null);
	let createImagePreview = $state<string | null>(null);
	let editImagePreview = $state<string | null>(null);
	let isUploading = $state(false);

	function onEditClick(item: (typeof items)[number]) {
		console.log(JSON.stringify(item, null, 2));
		editingItem = item;
		$editForm = {
			id: item.id,
			name: item.name,
			description: item.description,
			imageUrl: item.imageUrl,
			price: item.price,
			stock: item.stock,
			isOrderable: item.isOrderable
		};
		editImagePreview = item.imageUrl;
		isEditDialogOpen = true;
	}

	function onDeleteClick(item: (typeof items)[number]) {
		editingItem = item;
		$deleteForm = { id: item.id };
		isDeleteDialogOpen = true;
	}
	
	async function uploadImage(file: File): Promise<string> {
		isUploading = true;
		try {
			const formData = new FormData();
			formData.append('file', file);
			
			const response = await fetch('https://hack.ngo/upload', {
				method: 'POST',
				body: formData
			});
			
			if (!response.ok) {
				throw new Error('Failed to upload image');
			}
			
			const data = await response.json();
			return data.url;
		} catch (error) {
			console.error('Error uploading image:', error);
			throw error;
		} finally {
			isUploading = false;
		}
	}
	
	function handleCreateFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			createImageFile = input.files[0];
			createImagePreview = URL.createObjectURL(createImageFile);
		}
	}
	
	function handleEditFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			editImageFile = input.files[0];
			editImagePreview = URL.createObjectURL(editImageFile);
		}
	}
	
	async function handleCreateSubmit(event: SubmitEvent) {
		event.preventDefault();
		
		if (createImageFile) {
			try {
				const imageUrl = await uploadImage(createImageFile);
				$createForm.imageUrl = imageUrl;
			} catch (error) {
				return;
			}
		}
		
		const form = event.target as HTMLFormElement;
		form.submit();
	}
	
	async function handleEditSubmit(event: SubmitEvent) {
		event.preventDefault();
		
		if (editImageFile) {
			try {
				const imageUrl = await uploadImage(editImageFile);
				$editForm.imageUrl = imageUrl;
			} catch (error) {
				return;
			}
		}
		
		const form = event.target as HTMLFormElement;
		form.submit();
	}

	$effect(() => {
		if ($createMessage?.type === 'success') {
			isCreateDialogOpen = false;
			resetCreate();
			createImageFile = null;
			createImagePreview = null;
			if (createFileInput) createFileInput.value = '';
		}
	});

	$effect(() => {
		if ($editMessage?.type === 'success') {
			isEditDialogOpen = false;
			resetEdit();
			editImageFile = null;
			editImagePreview = null;
			if (editFileInput) editFileInput.value = '';
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
					<Table.Head>Orderable</Table.Head>
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
						<Table.Cell>{item.isOrderable ? 'Yes' : 'No'}</Table.Cell>
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
		<form method="POST" action="?/create" use:createEnhance onsubmit={handleCreateSubmit} class="space-y-4">
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
				<Label for="image">Image</Label>
				<div class="grid gap-4">
					<div class="flex items-center gap-2">
						<Input
							id="imageFile"
							name="imageFile"
							type="file"
							accept="image/*"
							bind:this={createFileInput}
							onchange={handleCreateFileChange}
						/>
						{#if isUploading}
							<div class="animate-spin">
								<Upload size={20} />
							</div>
						{/if}
					</div>
					{#if createImagePreview}
						<div class="relative aspect-video w-full overflow-hidden rounded-md">
							<img
								src={createImagePreview}
								alt="Preview"
								class="h-full w-full object-cover"
							/>
						</div>
					{/if}
					<div class="flex items-center">
						<span class="text-sm text-muted-foreground">Or provide an image URL:</span>
					</div>
					<Input
						id="imageUrl"
						name="imageUrl"
						type="url"
						{...$createConstraints.imageUrl}
						bind:value={$createForm.imageUrl}
						aria-invalid={$createErrors.imageUrl ? 'true' : undefined}
						placeholder="https://example.com/image.jpg"
					/>
					{#if $createErrors.imageUrl}
						<span class="text-sm text-destructive">
							{$createErrors.imageUrl[0]}
						</span>
					{/if}
				</div>
			</div>
			<div class="space-y-2">
				<Label for="price">Price ({CONFIG.points.plural})</Label>
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
			<div class="space-y-2">
				<Label class="flex items-center gap-1">
					<Checkbox name="isOrderable" id="isOrderable" bind:checked={$createForm.isOrderable} />
					Orderable
				</Label>
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
		<form method="POST" action="?/update" use:editEnhance onsubmit={handleEditSubmit} class="space-y-4">
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
				<Label for="edit-image">Image</Label>
				<div class="grid gap-4">
					<div class="flex items-center gap-2">
						<Input
							id="edit-imageFile"
							name="imageFile"
							type="file"
							accept="image/*"
							bind:this={editFileInput}
							onchange={handleEditFileChange}
						/>
						{#if isUploading}
							<div class="animate-spin">
								<Upload size={20} />
							</div>
						{/if}
					</div>
					{#if editImagePreview}
						<div class="relative aspect-video w-full overflow-hidden rounded-md">
							<img
								src={editImagePreview}
								alt="Preview"
								class="h-full w-full object-cover"
							/>
						</div>
					{/if}
					<div class="flex items-center">
						<span class="text-sm text-muted-foreground">Or provide an image URL:</span>
					</div>
					<Input
						id="edit-imageUrl"
						name="imageUrl"
						type="url"
						{...$editConstraints.imageUrl}
						bind:value={$editForm.imageUrl}
						aria-invalid={$editErrors.imageUrl ? 'true' : undefined}
						placeholder="https://example.com/image.jpg"
					/>
					{#if $editErrors.imageUrl}
						<span class="text-sm text-destructive">{$editErrors.imageUrl[0]}</span>
					{/if}
				</div>
			</div>
			<div class="space-y-2">
				<Label for="edit-price">Price ({CONFIG.points.plural})</Label>
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
			<div class="space-y-2">
				<Label class="flex items-center gap-1">
					<Checkbox name="isOrderable" id="isOrderable" bind:checked={$editForm.isOrderable} />
					Orderable
				</Label>
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
