<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Loader2, ThumbsUp } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { z } from 'zod';
	import type { voteSchema } from '../schema';
	import AttachmentPreview from '$lib/components/AttachmentPreview.svelte';

	type Props = {
		form: SuperValidated<z.infer<typeof voteSchema>>;
		scrap: {
			id: number;
			title: string;
			description: string;
			attachmentUrls: string[];
			basePoints: number;
			totalPoints: number;
			createdAt: string;
			hasVoted: boolean;
		};
	};

	let { form, scrap }: Props = $props();

	const { enhance, submitting, delayed } = superForm(form, {
		id: `vote-${scrap.id}`,
		onResult: ({ result }) => {
			if (result.type === 'success') {
				// Handle successful vote
			}
		}
	});

	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric'
		});
	};
</script>

<Card>
	<CardHeader>
		<CardTitle>{scrap.title}</CardTitle>
		<CardDescription>Created on {formatDate(scrap.createdAt)}</CardDescription>
	</CardHeader>
	<CardContent>
		<div class="space-y-4">
			<p class="text-sm text-muted-foreground">{scrap.description}</p>
			{#if scrap.attachmentUrls.length > 0}
				<div class="grid grid-cols-2 gap-2">
					{#each scrap.attachmentUrls as url}
						<AttachmentPreview {url} class="h-32 w-full" />
					{/each}
				</div>
			{/if}
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium">Base Points:</span>
				<span class="text-sm text-muted-foreground">{scrap.basePoints}</span>
				<span class="ml-4 text-sm font-medium">Total Points:</span>
				<span class="text-sm text-muted-foreground">{scrap.totalPoints}</span>
			</div>
		</div>
	</CardContent>
	<CardFooter>
		{#if !scrap.hasVoted}
			<form method="POST" action="?/vote" use:enhance>
				<input type="hidden" name="scrapId" value={scrap.id} />
				<Button type="submit" variant="outline" size="sm" disabled={$submitting}>
					{#if $delayed}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{:else}
						<ThumbsUp class="mr-2 h-4 w-4" />
					{/if}
					Vote
				</Button>
			</form>
		{:else}
			<Button variant="outline" size="sm" disabled>
				<ThumbsUp class="mr-2 h-4 w-4" />
				Voted
			</Button>
		{/if}
	</CardFooter>
</Card>
