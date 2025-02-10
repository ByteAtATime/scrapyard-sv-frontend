<script lang="ts">
	import {
		Command,
		CommandEmpty,
		CommandGroup,
		CommandInput,
		CommandItem
	} from '$lib/components/ui/command';
	import { Loader2, UserIcon } from 'lucide-svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import type { User } from '$lib/server/auth/user';

	type Props = {
		onSelect: (user: User) => void;
	};

	const { onSelect }: Props = $props();

	let allUsers = $state<User[]>([]);
	let filteredUsers = $state<User[]>([]);
	let isLoading = $state(false);
	let searchQuery = $state('');

	$effect(() => {
		loadUsers();
	});

	async function loadUsers() {
		isLoading = true;
		try {
			const response = await fetch('/api/v1/users');
			if (!response.ok) throw new Error('Failed to load users');
			allUsers = (await response.json()).data;
			filterUsers(searchQuery);
		} catch (error) {
			console.error('Error loading users:', error);
		} finally {
			isLoading = false;
		}
	}

	function filterUsers(query: string) {
		if (!query) {
			filteredUsers = allUsers;
			return;
		}

		const lowerQuery = query.toLowerCase();
		filteredUsers = allUsers.filter(
			(user) =>
				user.name.toLowerCase().includes(lowerQuery) ||
				user.email.toLowerCase().includes(lowerQuery)
		);
	}

	function handleSearch(event: Event) {
		const target = event.target as HTMLInputElement;
		searchQuery = target.value;
		filterUsers(searchQuery);
	}
</script>

<Command class="rounded-lg border shadow-md">
	<CommandInput placeholder="Search users..." oninput={handleSearch} disabled={isLoading} />
	<CommandEmpty>
		{#if isLoading}
			<div class="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
				<Loader2 class="h-4 w-4 animate-spin" />
				Loading users...
			</div>
		{:else}
			No users found.
		{/if}
	</CommandEmpty>
	<CommandGroup>
		{#if isLoading}
			{#each Array(3) as _, i (i)}
				<div class="flex items-center gap-2 px-2 py-1.5">
					<Skeleton class="size-8 rounded-full" />
					<div class="flex-1">
						<Skeleton class="h-4 w-24" />
						<Skeleton class="mt-1 h-3 w-32" />
					</div>
				</div>
			{/each}
		{:else}
			{#each filteredUsers as user (user.id)}
				<CommandItem onSelect={() => onSelect(user)}>
					<div class="flex items-center gap-2">
						<Avatar.Root class="size-8">
							<Avatar.Fallback>
								<UserIcon class="size-5 text-muted-foreground" />
							</Avatar.Fallback>
						</Avatar.Root>
						<div>
							<p class="font-medium">{user.name}</p>
							<p class="text-xs text-muted-foreground">{user.email}</p>
						</div>
					</div>
				</CommandItem>
			{/each}
		{/if}
	</CommandGroup>
</Command>
