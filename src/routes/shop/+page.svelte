<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Coins } from 'lucide-svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';

	let { data } = $props();
	const { items } = $derived(data);
</script>

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
						<Tooltip.Provider>
							<Tooltip.Root>
								<Tooltip.Trigger>
									{#snippet child({ props })}
										<Button {...props} disabled={item.stock === 0} variant="default" class="mt-2">
											Purchase
										</Button>
									{/snippet}
								</Tooltip.Trigger>
								{#if item.stock === 0}
									<Tooltip.Content>Out of stock</Tooltip.Content>
								{/if}
							</Tooltip.Root>
						</Tooltip.Provider>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
		{#if items.length === 0}
			<p class="col-span-full text-center text-muted-foreground">No items available in the shop</p>
		{/if}
	</div>
</div>
