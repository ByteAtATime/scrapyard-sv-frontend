<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { Loader2 } from 'lucide-svelte';
	import type { ScrapData } from '$lib/server/scrapper';

	let { data } = $props();

	const { enhance, submitting } = superForm(data.voteForm, {
		onResult: ({ result }) => {
			if (result.type === 'success') {
				toast.success('Vote submitted successfully');
				// Refresh the page to get new scraps
				window.location.reload();
			} else {
				toast.error('Failed to submit vote', {
					description: result.type === 'error' ? result.error : 'Unknown error'
				});
			}
		}
	});

	let noScrapsWarning = $derived(
		!data.scraps || data.scraps.length < 2 ? 'No more scraps to vote on' : null
	);

	$effect(() => {
		if (noScrapsWarning) {
			toast.error(noScrapsWarning);
		}
	});
</script>

<div class="container mx-auto py-8">
	<div class="mb-8 space-y-4">
		<h1 class="text-3xl font-bold">Vote on Scraps</h1>
		<p class="text-muted-foreground">
			Choose which scrap you think is more valuable. You'll earn points for voting!
		</p>
	</div>

	{#if data.scraps && data.scraps.length >= 2}
		<div class="grid gap-8 md:grid-cols-2">
			{#each data.scraps as scrap (scrap.id)}
				<form method="POST" action="?/vote" use:enhance>
					<input type="hidden" name="scrapId" value={scrap.id} />
					<input
						type="hidden"
						name="otherScrapId"
						value={data.scraps.find((s: ScrapData) => s.id !== scrap.id)?.id}
					/>
					<Card.Root class="h-full">
						<Card.Header>
							<Card.Title>{scrap.title}</Card.Title>
							<Card.Description>{scrap.description}</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="grid grid-cols-2 gap-2">
								{#each scrap.attachmentUrls as url}
									<img
										src={url}
										alt="Scrap attachment"
										class="aspect-square rounded-md object-cover"
									/>
								{/each}
							</div>
						</Card.Content>
						<Card.Footer>
							<Button type="submit" class="w-full" disabled={$submitting}>
								{#if $submitting}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								Vote for this Scrap
							</Button>
						</Card.Footer>
					</Card.Root>
				</form>
			{/each}
		</div>
	{:else}
		<Card.Root>
			<Card.Header class="mb-6">
				<Card.Title>No scraps to vote on</Card.Title>
				<Card.Description>There are no eligible scraps to vote on at the moment.</Card.Description>
			</Card.Header>
		</Card.Root>
	{/if}
</div>
