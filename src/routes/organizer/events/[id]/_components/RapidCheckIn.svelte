<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { toast } from 'svelte-sonner';
	import { Loader2 } from 'lucide-svelte';
	import type { User } from '$lib/server/auth/user';
	import UserSelect from '$lib/components/user-select/UserSelect.svelte';
	import UserCard from '$lib/components/user-card/UserCard.svelte';

	type Props = {
		onCheckIn: (userId: number) => Promise<boolean>;
	};

	const { onCheckIn }: Props = $props();

	let input = $state('');
	let isLoading = $state(false);
	let lastCheckedUser = $state<User | undefined>();
	let manualUserId = $state<number | undefined>();
	let checkInError = $state(false);

	let inputRef: HTMLInputElement | null = $state(null);
	$effect(() => {
		if (inputRef) {
			inputRef.focus();
		}
	});

	$effect.pre(() => {
		if (manualUserId) {
			handleManualCheckIn();
		}
	});

	async function handleManualCheckIn() {
		if (!manualUserId || isLoading) return;

		isLoading = true;
		checkInError = false;
		try {
			const response = await fetch(`/api/v1/users/${manualUserId}`);
			if (!response.ok) {
				toast.error('User not found');
				return;
			}

			const user = (await response.json()).data;
			lastCheckedUser = user;

			const success = await onCheckIn(user.id);
			checkInError = !success;

			if (success) {
				input = '';
				inputRef?.focus();
			}
		} catch (error) {
			console.error('Error fetching user:', error);
			lastCheckedUser = undefined;
			toast.error('Failed to fetch user');
		} finally {
			isLoading = false;
			manualUserId = undefined;
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!input || isLoading) return;

		isLoading = true;
		checkInError = false;
		try {
			const response = await fetch(`/api/v1/users/${input}`);
			if (!response.ok) {
				toast.error('User not found');
				return;
			}

			const user = (await response.json()).data;
			lastCheckedUser = user;

			const success = await onCheckIn(user.id);
			checkInError = !success;

			if (success) {
				const updatedResponse = await fetch(`/api/v1/users/${user.id}`);
				if (updatedResponse.ok) {
					const updatedUser = (await updatedResponse.json()).data;
					lastCheckedUser = updatedUser;
				}

				input = '';
				inputRef?.focus();
			}
		} catch (error) {
			console.error('Error fetching user:', error);
			lastCheckedUser = undefined;
			toast.error('Failed to fetch user');
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="space-y-4">
	<div class="flex gap-2">
		<div class="relative flex-1">
			<Input
				bind:ref={inputRef}
				type="text"
				placeholder="Scan barcode or enter user ID"
				bind:value={input}
				autocomplete="off"
				disabled={isLoading}
				class="pr-12"
				form="scan-form"
			/>
			{#if isLoading}
				<div class="absolute right-3 top-1/2 -translate-y-1/2">
					<Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			{/if}
		</div>
		<div>
			<UserSelect bind:value={manualUserId} />
		</div>
	</div>

	<form id="scan-form" onsubmit={handleSubmit} class="hidden"></form>

	{#if lastCheckedUser}
		<UserCard
			user={lastCheckedUser}
			status={{
				type: checkInError ? 'error' : 'success',
				message: checkInError ? 'Check-in failed' : 'Successfully checked in',
				timestamp: true
			}}
		/>
	{/if}
</div>
