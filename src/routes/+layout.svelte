<script lang="ts">
	import '../app.css';
	import ClerkProvider from 'clerk-sveltekit/client/ClerkProvider.svelte';
	import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';
	let { children } = $props();
</script>

<ClerkProvider publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}>
	{@render children()}
</ClerkProvider>
