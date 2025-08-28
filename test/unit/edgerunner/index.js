import { test, mock, before, beforeEach, after } from "node:test";
import EdgeRunner from "../../../src/bots/edgerunner/index.js";

const consoleLogSpy = [];
const originalConsoleLog = console.log;
console.log = (...args) => {
	consoleLogSpy.push(args.join(" "));
	originalConsoleLog(...args);
};

const providerFootballMarket = {
	"sportId": '1',
	"money_line": {
		"home": 2.81,
		"draw": 3.23,
		"away": 2.27
	},
	"spreads": {
		"0.0": {
			"hdp": 0,
			"alt_line_id": null,
			"home": 2.09,
			"away": 1.671,
			"max": 150
		},
		"-0.75": {
			"hdp": -0.75,
			"alt_line_id": 50071263478,
			"home": 2.74,
			"away": 1.384,
			"max": 150
		},
		"-0.5": {
			"hdp": -0.5,
			"alt_line_id": 50071263479,
			"home": 2.3,
			"away": 1.531,
			"max": 150
		},
		"-0.25": {
			"hdp": -0.25,
			"alt_line_id": 50071263480,
			"home": 2.03,
			"away": 1.709,
			"max": 150
		},
		"0.25": {
			"hdp": 0.25,
			"alt_line_id": 50071263481,
			"home": 1.52,
			"away": 2.38,
			"max": 150
		},
		"0.5": {
			"hdp": 0.5,
			"alt_line_id": 50071263482,
			"home": 1.396,
			"away": 2.69,
			"max": 150
		},
		"0.75": {
			"hdp": 0.75,
			"alt_line_id": 50071263483,
			"home": 1.277,
			"away": 3.28,
			"max": 150
		},
		"-2.0": {
			"hdp": -2.0,
			"home": 3.2,
			"away": 1.8
		},
	},
	"totals": {
		"2.5": {
			"points": 2.5,
			"alt_line_id": null,
			"over": 1.9,
			"under": 1.84,
			"max": 150
		},
		"1.75": {
			"points": 1.75,
			"alt_line_id": 50071263488,
			"over": 1.318,
			"under": 3.03,
			"max": 150
		},
		"2.0": {
			"points": 2,
			"alt_line_id": 50071263489,
			"over": 1.413,
			"under": 2.64,
			"max": 150
		},
		"2.25": {
			"points": 2.25,
			"alt_line_id": 50071263490,
			"over": 1.657,
			"under": 2.11,
			"max": 150
		},
		"2.75": {
			"points": 2.75,
			"alt_line_id": 50071263491,
			"over": 2.13,
			"under": 1.645,
			"max": 150
		},
		"3.0": {
			"points": 3,
			"alt_line_id": 50071263492,
			"over": 2.51,
			"under": 1.452,
			"max": 150
		},
		"3.25": {
			"points": 3.25,
			"alt_line_id": 50071263493,
			"over": 2.8,
			"under": 1.369,
			"max": 150
		}
	},
	"team_total": {
		"home": {
			"points": 1.5,
			"over": 2.26,
			"under": 1.574
		},
		"away": {
			"points": 1.5,
			"over": 2.52,
			"under": 1.467
		}
	}
};

const bookmakerFootballMarket = [
	{
		collectionId: 457397536,
		name: "1X2",
		typeId: 110,
		specialValue: "0",
		selections: [
			{ name: "1", odd: { value: 2.90 }, status: "VALID", specialValue: "0" },
			{ name: "X", odd: { value: 3.20 }, status: "VALID", specialValue: "0" },
			{ name: "2", odd: { value: 2.35 }, status: "VALID", specialValue: "0" }
		]
	},
	{
		collectionId: 457397539,
		name: "Total Goals",
		typeId: 160,
		specialValue: "2.5",
		selections: [
			{ name: "Over", odd: { value: 1.72 }, status: "VALID", specialValue: "2.5" },
			{ name: "Under", odd: { "value": 1.84 }, "status": "VALID", "specialValue": "2.5" }
		]
	},
	{
		collectionId: 457397519,
		name: "Double Chance",
		typeId: 146,
		specialValue: "0",
		selections: [
			{ name: "1X", odd: { value: 1.07 }, status: "VALID", specialValue: "0" },
			{ name: "12", odd: { value: 1.14 }, status: "VALID", specialValue: "0" },
			{ name: "X2", odd: { value: 2.95 }, status: "VALID", specialValue: "0" }
		]
	},
	{
		collectionId: 457397528,
		name: "Chance Mix Total Goals 2.5",
		typeId: 9648,
		specialValue: "2.5",
		selections: [
			{ name: "1 or Over", odd: { value: 1.17 }, status: "VALID", specialValue: "2.5" },
			{ name: "X or Over", odd: { value: 1.39 }, status: "VALID", specialValue: "2.5" },
			{ name: "2 or Over", odd: { value: 1.59 }, status: "VALID", specialValue: "2.5" },
			{ name: "1 or Under", odd: { value: 1.04 }, status: "VALID", specialValue: "2.5" },
			{ name: "X or Under", odd: { value: 1.82 }, status: "VALID", specialValue: "2.5" },
			{ name: "2 or Under", odd: { value: 1.79 }, status: "VALID", specialValue: "2.5" }
		]
	},
	{
		collectionId: 457397527,
		name: "Double Chance & Total Goals 1.5",
		typeId: 9888,
		specialValue: "1.5",
		selections: [
			{ name: "1X And Over", odd: { value: 1.36 }, status: "VALID", specialValue: "1.5" },
			{ name: "12 And Over", odd: { value: 1.47 }, status: "VALID", specialValue: "1.5" },
			{ name: "X2 And Over", odd: { value: 5.7 }, status: "VALID", specialValue: "1.5" },
			{ name: "1X And Under", odd: { value: 4.7 }, status: "VALID", specialValue: "1.5" },
			{ name: "12 And Under", odd: { value: 5.3 }, status: "VALID", specialValue: "1.5" },
			{ name: "X2 And Under", odd: { value: 9.2 }, status: "VALID", specialValue: "1.5" }
		]
	},
	{
		collectionId: 457397518,
		name: "Double Chance & Total Goals 3.5",
		typeId: 9888,
		specialValue: "3.5",
		selections: [
			{ name: "1X And Over", odd: { value: 3.2 }, status: "VALID", specialValue: "3.5" },
			{ name: "12 And Over", odd: { value: 3.4 }, status: "VALID", specialValue: "3.5" },
			{ name: "X2 And Over", odd: { value: 21 }, status: "VALID", specialValue: "3.5" },
			{ name: "1X And Under", odd: { value: 1.57 }, status: "VALID", specialValue: "3.5" },
			{ name: "12 And Under", odd: { value: 1.74 }, status: "VALID", specialValue: "3.5" },
			{ name: "X2 And Under", odd: { value: 4.35 }, status: "VALID", specialValue: "3.5" }
		]
	},
	{
		collectionId: 457397517,
		name: "GG/NG",
		typeId: 302,
		specialValue: "0",
		selections: [
			{ name: "GG", odd: { value: 2.16 }, status: "VALID", specialValue: "0" },
			{ name: "NG", odd: { value: 1.52 }, status: "VALID", specialValue: "0" }
		]
	},
	{
		collectionId: 457397544,
		name: "Handicap -2",
		typeId: 342,
		specialValue: "0 : 2",
		selections: [
			{ name: "Home", odd: { value: 3.2 }, status: "VALID", specialValue: "0 : 2" },
			{ name: "Draw", odd: { value: 3.85 }, status: "VALID", specialValue: "0 : 2" },
			{ name: "Away", odd: { value: 1.8 }, status: "VALID", specialValue: "0 : 2" }
		]
	},
	{
		collectionId: 457397523,
		name: "Draw No Bet",
		typeId: 147,
		specialValue: "0",
		selections: [
			{ name: "1 DNB", odd: { value: 2.03 }, status: "VALID", specialValue: "0" },
			{ name: "2 DNB", odd: { value: 1.67 }, status: "VALID", specialValue: "0" }
		]
	}
]

const providerBasketballMarket = {
	"sportId": '3',
	"money_line": {
		"home": 1.666,
		"draw": null,
		"away": 2.13
	},
	"spreads": {
		"-3.0": {
			"hdp": -3,
			"alt_line_id": null,
			"home": 1.847,
			"away": 1.884,
			"max": 200
		},
		"-5.5": {
			"hdp": -5.5,
			"alt_line_id": 50108332724,
			"home": 2.24,
			"away": 1.578,
			"max": 200
		},
		"-5.0": {
			"hdp": -5,
			"alt_line_id": 50108332725,
			"home": 2.16,
			"away": 1.625,
			"max": 200
		},
		"-4.5": {
			"hdp": -4.5,
			"alt_line_id": 50108332726,
			"home": 2.08,
			"away": 1.675,
			"max": 200
		},
		"-4.0": {
			"hdp": -4,
			"alt_line_id": 50108332727,
			"home": 2.01,
			"away": 1.735,
			"max": 200
		},
		"-3.5": {
			"hdp": -3.5,
			"alt_line_id": 50108332728,
			"home": 1.925,
			"away": 1.806,
			"max": 200
		},
		"-2.5": {
			"hdp": -2.5,
			"alt_line_id": 50108332729,
			"home": 1.769,
			"away": 1.97,
			"max": 200
		},
		"-2.0": {
			"hdp": -2,
			"alt_line_id": 50108332730,
			"home": 1.689,
			"away": 2.07,
			"max": 200
		},
		"-1.5": {
			"hdp": -1.5,
			"alt_line_id": 50108332731,
			"home": 1.621,
			"away": 2.17,
			"max": 200
		},
		"-1.0": {
			"hdp": -1,
			"alt_line_id": 50108332732,
			"home": 1.584,
			"away": 2.23,
			"max": 200
		},
		"1.0": {
			"hdp": 1,
			"alt_line_id": 50108332733,
			"home": 1.523,
			"away": 2.36,
			"max": 200
		}
	},
	"totals": {
		"151.0": {
			"points": 151,
			"alt_line_id": null,
			"over": 1.892,
			"under": 1.847,
			"max": 200
		},
		"148.5": {
			"points": 148.5,
			"alt_line_id": 50108332734,
			"over": 1.666,
			"under": 2.12,
			"max": 200
		},
		"149.0": {
			"points": 149,
			"alt_line_id": 50108332735,
			"over": 1.704,
			"under": 2.07,
			"max": 200
		},
		"149.5": {
			"points": 149.5,
			"alt_line_id": 50108332736,
			"over": 1.746,
			"under": 2.01,
			"max": 200
		},
		"150.0": {
			"points": 150,
			"alt_line_id": 50108332737,
			"over": 1.787,
			"under": 1.961,
			"max": 200
		},
		"150.5": {
			"points": 150.5,
			"alt_line_id": 50108332738,
			"over": 1.833,
			"under": 1.9,
			"max": 200
		},
		"151.5": {
			"points": 151.5,
			"alt_line_id": 50108332739,
			"over": 1.943,
			"under": 1.8,
			"max": 200
		},
		"152.0": {
			"points": 152,
			"alt_line_id": 50108332740,
			"over": 2,
			"under": 1.751,
			"max": 200
		},
		"152.5": {
			"points": 152.5,
			"alt_line_id": 50108332741,
			"over": 2.06,
			"under": 1.709,
			"max": 200
		},
		"153.0": {
			"points": 153,
			"alt_line_id": 50108332742,
			"over": 2.12,
			"under": 1.671,
			"max": 200
		},
		"153.5": {
			"points": 153.5,
			"alt_line_id": 50108332743,
			"over": 2.17,
			"under": 1.636,
			"max": 200
		}
	},
	"team_total": null,

}


const bookmakerBasketballMarket = [
	{
		collectionId: 457397536,
		name: "Moneyline",
		typeId: 110,
		specialValue: "0",
		selections: [
			{ name: "1", odd: { value: 1.62 }, status: "VALID", specialValue: "0" },
			{ name: "2", odd: { value: 2.44 }, status: "VALID", specialValue: "0" }
		]
	},
	{
		collectionId: 457397536,
		name: "1X2 - Regular Time",
		typeId: 110,
		specialValue: "0",
		selections: [
			{ name: "1", odd: { value: 1.62 }, status: "VALID", specialValue: "0" },
			{ name: "X", odd: { value: 14.25 }, status: "VALID", specialValue: "0" },
			{ name: "2", odd: { value: 2.44 }, status: "VALID", specialValue: "0" }
		]
	},
	{
		collectionId: 457397539,
		name: "Total (Incl. Overtime)",
		typeId: 9302,
		specialValue: "149.5",
		selections: [
			{ name: "Over", odd: { value: 1.72 }, status: "VALID", specialValue: "149.5" },
			{ name: "Under", odd: { "value": 1.84 }, "status": "VALID", "specialValue": "149.5" }
		]
	},
	{
		collectionId: 457397539,
		name: "Total (Incl. Overtime)",
		typeId: 9302,
		specialValue: "151.5",
		selections: [
			{ name: "Over", odd: { value: 1.72 }, status: "VALID", specialValue: "151.5" },
			{ name: "Under", odd: { "value": 1.73 }, "status": "VALID", "specialValue": "151.5" }
		]
	},
	{
		collectionId: 457397544,
		name: "Handicap (Incl. Overtime) -3.5",
		typeId: 9322,
		specialValue: "0 : 3.5",
		selections: [
			{ name: "1 AH", odd: { value: 1.7 }, status: "VALID", specialValue: "0 : 3.5" },
			{ name: "2 AH", odd: { value: 1.8 }, status: "VALID", specialValue: "0 : 3.5" }
		]
	},
]


test("Bot Service Tests", async (t) => {
	let edgerunner;

	t.before(async () => {
		consoleLogSpy.length = 0;
		mock.restoreAll();
		edgerunner = await EdgeRunner.create(
			{
				"provider": {
					"name": "pinnacle",
					"storeData": false,
					"interval": 2,
					"userId": "user_30I2I43w4GgKpp0wHILCzs6HJmU",
					"alertApiUrl": "https://swordfish-production.up.railway.app/alerts/user_30I2I43w4GgKpp0wHILCzs6HJmU"
				},
				"bookmaker": {
					"name": "betking",
					"storeData": false,
					"interval": 2,
					"username": "07033054766",
					"password": "A1N2S3I4"
				},
				"edgerunner": {
					"name": "edgerunner",
					"stakeFraction": 0.1,
					"fixedStake": {
						"enabled": true,
						"value": 10
					},
					"minValueBetPercentage": 0
				}
			}

		);
	});

	await t.test("Evaluate function for football", { skip: true }, async (t) => {
		const result = edgerunner.bridgeMarket(bookmakerFootballMarket, providerFootballMarket);
		console.log("================ FOOTBALL ================");
		console.log(JSON.stringify(result, null, 2));
		console.log("===========================================");
	});

	await t.test("Evaluate function for basketball", { skip: true }, async (t) => {
		const result = edgerunner.bridgeMarket(bookmakerBasketballMarket, providerBasketballMarket);
		console.log("================ BASKETBALL ===============");
		console.log(JSON.stringify(result, null, 2));
		console.log("============================================");
	});

	await t.test("Evaluate function for basketball", async (t) => {
		const result = edgerunner.evaluateMarket(bookmakerFootballMarket, providerFootballMarket);
		console.log("================ xxxxxxxxx ================");
		console.log(JSON.stringify(result, null, 2));
		console.log("===========================================");
	});

	t.after(async () => {
		await edgerunner.stop();
	});
});
