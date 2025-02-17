<!-- Using Svelte 5 runes -->
<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toast } from 'svelte-sonner';
	import SuperDebug from 'sveltekit-superforms';
	import UserSelect from '$lib/components/user-select/UserSelect.svelte';
	import { CONFIG } from '$lib/config';

	const { data } = $props();

	const { form, errors, enhance, submitting } = superForm(data.form, {
		onResult: ({ result }) => {
			if (result.type === 'success') {
				toast.success(`${CONFIG.points.Plural} awarded successfully!`);
			} else if (result.type === 'failure') {
				console.log(result.data);
				toast.error(result.data?.error ?? `Failed to award ${CONFIG.points.plural}`, {
					description: result.data?.description ?? 'Please try again later'
				});
			}
		},
		onError: ({ result }) => {
			toast.error(result.error?.message ?? `Failed to award ${CONFIG.points.plural}`);
		}
	});
</script>

<div class="container mx-auto max-w-2xl p-4">
	<Card>
		<CardHeader>
			<CardTitle>{CONFIG.points.awardVerb} {CONFIG.points.Plural}</CardTitle>
			<CardDescription>Give {CONFIG.points.plural} to a participant</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" use:enhance class="space-y-6">
				<div class="space-y-2">
					<Label for="userId">User</Label>
					<UserSelect bind:value={$form.userId} error={$errors.userId?.[0]} />
					<input type="hidden" name="userId" bind:value={$form.userId} />
				</div>

				<div class="space-y-2">
					<Label for="amount">{CONFIG.points.Plural}</Label>
					<Input
						type="number"
						id="amount"
						name="amount"
						bind:value={$form.amount}
						min="1"
						aria-invalid={$errors.amount ? 'true' : undefined}
						aria-describedby="amount-error"
					/>
					{#if $errors.amount}
						<p id="amount-error" class="text-sm text-destructive">{$errors.amount}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="reason">Reason</Label>
					<Textarea
						id="reason"
						name="reason"
						bind:value={$form.reason}
						placeholder={`Why are you awarding these ${CONFIG.points.plural}?`}
						rows={3}
						aria-invalid={$errors.reason ? 'true' : undefined}
						aria-describedby="reason-error"
					/>
					{#if $errors.reason}
						<p id="reason-error" class="text-sm text-destructive">{$errors.reason}</p>
					{/if}
				</div>

				<SuperDebug data={$form} />

				<Button type="submit" disabled={$submitting} class="w-full">
					{$submitting
						? `${CONFIG.points.awardVerb}ing ${CONFIG.points.Plural}...`
						: `${CONFIG.points.awardVerb} ${CONFIG.points.Plural}`}
				</Button>
			</form>
		</CardContent>
	</Card>
</div>
