<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { onMount, onDestroy, untrack } from 'svelte';
	import { formatDuration } from '$lib/utils';
	import { Loader2 } from 'lucide-svelte';
	import ScrapDialog from './scrap-dialog.svelte';

	const { data } = $props();

	let currentSession = $state(data.session);
	let elapsedTimeMs = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | undefined;

	// Create forms for all actions with loading state
	const startForm = superForm(data.startForm, {
		onResult: ({ result }) => {
			if (result.type === 'success') {
				toast.success('Session started');
			} else {
				toast.error('Failed to start session', {
					description: result.type === 'error' ? result.error : 'Unknown error'
				});
			}
		}
	});

	const pauseForm = superForm(data.pauseForm, {
		onResult: ({ result }) => {
			if (result.type === 'success') {
				clearInterval(timerInterval);
				timerInterval = undefined;
				toast.success('Session paused');
			} else {
				toast.error('Failed to pause session', {
					description: result.type === 'error' ? result.error : 'Unknown error'
				});
			}
		}
	});

	const resumeForm = superForm(data.resumeForm, {
		onResult: ({ result }) => {
			if (result.type === 'success') {
				toast.success('Session resumed');
			} else {
				toast.error('Failed to resume session', {
					description: result.type === 'error' ? result.error : 'Unknown error'
				});
			}
		}
	});

	const cancelForm = superForm(data.cancelForm, {
		onResult: ({ result }) => {
			if (result.type === 'success') {
				clearInterval(timerInterval);
				timerInterval = undefined;
				toast.success('Session cancelled');
			} else {
				toast.error('Failed to cancel session', {
					description: result.type === 'error' ? result.error : 'Unknown error'
				});
			}
		}
	});

	// Destructure form properties for each form
	const { enhance: startEnhance, submitting: startSubmitting } = startForm;
	const { enhance: pauseEnhance, submitting: pauseSubmitting } = pauseForm;
	const { enhance: resumeEnhance, submitting: resumeSubmitting } = resumeForm;
	const { enhance: cancelEnhance, submitting: cancelSubmitting } = cancelForm;

	function startTimer() {
		if (timerInterval) clearInterval(timerInterval);

		// Calculate initial elapsed time
		if (currentSession) {
			const startTime = new Date(currentSession.startTime).getTime();
			const pausedMs = currentSession.totalPausedSeconds * 1000;

			if (currentSession.status === 'active') {
				// For active sessions, calculate time from start until now, minus paused time
				elapsedTimeMs = Date.now() - startTime - pausedMs;

				// Update the timer every second
				timerInterval = setInterval(() => {
					elapsedTimeMs = Date.now() - startTime - pausedMs;
				}, 1000);
			} else if (currentSession.status === 'paused') {
				// For paused sessions, calculate time from start until pause time
				const pauseTime = currentSession.lastPausedAt
					? new Date(currentSession.lastPausedAt).getTime()
					: Date.now();

				elapsedTimeMs = pauseTime - startTime - pausedMs;
			}
		} else {
			elapsedTimeMs = 0;
		}
	}

	// Initialize timer on mount if session exists
	onMount(() => {
		if (currentSession && currentSession.status === 'active') {
			startTimer();
		} else if (currentSession && currentSession.status === 'paused') {
			startTimer(); // Initialize the timer for paused sessions too
		}
	});

	onDestroy(() => {
		if (timerInterval) clearInterval(timerInterval);
	});

	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- reactivity
		data.session;

		untrack(() => {
			if (data.session !== currentSession) {
				currentSession = data.session;

				if (currentSession?.status === 'active') {
					startTimer();
				} else if (currentSession?.status === 'paused') {
					startTimer();
				}
			}
		});
	});
</script>

<div class="container mx-auto py-8">
	<div class="mx-auto max-w-xl">
		<Card class="shadow-lg">
			<CardHeader>
				<CardTitle class="text-center">
					{#if !currentSession}
						Ready to start a session?
					{:else if currentSession.status === 'active'}
						Session in Progress
					{:else if currentSession.status === 'paused'}
						Session Paused
					{:else if currentSession.status === 'completed'}
						Session Completed
					{/if}
				</CardTitle>
			</CardHeader>

			<CardContent>
				<div class="mb-6 flex items-center justify-center">
					<div class="text-center font-mono text-6xl tabular-nums">
						{formatDuration(elapsedTimeMs)}
					</div>
				</div>

				<div class="mb-6 text-center text-sm">
					{#if currentSession?.status === 'active'}
						<p class="text-green-600 dark:text-green-400">Session is active</p>
					{:else if currentSession?.status === 'paused'}
						<p class="text-amber-600 dark:text-amber-400">Session is paused</p>
					{:else if currentSession?.status === 'completed'}
						<p class="text-green-600 dark:text-green-400">
							Session completed! Create a scrap to earn points.
						</p>
					{:else if !currentSession}
						<p class="text-muted-foreground">Start a session to track your work</p>
					{/if}
				</div>
			</CardContent>

			<CardFooter class="flex flex-wrap justify-center gap-4">
				{#if !currentSession}
					<form method="POST" action="?/start" use:startEnhance>
						<Button type="submit" disabled={$startSubmitting}>
							{#if $startSubmitting}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{/if}
							Start Session
						</Button>
					</form>
				{:else if currentSession.status === 'active'}
					<form method="POST" action="?/pause" use:pauseEnhance>
						<Button type="submit" variant="outline" disabled={$pauseSubmitting}>
							{#if $pauseSubmitting}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{/if}
							Pause
						</Button>
					</form>
					<ScrapDialog form={data.uploadForm} />
					<form method="POST" action="?/cancel" use:cancelEnhance>
						<Button type="submit" variant="destructive" disabled={$cancelSubmitting}>
							{#if $cancelSubmitting}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{/if}
							Cancel
						</Button>
					</form>
				{:else if currentSession.status === 'paused'}
					<form method="POST" action="?/resume" use:resumeEnhance>
						<Button type="submit" variant="default" disabled={$resumeSubmitting}>
							{#if $resumeSubmitting}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{/if}
							Resume
						</Button>
					</form>
					<ScrapDialog form={data.uploadForm} />
					<form method="POST" action="?/cancel" use:cancelEnhance>
						<Button type="submit" variant="destructive" disabled={$cancelSubmitting}>
							{#if $cancelSubmitting}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{/if}
							Cancel
						</Button>
					</form>
				{/if}
			</CardFooter>
		</Card>
	</div>
</div>
