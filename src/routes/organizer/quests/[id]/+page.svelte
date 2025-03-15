<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
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
	import { ArrowLeft, Clock, Award, FileText, Check, X } from 'lucide-svelte';
	import { formatDate } from '$lib/utils/date';
	import { CONFIG } from '$lib/config';
	import { Badge } from '$lib/components/ui/badge';

	type QuestSubmission = {
		id: number;
		questId: number;
		teamId: number;
		submittedBy: number;
		submittedAt: string;
		attachmentUrls: string;
		status: 'pending' | 'approved' | 'rejected';
		reviewerId: number | null;
		reviewedAt: string | null;
		rejectionReason: string | null;
	};

	type PageData = {
		quest: {
			id: number;
			name: string;
			description: string;
			totalPoints: number;
			endTime: string;
			status: 'active' | 'completed' | 'cancelled';
		};
		submissions: QuestSubmission[];
	};

	const { data } = $props<{ data: PageData }>();

	// Function to get status badge variant
	function getQuestStatusVariant(
		status: string
	): 'default' | 'destructive' | 'outline' | 'secondary' {
		switch (status) {
			case 'active':
				return 'outline';
			case 'completed':
				return 'secondary';
			case 'cancelled':
				return 'destructive';
			default:
				return 'default';
		}
	}

	// Function to get submission status badge variant
	function getSubmissionStatusVariant(
		status: string
	): 'default' | 'destructive' | 'outline' | 'secondary' {
		switch (status) {
			case 'approved':
				return 'outline';
			case 'pending':
				return 'secondary';
			case 'rejected':
				return 'destructive';
			default:
				return 'default';
		}
	}

	// Parse attachment URLs from string
	function parseAttachmentUrls(urlsString: string): string[] {
		try {
			return JSON.parse(urlsString);
		} catch (e) {
			return [];
		}
	}
</script>

<div class="container mx-auto space-y-6 p-4">
	<div class="flex items-center gap-2">
		<Button variant="outline" size="icon" href="/organizer/quests">
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<h1 class="text-3xl font-bold">Quest Details</h1>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<Card>
			<CardHeader>
				<div class="flex items-start justify-between">
					<div>
						<CardTitle>{data.quest.name}</CardTitle>
						<CardDescription class="mt-1">{data.quest.description}</CardDescription>
					</div>
					<Badge variant={getQuestStatusVariant(data.quest.status)}>
						{data.quest.status.charAt(0).toUpperCase() + data.quest.status.slice(1)}
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					<div class="flex items-center gap-2">
						<Clock class="h-4 w-4 text-muted-foreground" />
						<span>Ends: {formatDate(new Date(data.quest.endTime))}</span>
					</div>
					<div class="flex items-center gap-2">
						<Award class="h-4 w-4 text-muted-foreground" />
						<span>{data.quest.totalPoints} {CONFIG.points.Plural}</span>
					</div>
					<div class="flex items-center gap-2">
						<FileText class="h-4 w-4 text-muted-foreground" />
						<span>{data.submissions.length} Submissions</span>
					</div>
				</div>
			</CardContent>
			<CardFooter>
				<div class="flex w-full justify-between">
					<Button variant="outline" href="/organizer/quests/{data.quest.id}/edit">
						Edit Quest
					</Button>
					<Button variant="outline" href="/organizer/quests/{data.quest.id}/submissions">
						View All Submissions
					</Button>
				</div>
			</CardFooter>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Recent Submissions</CardTitle>
				<CardDescription>Latest submissions for this quest</CardDescription>
			</CardHeader>
			<CardContent>
				{#if data.submissions.length === 0}
					<div class="rounded-lg border border-dashed p-8 text-center">
						<p class="text-muted-foreground">No submissions yet</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each data.submissions.slice(0, 5) as submission}
							<div class="rounded-lg border p-4">
								<div class="flex items-start justify-between">
									<div>
										<p class="font-medium">Team ID: {submission.teamId}</p>
										<p class="text-sm text-muted-foreground">
											Submitted: {formatDate(new Date(submission.submittedAt))}
										</p>
									</div>
									<Badge variant={getSubmissionStatusVariant(submission.status)}>
										{submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
									</Badge>
								</div>
								<div class="mt-2">
									<p class="text-sm font-medium">Attachments:</p>
									<div class="mt-1 flex flex-wrap gap-2">
										{#each parseAttachmentUrls(submission.attachmentUrls) as url, i}
											<a
												href={url}
												target="_blank"
												rel="noopener noreferrer"
												class="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs"
											>
												<FileText class="mr-1 h-3 w-3" />
												Attachment {i + 1}
											</a>
										{/each}
									</div>
								</div>
								<div class="mt-4 flex justify-end gap-2">
									<Button
										variant="outline"
										size="sm"
										href="/organizer/quests/{data.quest.id}/submissions/{submission.id}"
									>
										Review
									</Button>
								</div>
							</div>
						{/each}
						{#if data.submissions.length > 5}
							<div class="text-center">
								<Button variant="link" href="/organizer/quests/{data.quest.id}/submissions">
									View all {data.submissions.length} submissions
								</Button>
							</div>
						{/if}
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>
</div>
