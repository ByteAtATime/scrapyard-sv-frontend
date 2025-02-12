<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Coins } from 'lucide-svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { ShopItem } from '$lib/server/shop';
	import { superForm } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';

	let { data } = $props();
	const { items, purchaseForm } = $derived(data);

	const { enhance } = $derived(
		superForm(purchaseForm, {
			onResult: ({ result }) => {
				if (result.type === 'success') {
					toast.success('Item purchased successfully!');
				} else if (result.type === 'failure') {
					toast.error('Failed to purchase item', {
						description: result.data?.error
					});
				}
			}
		})
	);
</script>

{#snippet purchaseButton({ item }: { item: ShopItem })}
	<Dialog.Root>
		<Dialog.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="default" class="mt-2">Purchase</Button>
			{/snippet}
		</Dialog.Trigger>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Purchase {item.name}</Dialog.Title>
				<Dialog.Description>
					You are about to purchase <span class="font-bold text-foreground">{item.name}</span> for
					<span class="font-bold text-foreground">{item.price}</span> points. Are you sure you want to
					proceed?
				</Dialog.Description>
			</Dialog.Header>

			<Dialog.Footer>
				<Dialog.Close>
					{#snippet child({ props })}
						<Button {...props} variant="outline">Cancel</Button>
					{/snippet}
				</Dialog.Close>
				<form use:enhance method="POST">
					<input type="hidden" name="itemId" value={item.id} />
					<Button variant="default" type="submit">Confirm</Button>
				</form>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/snippet}

<div class="container py-8">
	<h1 class="mb-8 text-3xl font-bold">Shop</h1>

	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
		{#each items as item}
			<Card.Root>
				<Card.Header>
					<img
						src={item.imageUrl}
						alt={item.name}
						class="aspect-square w-full rounded-lg object-cover"
					/>
				</Card.Header>
				<Card.Content class="space-y-2">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold">{item.name}</h3>
						<div class="flex items-center gap-1">
							<Coins class="h-4 w-4 text-yellow-500" />
							<span class="font-medium">{item.price}</span>
						</div>
					</div>
					<p class="text-sm text-muted-foreground">{item.description}</p>
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground">
							<span class="text-foreground">{item.stock}</span> left in stock
						</span>
						{#if item.stock === 0}
							<Tooltip.Provider>
								<Tooltip.Root>
									<Tooltip.Trigger>
										{#snippet child({ props })}
											<Button {...props} disabled variant="default" class="mt-2">Purchase</Button>
										{/snippet}
									</Tooltip.Trigger>
									<Tooltip.Content>Out of stock</Tooltip.Content>
								</Tooltip.Root>
							</Tooltip.Provider>
						{:else}
							{@render purchaseButton({ item })}
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
		{#if items.length === 0}
			<p class="col-span-full text-center text-muted-foreground">No items available in the shop</p>
		{/if}
	</div>
</div>
