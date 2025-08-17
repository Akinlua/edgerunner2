import Provider from "../../../src/interfaces/providers/pinnacle/index.js";
import { test } from "node:test"

const consoleLogSpy = [];
const originalConsoleLog = console.log;
console.log = (...args) => {
	consoleLogSpy.push(args.join(" "));
	originalConsoleLog(...args);
};

test("Provider Service Test", async (t) => {
	let provider;
	t.beforeEach(() => {
		provider = new Provider({
			"name": "pinnacle",
			"storeData": false,
			"interval": 10,
			"userId": "user_30I2I43w4GgKpp0wHILCzs6HJmU",
			"alertApiUrl": "https://swordfish-production.up.railway.app/alerts/user_30I2I43w4GgKpp0wHILCzs6HJmU"
		});
	})
	await t.test("Get Deatiled Provider Data", async (t) => {
		// get a recenet real provider Data
		const providerData = {
			"id": "1754956546957-0",
			"sportId": "1",
			"eventId": "1612577051",
			"lineType": "total",
			"timestamp": "1754956546807",
			"leagueName": "Brazil - Brasileiro Women A2",
			"home": "Atletico Mineiro",
			"away": "Santos",
			"starts": "1754956800000",
		}
		const result = await provider.getDetailedInfo(providerData.eventId);
		console.log("========================");
		console.log(JSON.stringify(result, null, 2));
		console.log("========================");
		console.log("Console Logs:");
	})

})
