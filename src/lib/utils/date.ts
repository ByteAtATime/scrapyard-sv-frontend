/* v8 ignore start */
export function formatDate(date: Date): string {
	return date.toLocaleString('en-US', {
		weekday: 'short',
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}
/* v8 ignore end */
