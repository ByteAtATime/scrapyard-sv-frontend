<script lang="ts">
	import '../app.css';
	import ClerkProvider from 'clerk-sveltekit/client/ClerkProvider.svelte';
	import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';
	import { ModeWatcher } from 'mode-watcher';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	let { children } = $props();
</script>

<ModeWatcher />

<ClerkProvider publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}>
	<ThemeToggle />

	{@render children?.()}
</ClerkProvider>
