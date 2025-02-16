<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Trophy, Calendar, Award, TrendingUp, type Icon as IconType } from 'lucide-svelte';

	let { data } = $props();

	const formatNumber = (num: number) => {
		return new Intl.NumberFormat('en-US', {
			maximumFractionDigits: 1
		}).format(num);
	};

	const formatPercent = (num: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'percent',
			maximumFractionDigits: 1
		}).format(num);
	};

	const formatDate = (date: Date | string) => {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	};
</script>

{#snippet statCard(label: string, value: string | number, Icon: typeof IconType)}
	<Card class="p-6">
		<div class="flex items-center gap-4">
			<div class="rounded-full bg-primary/10 p-3">
				<Icon class="size-6 text-primary" />
			</div>
			<div>
				<p class="text-sm font-medium text-muted-foreground">{label}</p>
				<h2 class="text-3xl font-bold">{value}</h2>
			</div>
		</div>
	</Card>
{/snippet}

<div class="container mx-auto p-8">
	<div class="mb-8">
		<h1 class="text-4xl font-bold tracking-tight">Your Dashboard</h1>
		<p class="mt-2 text-muted-foreground">Track your progress and upcoming events.</p>
	</div>

	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		{@render statCard('Total XP', formatNumber(data.userStats.totalPoints), Award)}
		{@render statCard(
			'Leaderboard Position',
			`#${data.userStats.leaderboardPosition} of ${data.userStats.totalParticipants}`,
			Trophy
		)}
		{@render statCard('Events Attended', data.userStats.eventsAttended, Calendar)}
		{@render statCard('Attendance Rate', formatPercent(data.userStats.attendanceRate), TrendingUp)}
	</div>

	<div class="mt-8 grid gap-4 md:grid-cols-2">
		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold">Upcoming Events</h3>
			{#if data.upcomingEvents.length === 0}
				<p class="text-muted-foreground">No upcoming events scheduled.</p>
			{:else}
				<div class="space-y-4">
					{#each data.upcomingEvents as event}
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium">{event.name}</p>
								<p class="text-sm text-muted-foreground">
									{formatDate(event.startTime)}
								</p>
							</div>
							<Calendar class="size-5 text-primary" />
						</div>
					{/each}
				</div>
			{/if}
		</Card>

		<Card class="p-6">
			<h3 class="mb-4 text-lg font-semibold">Recent Activity</h3>
			{#if data.userStats.recentTransactions.length === 0}
				<p class="text-muted-foreground">No recent activity.</p>
			{:else}
				<div class="space-y-4">
					{#each data.userStats.recentTransactions as transaction}
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium">{transaction.reason}</p>
								<p class="text-sm text-muted-foreground">
									{formatDate(transaction.createdAt)}
								</p>
							</div>
							<span class="font-medium text-primary"
								>{transaction.amount > 0 ? '+' : ''}{transaction.amount} XP</span
							>
						</div>
					{/each}
				</div>
			{/if}
		</Card>
	</div>
</div>
