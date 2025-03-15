<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
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
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		Award,
		ArrowLeft,
		CheckCircle,
		XCircle,
		AlertCircle,
		ExternalLink,
		Image
	} from 'lucide-svelte';
	import type { QuestData, QuestSubmissionData } from '$lib/server/db/types';
	import { toast } from 'svelte-sonner';
	import AttachmentPreview from '$lib/components/AttachmentPreview.svelte';

	type SubmissionWithTeam = QuestSubmissionData & {
		submittedAt: string;
		reviewedAt: string | null;
		team: { id: number; name: string };
	};

	type PageData = {
		quest: QuestData & { endTime: string };
		submissions: SubmissionWithTeam[];
	};

	const { data } = $props<{ data: PageData }>();

	// Format date to a readable format
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Get status badge for submission
	function getStatusBadge(status: string) {
		switch (status) {
			case 'pending':
				return { variant: 'outline' as const, icon: AlertCircle, text: 'Pending Review' };
			case 'approved':
				return { variant: 'default' as const, icon: CheckCircle, text: 'Approved' };
			case 'rejected':
				return { variant: 'destructive' as const, icon: XCircle, text: 'Rejected' };
			default:
				return { variant: 'outline' as const, icon: AlertCircle, text: status };
		}
	}

	// State for the review dialog
	let selectedSubmission = $state<SubmissionWithTeam | null>(null);
	let rejectionReason = $state('');
	let isReviewing = $state(false);
	let previewAttachment = $state<string | null>(null);

	// Handle submission review
	async function reviewSubmission(status: 'approved' | 'rejected') {
		if (!selectedSubmission) return;

		isReviewing = true;

		try {
			const response = await fetch(`/api/v1/quests/submissions/${selectedSubmission.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					status,
					rejectionReason: status === 'rejected' ? rejectionReason : undefined
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to review submission');
			}

			// Update the submission in the local state
			const updatedSubmission = await response.json();

			// Find and update the submission in the data
			const index = data.submissions.findIndex(
				(sub: SubmissionWithTeam) => sub.id === selectedSubmission?.id
			);
			if (index !== -1) {
				data.submissions[index] = {
					...updatedSubmission,
					team: data.submissions[index].team
				};
			}

			toast.success(`Submission ${status === 'approved' ? 'approved' : 'rejected'} successfully`);

			// Reset state
			selectedSubmission = null;
			rejectionReason = '';
		} catch (error) {
			toast.error('Failed to review submission', {
				description: error instanceof Error ? error.message : 'Unknown error'
			});
		} finally {
			isReviewing = false;
		}
	}

	// Open attachment preview dialog
	function openAttachmentPreview(url: string) {
		previewAttachment = url;
	}
</script>

<div class="container mx-auto py-8">
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href={`/organizer/quests/${data.quest.id}`}>
				<Button variant="outline" size="icon">
					<ArrowLeft class="h-4 w-4" />
				</Button>
			</a>
			<div>
				<h1 class="text-3xl font-bold">{data.quest.name} - Submissions</h1>
				<p class="text-muted-foreground">Review and manage quest submissions</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<Badge variant="outline" class="flex items-center gap-1 text-lg">
				<Award class="h-4 w-4 text-primary" />
				{data.quest.totalPoints} points
			</Badge>
		</div>
	</div>

	{#if data.submissions.length === 0}
		<Card>
			<CardHeader>
				<CardTitle>No Submissions Yet</CardTitle>
				<CardDescription>There are no submissions for this quest yet.</CardDescription>
			</CardHeader>
		</Card>
	{:else}
		<Card>
			<CardHeader>
				<CardTitle>Submissions ({data.submissions.length})</CardTitle>
				<CardDescription>Review and manage team submissions for this quest</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Team</TableHead>
							<TableHead>Submitted By</TableHead>
							<TableHead>Submitted At</TableHead>
							<TableHead>Attachments</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each data.submissions as submission}
							{@const statusBadge = getStatusBadge(submission.status)}
							<TableRow>
								<TableCell class="font-medium">{submission.team.name}</TableCell>
								<TableCell>User #{submission.submittedBy}</TableCell>
								<TableCell>{formatDate(submission.submittedAt)}</TableCell>
								<TableCell>
									<div class="flex flex-wrap gap-2">
										{#each submission.attachmentUrls as url, i}
											<Button
												variant="outline"
												size="sm"
												class="flex items-center gap-1"
												onclick={() => openAttachmentPreview(url)}
											>
												<Image class="h-3 w-3" />
												<span>Attachment {i + 1}</span>
											</Button>
										{/each}
									</div>
								</TableCell>
								<TableCell>
									<Badge variant={statusBadge.variant}>
										<statusBadge.icon class="mr-1 h-3 w-3" />
										{statusBadge.text}
									</Badge>
								</TableCell>
								<TableCell>
									{#if submission.status === 'pending'}
										<Dialog>
											<DialogTrigger>
												<Button
													variant="outline"
													size="sm"
													onclick={() => (selectedSubmission = submission)}
												>
													Review
												</Button>
											</DialogTrigger>
											{#if selectedSubmission && selectedSubmission.id === submission.id}
												<DialogContent class="sm:max-w-[600px]">
													<DialogHeader>
														<DialogTitle>Review Submission</DialogTitle>
														<DialogDescription>
															Review the submission from {submission.team.name}
														</DialogDescription>
													</DialogHeader>
													<div class="grid gap-4 py-4">
														<div>
															<h3 class="mb-2 font-medium">Attachments</h3>
															<div class="grid grid-cols-2 gap-4">
																{#each submission.attachmentUrls as url}
																	<div class="h-40 w-full overflow-hidden rounded-md border">
																		<AttachmentPreview {url} class="h-full w-full" />
																	</div>
																{/each}
															</div>
														</div>
														<div>
															<h3 class="mb-2 font-medium">Rejection Reason (optional)</h3>
															<Textarea
																placeholder="Provide a reason if rejecting the submission"
																bind:value={rejectionReason}
															/>
														</div>
													</div>
													<DialogFooter>
														<Button
															variant="destructive"
															disabled={isReviewing}
															onclick={() => reviewSubmission('rejected')}
														>
															<XCircle class="mr-2 h-4 w-4" />
															Reject
														</Button>
														<Button
															variant="default"
															disabled={isReviewing}
															onclick={() => reviewSubmission('approved')}
														>
															<CheckCircle class="mr-2 h-4 w-4" />
															Approve
														</Button>
													</DialogFooter>
												</DialogContent>
											{/if}
										</Dialog>
									{:else if submission.status === 'rejected' && submission.rejectionReason}
										<Dialog>
											<DialogTrigger>
												<Button variant="outline" size="sm">View Reason</Button>
											</DialogTrigger>
											<DialogContent class="sm:max-w-[425px]">
												<DialogHeader>
													<DialogTitle>Rejection Reason</DialogTitle>
													<DialogDescription>Why this submission was rejected</DialogDescription>
												</DialogHeader>
												<div class="py-4">
													<p>{submission.rejectionReason}</p>
												</div>
											</DialogContent>
										</Dialog>
									{/if}
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	{/if}
</div>

<!-- Attachment Preview Dialog -->
{#if previewAttachment}
	<Dialog open={!!previewAttachment} onOpenChange={() => (previewAttachment = null)}>
		<DialogContent class="sm:max-h-[80vh] sm:max-w-[800px]">
			<DialogHeader>
				<DialogTitle>Attachment Preview</DialogTitle>
			</DialogHeader>
			<div class="flex h-full max-h-[60vh] w-full items-center justify-center overflow-auto p-2">
				<AttachmentPreview url={previewAttachment} class="max-h-full max-w-full" />
			</div>
			<DialogFooter>
				<Button variant="outline" onclick={() => (previewAttachment = null)}>Close</Button>
				<Button
					variant="default"
					onclick={() => {
						if (previewAttachment) window.open(previewAttachment, '_blank');
					}}
				>
					<ExternalLink class="mr-2 h-4 w-4" />
					Open in New Tab
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
