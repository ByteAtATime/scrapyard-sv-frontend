<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import type { SuperForm, SuperFormData, SuperFormErrors } from 'sveltekit-superforms/client';
	import type { Infer } from 'sveltekit-superforms';
	import type { rejectSchema } from '../schema';

	type Schema = Infer<typeof rejectSchema>;

	type Props = {
		open?: boolean;
		onClose: () => void;
		form: SuperFormData<Schema>;
		formId: string;
		enhance: SuperForm<Schema>['enhance'];
		errors: SuperFormErrors<Schema>;
		submitting: boolean;
	};

	let {
		open = $bindable(false),
		onClose,
		form = $bindable(),
		formId = $bindable(),
		enhance,
		errors,
		submitting
	}: Props = $props();
</script>

<Dialog bind:open>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Reject Transaction</DialogTitle>
			<DialogDescription>Please provide a reason for rejecting this transaction.</DialogDescription>
		</DialogHeader>

		<form method="POST" action="?/reject" use:enhance class="space-y-4">
			<input type="hidden" name="__superform_id" bind:value={formId} />
			<input type="hidden" name="id" bind:value={$form.id} />

			<div class="space-y-2">
				<Label for="reason">Reason</Label>
				<Textarea
					id="reason"
					name="reason"
					bind:value={$form.reason}
					placeholder="Why are you rejecting this transaction?"
					rows={3}
					aria-invalid={$errors.reason ? 'true' : undefined}
				/>
				{#if $errors.reason}
					<p class="text-sm text-destructive">{$errors.reason}</p>
				{/if}
			</div>

			<DialogFooter>
				<Button type="button" variant="outline" onclick={onClose}>Cancel</Button>
				<Button type="submit" disabled={submitting} class="bg-red-500 text-white hover:bg-red-600">
					Reject Transaction
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
