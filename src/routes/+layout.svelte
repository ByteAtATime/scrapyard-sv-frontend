<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner';
	import ClerkProvider from 'clerk-sveltekit/client/ClerkProvider.svelte';
	import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';

	let { children } = $props();
</script>

<ModeWatcher />
<Toaster />

<ClerkProvider publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}>
	{@render children?.()}
</ClerkProvider>
