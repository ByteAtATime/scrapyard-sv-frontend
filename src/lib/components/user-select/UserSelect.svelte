<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Search, UserIcon, X } from 'lucide-svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Tabs from '$lib/components/ui/tabs';
	import type { User } from './types';
	import SearchUsers from './methods/SearchUsers.svelte';
	import BarcodeScanner from './methods/BarcodeScanner.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';

	type Props = {
		value: number | undefined;
		error?: string;
	};

	let { value = $bindable(), error }: Props = $props();

	let open = $state(false);
	let selectedUser = $state<User | undefined>();
	let isLoading = $state(false);

	$effect(() => {
		if (value && !selectedUser) {
			loadSelectedUser();
		} else if (!value) {
			selectedUser = undefined;
		}
	});

	async function loadSelectedUser() {
		if (!value) return;

		isLoading = true;
		try {
			const response = await fetch(`/api/v1/users/${value}`);
			if (!response.ok) throw new Error('User not found');
			selectedUser = (await response.json()).data;
		} catch (error) {
			console.error('Error fetching user:', error);
			selectedUser = undefined;
		} finally {
			isLoading = false;
		}
	}

	function handleSelect(user: User) {
		selectedUser = user;
		value = user.id;
		open = false;
	}

	function clearSelection() {
		selectedUser = undefined;
		value = undefined;
	}
</script>

<div class="space-y-2">
	{#if selectedUser || isLoading}
		<div class="flex items-center gap-2">
			<div class="flex-1 rounded-lg border px-3 py-2">
				<div class="flex items-center gap-2">
					<Avatar.Root class="size-8">
						<Avatar.Fallback>
							<UserIcon class="size-5 text-muted-foreground" />
						</Avatar.Fallback>
					</Avatar.Root>
					<div class="flex-1 truncate">
						{#if isLoading}
							<Skeleton class="h-4 w-24" />
							<Skeleton class="mt-1 h-3 w-32" />
						{:else}
							<p class="text-sm font-medium">{selectedUser?.name}</p>
							<p class="text-xs text-muted-foreground">{selectedUser?.email}</p>
						{/if}
					</div>
					<Button variant="ghost" size="icon" onclick={clearSelection} class="-mr-2">
						<span class="sr-only">Clear selection</span>
						<X class="h-4 w-4 opacity-50" />
					</Button>
				</div>
			</div>
		</div>
	{:else}
		<Dialog.Root bind:open>
			<Dialog.Trigger class="w-full">
				<Button variant="outline" class="w-full justify-start">
					<Search class="mr-2 h-4 w-4" />
					Select User
				</Button>
			</Dialog.Trigger>
			<Dialog.Content class="sm:max-w-[425px]">
				<Dialog.Header>
					<Dialog.Title>Select User</Dialog.Title>
				</Dialog.Header>

				<Tabs.Root value="search" class="w-full">
					<Tabs.List class="grid w-full grid-cols-2">
						<Tabs.Trigger value="search">Search</Tabs.Trigger>
						<Tabs.Trigger value="barcode">Barcode</Tabs.Trigger>
					</Tabs.List>

					<Tabs.Content value="search">
						<SearchUsers onSelect={handleSelect} />
					</Tabs.Content>

					<Tabs.Content value="barcode">
						<BarcodeScanner onSelect={handleSelect} />
					</Tabs.Content>
				</Tabs.Root>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{/if}
</div>
