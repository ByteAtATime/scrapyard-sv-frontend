<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
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
	import { Award, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-svelte';
	import type { QuestData, QuestSubmissionData } from '$lib/server/db/types';
	import { Button } from '$lib/components/ui/button';

	type SubmissionWithQuest = QuestSubmissionData & {
		quest: QuestData;
		submittedAt: string;
		reviewedAt: string | null;
	};

	type PageData = {
		team: { id: number; name: string };
		submissions: SubmissionWithQuest[];
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
</script>

<div class="container mx-auto py-8">
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/quests">
				<Button variant="outline" size="icon">
					<ArrowLeft class="h-4 w-4" />
				</Button>
			</a>
			<h1 class="text-3xl font-bold">Team Quest Submissions</h1>
		</div>
		<Badge variant="outline" class="text-lg">
			{data.team.name}
		</Badge>
	</div>

	{#if data.submissions.length === 0}
		<Card>
			<CardHeader>
				<CardTitle>No Submissions Yet</CardTitle>
				<CardDescription>
					Your team hasn't submitted any quests yet. Go to the quests page to submit one!
				</CardDescription>
			</CardHeader>
		</Card>
	{:else}
		<Card>
			<CardHeader>
				<CardTitle>Submission History</CardTitle>
				<CardDescription>Track the status of your team's quest submissions</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Quest</TableHead>
							<TableHead>Points</TableHead>
							<TableHead>Submitted</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Reviewed</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each data.submissions as submission}
							{@const statusBadge = getStatusBadge(submission.status)}
							<TableRow>
								<TableCell class="font-medium">{submission.quest.name}</TableCell>
								<TableCell>
									<div class="flex items-center gap-1">
										<Award class="h-4 w-4 text-primary" />
										<span>{submission.quest.totalPoints}</span>
									</div>
								</TableCell>
								<TableCell>{formatDate(submission.submittedAt)}</TableCell>
								<TableCell>
									<Badge variant={statusBadge.variant}>
										<statusBadge.icon class="mr-1 h-3 w-3" />
										{statusBadge.text}
									</Badge>
								</TableCell>
								<TableCell>
									{#if submission.reviewedAt}
										{formatDate(submission.reviewedAt)}
									{:else}
										<span class="text-muted-foreground">-</span>
									{/if}
								</TableCell>
							</TableRow>
							{#if submission.status === 'rejected' && submission.rejectionReason}
								<TableRow>
									<TableCell colspan={5} class="bg-destructive/5">
										<div class="flex items-start gap-2 p-2">
											<XCircle class="h-5 w-5 text-destructive" />
											<div>
												<p class="font-semibold text-destructive">Rejection Reason:</p>
												<p>{submission.rejectionReason}</p>
											</div>
										</div>
									</TableCell>
								</TableRow>
							{/if}
						{/each}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	{/if}
</div>
