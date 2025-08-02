export function normalizeTeamName(name) {
	if (!name) return '';
	// Split on spaces, slashes, hyphens
	const parts = name.toLowerCase().split(/[ \/-]/).filter(part => part);

	// Trim parts <=3 chars from front and rear
	let start = 0;
	let end = parts.length;

	while (start < end && parts[start].length < 3) {
		start++;
	}

	while (end > start && parts[end - 1].length < 3) {
		end--;
	}

	let meaningfulParts = parts.slice(start, end);

	// If no meaningful parts remain, use the longest original part
	if (!meaningfulParts.length) {
		meaningfulParts = [parts.reduce((longest, part) => part.length > longest.length ? part : longest, '')];
		console.log(`[Bookmaker] No meaningful parts, using longest: "${meaningfulParts[0]}"`);
	}

	// const keywordsToRemove = ['club', 'deportivo', 'deportes', 'santa'];
	// meaningfulParts = meaningfulParts.filter(part => !keywordsToRemove.includes(part));

	// Join parts and clean up
	let normalized = meaningfulParts.join(' ');
	normalized = normalized.replace(/[.-]/g, ' ');
	normalized = normalized.replace(/\s+/g, ' ');
	normalized = normalized.trim();

	console.log(`[Bookmaker] Final normalized name: "${normalized}"`);
	return normalized;
}


