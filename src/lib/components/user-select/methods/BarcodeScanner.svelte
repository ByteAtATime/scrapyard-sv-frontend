<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import type { User } from '$lib/server/auth/user';
	import { Loader2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	type Props = {
		onSelect: (user: User) => void;
	};

	const { onSelect }: Props = $props();

	let isLoading = $state(false);
	let barcodeInput = $state('');

	async function handleBarcodeSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!barcodeInput) return;

		isLoading = true;
		try {
			const response = await fetch(`/api/v1/users/${barcodeInput}`);
			if (!response.ok) {
				toast.error('User not found');
				return;
			}
			const user = (await response.json()).data;
			onSelect(user);
		} catch (error) {
			console.error('Error fetching user:', error);
		} finally {
			isLoading = false;
			barcodeInput = '';
		}
	}
</script>

<form onsubmit={handleBarcodeSubmit} class="space-y-4">
	<Input
		type="text"
		placeholder="Scan barcode or enter user ID"
		bind:value={barcodeInput}
		autocomplete="off"
		disabled={isLoading}
	/>
	<Button type="submit" class="w-full" disabled={isLoading || !barcodeInput}>
		{#if isLoading}
			<Loader2 class="mr-2 h-4 w-4 animate-spin" />
			Searching...
		{:else}
			Find User
		{/if}
	</Button>
</form>
