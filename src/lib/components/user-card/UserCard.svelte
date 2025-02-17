<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { UserIcon } from 'lucide-svelte';
	import type { User } from '$lib/server/auth/user';
	import { formatDate } from '$lib/utils/date';
	import { CONFIG } from '$lib/config';

	type Props = {
		user: User;
		status?: {
			type: 'success' | 'error';
			message: string;
			timestamp?: boolean;
		};
		compact?: boolean;
	};

	const { user, status, compact = false }: Props = $props();
</script>

<div
	class="rounded-lg border p-3 @container {status?.type === 'error'
		? 'border-red-500 bg-destructive/30'
		: status?.type === 'success'
			? 'bg-muted/50'
			: 'bg-background'}"
>
	<div class="flex flex-col items-center gap-3 @md:flex-row">
		<div class="flex grow flex-col items-center gap-4 @md:flex-row">
			<Avatar.Root class="size-{compact ? '8' : '10'}">
				<Avatar.Fallback>
					<UserIcon class="size-{compact ? '4' : '5'} text-muted-foreground" />
				</Avatar.Fallback>
			</Avatar.Root>

			<div class="text-center @md:text-left">
				<p class="font-medium text-foreground">{user.name}</p>
				<p class="text-sm text-muted-foreground">{user.email}</p>

				{#if !compact}
					<div class="mt-2 flex flex-wrap gap-2 text-xs">
						<span class="rounded-md bg-primary/10 px-2 py-0.5 text-primary">
							ID: {user.id}
						</span>
						<span class="rounded-md bg-primary/10 px-2 py-0.5 text-primary">
							{user.totalPoints}
							{CONFIG.points.plural}
						</span>
						{#if user.isOrganizer}
							<span class="rounded-md bg-blue-500/10 px-2 py-0.5 text-blue-500"> Organizer </span>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		{#if status}
			<div class="text-center @md:text-right">
				<p class="font-medium {status.type === 'error' ? 'text-red-600' : 'text-green-600'}">
					{status.message}
				</p>
				{#if status.timestamp}
					<p class="text-xs text-muted-foreground">{formatDate(new Date())}</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
