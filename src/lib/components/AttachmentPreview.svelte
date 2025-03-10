<script lang="ts">
	let { url, class: className = '' }: { url: string; class?: string } = $props();

	const attachmentType = $derived.by(() => {
		const extension = url.split('.').pop()?.toLowerCase();
		return {
			isImage: ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension ?? ''),
			isVideo: ['mp4', 'webm', 'ogg'].includes(extension ?? '')
		};
	});
</script>

{#if attachmentType.isImage}
	<a href={url} target="_blank" rel="noopener noreferrer">
		<img
			src={url}
			alt="Attachment"
			class="h-full w-full rounded-lg object-cover {className}"
			loading="lazy"
		/>
	</a>
{:else if attachmentType.isVideo}
	<!-- svelte-ignore a11y_media_has_caption -- user generated content -->
	<video class="h-full w-full rounded-lg {className}" controls preload="metadata">
		<source src={url} type="video/{url.split('.').pop()}" />
		Your browser does not support the video tag.
	</video>
{:else}
	<div class="flex h-full w-full items-center justify-center rounded-lg bg-muted {className}">
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			class="text-sm text-muted-foreground hover:underline"
		>
			Open attachment
		</a>
	</div>
{/if}
