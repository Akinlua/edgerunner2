import { test, mock, before, beforeEach, after } from "node:test";
import { addGamesToProcessingQueue, evaluateBettingOpportunity } from "../../src/services/bot.service.js";
import { initializeBrowser, closeBrowser } from "../../src/core/browser.js";

// Spy on console.log to capture log messages during the tests.
const consoleLogSpy = [];
const originalConsoleLog = console.log;
console.log = (...args) => {
	consoleLogSpy.push(args.join(" "));
	originalConsoleLog(...args);
};

before(async () => {
	console.log("[Test Setup] Initializing browser for all tests...");
	await initializeBrowser();
});

// This `after` hook runs once after all tests in this file have completed.
after(async () => {
	console.log("[Test Teardown] Closing browser...");
	await closeBrowser();
});

test("Bot Service Tests", async (t) => {
	await initializeBrowser();

	t.beforeEach(() => {
		consoleLogSpy.length = 0;
		mock.restoreAll();
	});

	await t.test("Unit Test: evaluateBettingOpportunity", async () => {
		console.log("\n--- RUNNING TEST: evaluateBettingOpportunity ---");
		const mockData = {
			providerData: {
				lineType: "money_line",
				outcome: "home",
				priceHome: 2.0,
				priceAway: 3.8, // Add this
				priceDraw: 3.4  // Add this
			},
			bookmakerMatch: {
				name: "Test Match",
				markets: [{
					name: "1x2",
					selections: [
						{ name: "1", status: "VALID", odd: { value: 2.2 } },
						{ name: "x", status: "VALID", odd: { value: 3.0 } },
						{ name: "2", status: "VALID", odd: { value: 3.5 } },
					],
				}],
			},
		};

		// ACT: Run the function with mock data
		const result = await evaluateBettingOpportunity(mockData.bookmakerMatch, mockData.providerData);
		console.log("--- RESULT for evaluateBettingOpportunity ---");
		console.log(result);
	});

	await t.test("Unit Test: evaluateBettingOpportunity (Handicap)", async () => {
		console.log("\n--- RUNNING TEST: evaluateBettingOpportunity (Handicap) ---");

		// --- SETUP ---
		// 1. Provider data for a Handicap bet, using the data you provided.
		const mockProviderData = {
			"lineType": "spread",
			"points": "0",
			"outcome": "home",
			"home": "Barrow",
			"away": "Bolton Wanderers",
			"priceHome": "2.36",
			"priceAway": "1.49" // Needed for devigging
		};

		// 2. Mock bookmaker data where the odds are better than the provider's.
		const mockBookmakerMatch = {
			name: "Barrow vs Bolton Wanderers",
			markets: [{
				name: "Handicap",
				specialValue: "0", // This MUST match the provider's 'points'
				selections: [
					// The bookmaker's odd (2.5) is higher than the provider's true odd (around 2.45)
					{ name: "Home", status: "VALID", odd: { value: 2.5 } },
					{ name: "Away", status: "VALID", odd: { value: 1.55 } },
				],
			}],
		};

		const result = await evaluateBettingOpportunity(
			mockBookmakerMatch,
			mockProviderData,
		);

		// --- VERIFICATION ---
		console.log("--- RESULT for evaluateBettingOpportunity (Handicap) ---");
		console.log(result);

	});

	await t.test("Integration Test: Full Workflow (Live)", { skip: true }, { timeout: 90000 }, async () => {
		console.log("\n--- RUNNING TEST: Full Workflow (Live) ---");
		const realProviderData = [
			{
				"id": "test-moneyline-ostersunds-001",
				"sportId": "1",
				"minDropPercent": "14",
				"timeIntervalMs": "210000",
				"maxTimeToMatchStartMs": "21600000",
				"lowerBoundOdds": "1.5",
				"upperBoundOdds": "3.0",
				"nickname": "soccer(test)",
				"includeMoneyline": "1",
				"includeSpreads": "1",
				"includeTotals": "1",
				"percentageChange": "15.00",
				"changeFrom": "2.50",
				"changeTo": "2.10",
				"eventId": "1611563532",
				"periodNumber": "0",
				// --- CORE CHANGES ---
				"lineType": "money_line",
				"points": "", // Points are not used for money line
				"outcome": "away",
				"priceHome": "2.8",
				"priceAway": "2.10",
				"priceDraw": "3.4",
				// --- END OF CORE CHANGES ---
				"timestamp": "1752592803511",
				"leagueName": "Superettan",
				"home": "Ostersunds FK",
				"away": "Helsingborgs IF",
				"noVigPrice": "",
				"starts": "1754247600000",
				"type": "oddsDrop",
				"alertingCriteriaId": "alertingCriteria:a62hxf9dxfnf7exeo2ne3rid",
				"userId": "user_2tx1tBtUOvXZXyUU8BaQ5Bpy15W",
				"lowerBoundLimit": "150",
				"upperBoundLimit": "100000",
				"includeOrExcludeCompetitions": "include",
				"enabled": "1",
				"changeDirection": "increase",
				"includePeriod0": "1",
				"includePeriod1": "1"
			}
		];

		// ACT: Start the process with real provider data.
		addGamesToProcessingQueue(realProviderData);

		// Wait for the process to complete by checking if our mock was called.
		await new Promise((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error("Test timed out waiting for placeBet to be called.")), 80000);
			const interval = setInterval(() => {
				if (placeBetIntegrationMock.mock.callCount() > 0) {
					clearInterval(interval);
					clearTimeout(timeout);
					resolve();
				}
			}, 500);
		});

		console.log("--- RESULT for Full Workflow (Live) ---");
		console.log(`placeBet was called ${placeBetIntegrationMock.mock.callCount()} time(s).`);
	});


	// Close the browser instance after all tests in this file are done.
	t.after(async () => {
		await closeBrowser();
	});
});

