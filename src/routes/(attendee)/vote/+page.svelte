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

	let votesLeft = $derived(Math.max(0, data.maxVotesPerHour - data.votesInLastHour));

	let nextVoteTime = $state('');
	let timerInterval = $state<ReturnType<typeof setInterval> | null>(null);

	function updateNextVoteTime() {
		if (data.votesInLastHour <= 0 || !data.oldestVoteTime) {
			nextVoteTime = '';
			return;
		}

		if (votesLeft > 0) {
			nextVoteTime = '';
			return;
		}

		const now = new Date();
		const oldestVoteTime = new Date(data.oldestVoteTime);
		const expiryTime = new Date(oldestVoteTime.getTime() + 60 * 60 * 1000);

		const timeUntilNextVote = expiryTime.getTime() - now.getTime();

		if (timeUntilNextVote <= 0) {
			nextVoteTime = 'now';
			return;
		}

		const minutes = Math.floor(timeUntilNextVote / (60 * 1000));
		const seconds = Math.floor((timeUntilNextVote % (60 * 1000)) / 1000);

		nextVoteTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}

	$effect(() => {
		updateNextVoteTime();

		if (timerInterval) {
			clearInterval(timerInterval);
		}

		if (votesLeft === 0 && data.oldestVoteTime) {
			timerInterval = setInterval(updateNextVoteTime, 1000);
		}

		return () => {
			if (timerInterval) {
				clearInterval(timerInterval);
			}
		};
	});
</script>

<div class="container mx-auto py-8">
	<div class="mb-8 space-y-4">
		<h1 class="text-3xl font-bold">Vote on Scraps</h1>
		<p class="text-muted-foreground">
			Choose which scrap you think is more valuable. You'll earn points for voting!
		</p>
		<div class="flex items-center justify-between">
			<p class="text-sm text-muted-foreground">
				You have {votesLeft}
				{votesLeft === 1 ? 'vote' : 'votes'} left
				{#if nextVoteTime && votesLeft === 0}. Next vote in {nextVoteTime}{/if}
			</p>
			<div class="h-2 w-40 rounded-full bg-gray-200">
				<div
					class="h-2 rounded-full bg-primary"
					style="width: {(data.votesInLastHour / data.maxVotesPerHour) * 100}%"
				></div>
			</div>
		</div>
	</div>

	{#if data.votesInLastHour >= data.maxVotesPerHour}
		<Card.Root>
			<Card.Header class="mb-6">
				<Card.Title>Vote limit reached</Card.Title>
				<Card.Description>
					You have reached the maximum of {data.maxVotesPerHour} votes per hour.
					{#if nextVoteTime}
						Next vote available in {nextVoteTime}.
					{/if}
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else if data.scraps && data.scraps.length >= 2}
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
