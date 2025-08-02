import fs from 'fs/promises';
import path from 'path';
import { getBookmakerIntegration } from './bookmakers/index.js';
import { devigOdds } from './provider.service.js';
const CORRELATED_DUMP_PATH = path.join(process.cwd(), 'data', 'correlated_matches.json');
const PROCESSED_IDS_PATH = path.join(process.cwd(), 'data', 'processed_event_ids.json');
import chalk from 'chalk';

const gameQueue = [];
let isWorkerRunning = false;
let processedEventIds = new Set();

async function loadProcessedIds() {
	try {
		const data = await fs.readFile(PROCESSED_IDS_PATH, 'utf-8');
		const ids = JSON.parse(data);
		processedEventIds = new Set(ids);
		console.log(`[Bot] Loaded ${processedEventIds.size} previously processed event IDs.`);
	} catch (error) {
		if (error.code === 'ENOENT') {
			console.log('[Bot] No processed IDs file found. Starting with a fresh set.');
		} else {
			console.error('[Bot] Error loading processed IDs file:', error);
		}
	}
}

async function saveProcessedIds() {
	try {
		await fs.writeFile(PROCESSED_IDS_PATH, JSON.stringify(Array.from(processedEventIds), null, 2));
	} catch (error) {
		console.error('[Bot] Error saving processed IDs file:', error);
	}
}

async function saveSuccessfulMatch(matchData, providerData) {
	try {
		let existingData = [];
		try {
			const fileContent = await fs.readFile(CORRELATED_DUMP_PATH, 'utf-8');
			existingData = JSON.parse(fileContent);
		} catch (readError) { /* File doesn't exist yet, which is fine. */ }

		const comprehensiveData = { providerData: providerData, bookmakerMatch: matchData };
		existingData.push(comprehensiveData);
		await fs.writeFile(CORRELATED_DUMP_PATH, JSON.stringify(existingData, null, 2));
		console.log(`[Bot]   => Success! Saved correlated match ${matchData.EventName} to file.`);

	} catch (error) {
		console.error('[Bot] Error saving successful match to dump file:', error);
	}
}

export function calculateStake(trueOdd, bookmakerOdds, bankroll, fraction = 0.1) {
	// 1. Calculate the "true" probability from the no-vig odds
	const trueProbability = 1 / trueOdd;

	// 2. Calculate the Kelly fraction
	const b = bookmakerOdds - 1;
	const q = 1 - trueProbability;
	const numerator = (b * trueProbability) - q;

	if (numerator <= 0) {
		return 0; // No value, do not bet.
	}

	const fullStake = bankroll * (numerator / b);

	// 3. Return the fractional Kelly stake and round to 2 decimal places
	const finalStake = Math.floor((fullStake * fraction) * 100) / 100;

	return finalStake;
}

export async function evaluateBettingOpportunity(matchData, providerData, bookmaker) {
	try {
		// delete later
		const bookmaker = getBookmakerIntegration('betking');
		const translatedData = bookmaker.translateProviderData(providerData);

		if (!translatedData) {
			console.log(`[Bot] Could not translate provider data for ${providerData.lineType}`);
			return null;
		}

		console.log(chalk.yellow("translated data", JSON.stringify(translatedData)));

		const calculateValue = (selection, providerData) => {
			const outcomeKey = providerData.outcome.toLowerCase();
			const trueOdd = devigOdds(providerData)?.[outcomeKey];

			const fallbackOddsKey = `price${outcomeKey.charAt(0).toUpperCase() + outcomeKey.slice(1)}`;
			const originalOdd = parseFloat(providerData[fallbackOddsKey]);
			const oddsToUse = trueOdd || originalOdd;

			if (!oddsToUse || isNaN(oddsToUse)) {
				console.error(`[Bot] Could not find valid odds for outcome: ${outcomeKey}`);
				return null;
			}

			console.log(chalk.cyan(`Using odds: ${oddsToUse.toFixed(2)} (${trueOdd ? 'No-Vig' : 'Original'})`));

			const value = (selection.odd.value / oddsToUse - 1) * 100;

			return {
				value: value,
				trueOdd: trueOdd,
				bookmakerOdds: selection.odd.value
			};
		};

		// Loop through the bookmaker's markets to find a match
		for (const market of matchData.markets) {
			const marketNameLower = market.name.toLowerCase();
			const translatedMarketNameLower = translatedData.marketName.toLowerCase();

			// --- Case 1: Money Line (1x2) ---
			if (providerData.lineType === 'money_line') {
				if (marketNameLower.startsWith(translatedMarketNameLower)) {
					for (const selection of market.selections) {
						if (selection.name.toLowerCase() === translatedData.selectionName.toLowerCase() && selection.status.toUpperCase() === "VALID") {
							const result = calculateValue(selection, providerData);
							if (result && result.value > 0) {
								console.log(`[BOT] Value bet found: ${result.value.toFixed(2)}%`);
								return { market, selection, trueOdd: result.trueOdd, bookmakerOdds: result.bookmakerOdds };
							}
						}
					}
				}
			}

			// --- Case 2: Totals (Over/Under) ---
			else if (providerData.lineType === 'total') {
				if (marketNameLower.startsWith(translatedMarketNameLower)) {
					const marketPoints = parseFloat(market.specialValue);
					const providerPoints = parseFloat(translatedData.points);
					if (marketPoints === providerPoints) {
						for (const selection of market.selections) {
							if (selection.name.toLowerCase() === translatedData.selectionName.toLowerCase() && selection.status.toUpperCase() === "VALID") {
								const result = calculateValue(selection, providerData);
								if (result && result.value > 0) {
									console.log(`[BOT] Value bet found: ${result.value.toFixed(2)}%`);
									return { market, selection, trueOdd: result.trueOdd, bookmakerOdds: result.bookmakerOdds };
								}
							}
						}
					}
				}
			}

			// --- Case 3: Spreads (Handicap) ---
			else if (providerData.lineType === 'spread') {
				if (marketNameLower.startsWith(translatedMarketNameLower)) {
					const marketPoints = parseFloat(market.specialValue);
					const providerPoints = parseFloat(translatedData.points);
					if (marketPoints === providerPoints) {
						for (const selection of market.selections) {
							if (selection.name.toLowerCase() === translatedData.selectionName.toLowerCase() && selection.status.toUpperCase() === "VALID") {
								const result = calculateValue(selection, providerData);
								if (result && result.value > 0) {
									console.log(`[BOT] Value bet found: ${result.value.toFixed(2)}%`);
									return { market, selection, trueOdd: result.trueOdd, bookmakerOdds: result.bookmakerOdds };
								}
							}
						}
					}
				}
			}
		}

		// If the loop finishes without finding a value bet
		console.log(`[BOT] No value bet found for ${matchData.name}.`);
		return null;

	} catch (error) {
		console.error('[Bot] Error evaluating betting opportunity:', error);
		return null;
	}
}

async function processQueue() {
	if (isWorkerRunning) return;
	isWorkerRunning = true;

	const bookmaker = getBookmakerIntegration('betking');
	console.log('[Bot] Fetching initial account info...');
	const initialAccountInfo = await bookmaker.getAccountInfo("07033054766");
	if (!initialAccountInfo) {
		console.error(chalk.red('[Bot] Could not fetch initial account info. Worker stopping.'));
		isWorkerRunning = false;
		return;
	}

	let bankroll = initialAccountInfo.balance;
	console.log(chalk.green(`[Bot] Worker started. Initial bankroll: ${bankroll}. Jobs in queue: ${gameQueue.length}`));

	while (gameQueue.length > 0) {
		const providerData = gameQueue.pop(); // Using shift for FIFO
		try {
			console.log(`[Bot] Processing: ${providerData.home} vs ${providerData.away}`);

			// --- STEP 1: Find a potential match ---
			const potentialMatch = await bookmaker.getMatchDataByTeamPair(providerData.home, providerData.away);
			if (!potentialMatch) {
				console.log(`[Bot] Match not found for ${providerData.home} vs ${providerData.away}`);
				continue; // Exit for this item
			}
			console.log(`[Bot] Found potential match: ${potentialMatch.EventName}`);

			// --- STEP 2: Get full match details ---
			const detailedMatchData = await bookmaker.getMatchDetailsByEvent(
				potentialMatch.IDEvent,
				potentialMatch.EventName
			);
			if (!detailedMatchData) {
				console.log(`[Bot] Failed to fetch full match details.`);
				continue; // Exit for this item
			}
			console.log(`[Bot] Successfully fetched full data for ${detailedMatchData.name}`);

			// --- STEP 3: Verify the match time ---
			// const isMatchVerified = bookmaker.verifyMatch(detailedMatchData, providerData);
			// if (!isMatchVerified) {
			// 	console.log('[Bot] Match discarded due to time mismatch.');
			// 	continue; // Exit for this item
			// }
			// console.log('[Bot] Match time verified successfully.');
			await saveSuccessfulMatch(detailedMatchData, providerData);

			// --- STEP 4: Evaluate for a value bet ---
			const valueBetDetails = await evaluateBettingOpportunity(detailedMatchData, providerData, bookmaker);
			if (!valueBetDetails) {
				// The evaluate function already logs "no value found"
				continue; // Exit for this item
			}

			// --- FINAL STEP: Calculate stake and place the bet ---
			// This code only runs if all previous checks have passed.
			const stakeAmount = calculateStake(
				valueBetDetails.trueOdd,
				valueBetDetails.bookmakerOdds,
				bankroll
			);

			if (stakeAmount > 0) {
				const summary = {
					match: detailedMatchData.name,
					market: valueBetDetails.market.name,
					selection: valueBetDetails.selection.name,
					odds: valueBetDetails.selection.odd.value,
					stake: stakeAmount,
					potentialWinnings: stakeAmount * valueBetDetails.selection.odd.value,
					bankroll: bankroll
				};
				console.log(chalk.greenBright('[Bot] Constructed Bet:'), summary);

				const betPayload = bookmaker.constructBetPayload(
					detailedMatchData,
					valueBetDetails.market,
					valueBetDetails.selection,
					stakeAmount,
					providerData
				);
				await bookmaker.placeBet("07033054766", betPayload);
				console.log('[Bot] Bet placed, fetching updated account info...');
				const updatedAccountInfo = await bookmaker.getAccountInfo("07033054766");
				if (updatedAccountInfo) {
					bankroll = updatedAccountInfo.balance; // Re-assign the new balance
					console.log(chalk.cyan(`[Bot] Bankroll updated to: ${bankroll}`));
				}

			} else {
				console.log('[Bot] No value according to Kelly Criterion, skipping bet.');
			}

		} catch (error) {
			console.error(`[Bot] Error processing provider data ${providerData.id}:`, error);
		} finally {
			// Add a delay between processing each item
			const delaySeconds = 1;
			await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
		}
	}
	isWorkerRunning = false;
	console.log('[Bot] Queue is empty. Worker is now idle.');
}

/**
 * Adds a list of games to the processing queue after filtering out duplicates by IDEvent.
 */
export function addGamesToProcessingQueue(games) {
	if (!games || !games.length === 0) return;

	// De-duplicate using the IDEvent field against our persistent set.
	// const newGames = games.filter(game => !processedEventIds.has(game.IDEvent));
	const newGames = games;

	if (newGames.length === 0) {
		console.log('[Bot] No new, unprocessed games to add to the queue (all were duplicates).');
		return;
	}

	// Add the new, unique IDEvents to our tracking set and save to file.
	newGames.forEach(game => processedEventIds.add(game.IDEvent));
	saveProcessedIds(); // Persist the new set of IDs

	console.log(`[Bot] Adding ${newGames.length} new games to the processing queue.`);

	// Add debugging index to each new game object before queuing.
	const gamesWithContext = newGames.map((game, index) => ({
		...game,
		debug_index: index,
		debug_total: newGames.length,
	}));

	gameQueue.push(...gamesWithContext);

	processQueue();
}

// Immediately load the processed IDs when the service starts.
loadProcessedIds();
