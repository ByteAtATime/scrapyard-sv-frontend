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
	import type { ScrapData } from '$lib/server/scrapper/types';
	import { superForm } from 'sveltekit-superforms/client';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { VoteFormData } from '../../scrapper/schema';
	import AttachmentPreview from '$lib/components/AttachmentPreview.svelte';

	type Props = {
		scrap: ScrapData;
		otherScrap: ScrapData;
		form: SuperValidated<VoteFormData>;
		disabled?: boolean;
	};

	let { scrap, otherScrap, form, disabled = false }: Props = $props();

	const { enhance, submitting } = superForm(form, {
		id: `vote-${scrap.id}`
	});

	$effect(() => {
		form.data.scrapId = scrap.id;
		form.data.otherScrapId = otherScrap.id;
	});

	const formatDate = (date: Date) => {
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric'
		});
	};

	const calculatePoints = (scrap: ScrapData) => {
		return scrap.points;
	};
</script>

<Card class="h-full">
	<CardHeader>
		<CardTitle>{scrap.title}</CardTitle>
		<CardDescription>Created {formatDate(scrap.createdAt)}</CardDescription>
	</CardHeader>
	<CardContent class="flex flex-col gap-4">
		{#if scrap.attachmentUrls.length > 0}
			<div class="aspect-video w-full">
				<AttachmentPreview url={scrap.attachmentUrls[0]} />
			</div>
		{/if}
		<p class="text-sm text-muted-foreground">{scrap.description}</p>
	</CardContent>
	<CardFooter class="flex flex-col gap-2">
		<div class="flex w-full items-center justify-between">
			<span class="text-sm text-muted-foreground">Current Points: {calculatePoints(scrap)}</span>
			<span class="text-sm text-muted-foreground">By: {scrap.userId}</span>
		</div>
		<form method="POST" class="w-full" use:enhance>
			<Button type="submit" class="w-full" disabled={disabled || $submitting}>Vote</Button>
		</form>
	</CardFooter>
</Card>
