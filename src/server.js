import express from "express";
import morgan from "morgan";
import "dotenv/config.js";
import { 
	Client,
	Events,
	Collection,
	GatewayIntentBits,
	MessageFlags 
} from "discord.js";
import configurations from "../configurations/index.js";
import providerRoutes from "./routes/provider.routes.js";
import bookmakerRoutes from "./routes/bookmaker.routes.js";
import { initializeBrowser, closeBrowser } from './core/browser.js';
import { startPolling } from "./services/provider.service.js";

const PORT = process.env.PORT || 8080;

// Initializes and starts the Discord bot client.
async function startDiscordBot() {
	console.log('[Discord] Initializing Discord Bot...');
	const client = new Client({ intents: [GatewayIntentBits.Guilds] }); 

	client.once(Events.ClientReady, (readyClient) => {
		console.log(`[Discord] Logged in as ${readyClient.user.tag}`);
	});

	client.commands = new Collection();
	try {
		await client.login(configurations.DISCORD_TOKEN);
		console.log('[Discord] Discord Bot initialized successfully.');
	} catch (error) {
		console.error('[Discord] Failed to log in to Discord:', error);
	}
}

// Initializes and starts the background EdgeRunner bot processes.
async function startEdgeRunnerBot() {
	console.log('[Bot] Initializing EdgeRunner Bot...');
	try {
		await initializeBrowser();
		// The polling logic starts here, as you designed.
		if (configurations.USER_ID) {
			startPolling();
		} else {
			console.log("[Bot] User ID is missing, polling will not start.");
		}
		console.log('[Bot] EdgeRunner Bot initialized successfully.');
	} catch (error) {
		console.error('[Bot] Failed to initialize the EdgeRunner Bot:', error);
		// Decide if the whole application should exit if the bot fails to start
		process.exit(1);
	}
}

// The main application function to set up and run the server.
async function main() {
	const app = express();
	app.use(morgan("dev"));
	app.use(express.json());

	app.get("/", (_req, res) => {
		res.json({ message: "Server is active" });
	});
	app.use('/provider', providerRoutes);
	app.use('/bookmaker', bookmakerRoutes);

	app.listen(PORT, () => {
		console.log(`[Server] Server is running on http://localhost:${PORT}`);
		// startDiscordBot();
		startEdgeRunnerBot();
	});
}

main().catch(async (error) => {
	console.error('Failed to start the application:', error);
	await closeBrowser();
	process.exit(1);
});

async function shutdown(signal) {
	console.log(`Received ${signal}. Closing browser and shutting down...`);
	await closeBrowser();
	process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

