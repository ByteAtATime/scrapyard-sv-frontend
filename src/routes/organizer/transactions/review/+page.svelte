<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import RejectDialog from './_components/RejectDialog.svelte';
	import type { PointTransactionData } from '$lib/server/db/types';

	const { data } = $props();

	const { enhance: approveEnhance, formId: approveFormId } = superForm(data.approveForm, {
		onResult: ({ result }) => {
			if (result.type === 'success') {
				toast.success('Transaction approved successfully!');
			} else if (result.type === 'failure') {
				toast.error(result.data?.error ?? 'Failed to approve transaction', {
					description: result.data?.description
				});
			}
		}
	});

	const {
		form: rejectForm,
		errors: rejectErrors,
		enhance: rejectEnhance,
		submitting: rejectSubmitting,
		formId: rejectFormId
	} = superForm(data.rejectForm, {
		onResult: ({ result }) => {
			if (result.type === 'success') {
				toast.success('Transaction rejected successfully!');
				showRejectDialog = false;
			} else if (result.type === 'failure') {
				toast.error(result.data?.error ?? 'Failed to reject transaction', {
					description: result.data?.description
				});
			}
		}
	});

	const { enhance: deleteEnhance, formId: deleteFormId } = superForm(data.deleteForm, {
		onResult: ({ result }) => {
			if (result.type === 'success') {
				toast.success('Transaction deleted successfully!');
			} else if (result.type === 'failure') {
				toast.error(result.data?.error ?? 'Failed to delete transaction', {
					description: result.data?.description
				});
			}
		}
	});

	let showRejectDialog = $state(false);

	function handleReject(transaction: PointTransactionData) {
		$rejectFormId = transaction.id.toString();
		$rejectForm.id = transaction.id;
		showRejectDialog = true;
	}
</script>

<div class="container mx-auto p-4">
	<Card>
		<CardHeader>
			<CardTitle>Review Transactions</CardTitle>
			<CardDescription>Review and approve/reject/delete point transactions</CardDescription>
		</CardHeader>
		<CardContent>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Date</TableHead>
						<TableHead>User</TableHead>
						<TableHead>Points</TableHead>
						<TableHead>Reason</TableHead>
						<TableHead>Author</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each data.transactions as transaction}
						<TableRow>
							<TableCell>{new Date(transaction.createdAt).toLocaleString()}</TableCell>
							<TableCell>
								<a
									href="/users/{transaction.user.id}"
									class="underline hover:text-blue-800 dark:hover:text-blue-300"
								>
									{transaction.user.name}
								</a>
							</TableCell>
							<TableCell>{transaction.amount}</TableCell>
							<TableCell>{transaction.reason}</TableCell>
							<TableCell>{transaction.authorId}</TableCell>
							<TableCell>
								<StatusBadge
									status={transaction.status}
									reviewer={transaction.reviewer}
									rejectionReason={transaction.rejectionReason}
								/>
							</TableCell>
							<TableCell>
								<div class="flex gap-2">
									{#if transaction.status === 'pending'}
										<form action="?/approve" method="POST" use:approveEnhance>
											<input type="hidden" name="__superform_id" bind:value={transaction.id} />
											<input type="hidden" name="id" bind:value={transaction.id} />
											<Button
												variant="outline"
												size="sm"
												type="submit"
												class="bg-green-500 text-white hover:bg-green-600"
												onclick={() => ($approveFormId = transaction.id.toString())}
											>
												Approve
											</Button>
										</form>
										<Button
											variant="outline"
											size="sm"
											class="bg-red-500 text-white hover:bg-red-600"
											onclick={() => handleReject(transaction)}
										>
											Reject
										</Button>
									{/if}
									<form action="?/delete" method="POST" use:deleteEnhance>
										<input type="hidden" name="__superform_id" bind:value={transaction.id} />
										<input type="hidden" name="id" bind:value={transaction.id} />
										<Button
											variant="outline"
											size="sm"
											class="bg-gray-500 text-white hover:bg-gray-600"
											type="submit"
											onclick={() => ($deleteFormId = transaction.id.toString())}
										>
											Delete
										</Button>
									</form>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</CardContent>
	</Card>
</div>

<RejectDialog
	bind:open={showRejectDialog}
	onClose={() => (showRejectDialog = false)}
	form={rejectForm}
	formId={$rejectFormId}
	enhance={rejectEnhance}
	errors={rejectErrors}
	submitting={$rejectSubmitting}
/>
