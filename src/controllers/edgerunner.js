import { fork } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import configurations from "../../configurations/index.js";
import { createEdgeRunnerConfig } from "../bots/edgerunner/helper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Map to store child processes: { botId: ChildProcess }
const bots = new Map();

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

export async function startBot(req, res) {
	const maxAllowedBots = parseInt(configurations.MAX_EDGERUNNER_INSTANCES) || 1;
	if (bots.size >= maxAllowedBots) {
		console.warn(`[Bot] Start request failed: Maximum number of bots reached [${maxAllowedBots}]`);
		return res.status(429).json({ error: `Server has reached its maximum capacity of running bots [${maxAllowedBots}]` });
	}

	const config = createEdgeRunnerConfig(req.body);
	// Validation: just ensure required fields exist
	if (!config.provider.userId || !config.bookmaker.username || !config.bookmaker.password) {
		return res.status(400).json({ error: "Missing required fields: userId, username, password" });
	}

	const botId = generateId();
	const configPath = path.join(__dirname, `../../data/edgerunner/${botId}.json`);

	try {
		const configDir = path.join(__dirname, '../../data/edgerunner');
		const existingConfigs = await fs.readdir(configDir).catch(() => []);
		for (const file of existingConfigs) {
			if (file.endsWith('.json')) {
				const existingConfig = JSON.parse(await fs.readFile(path.join(configDir, file), 'utf8'));
				if (existingConfig.bookmaker.username === config.bookmaker.username) {
					return res.status(400).json({ error: `Bookmaker username ${config.bookmaker.username} already in use` });
				}
			}
		}

		// Save config
		await fs.mkdir(configDir, { recursive: true });
		await fs.writeFile(configPath, JSON.stringify(config, null, 2));
		console.log(`[Bot ${botId}] Config written to ${configPath}`);

		// Spawn bot process
		const child = fork(path.join(__dirname, "../bots/edgerunner/instance.js"), [], {
			env: { CONFIG_PATH: configPath },
			stdio: ['pipe', 'pipe', 'pipe', 'ipc']
		});

		child.stdout.on('data', (data) => console.log(`[Bot ${botId}] stdout: ${data.toString().trim()}`));
		child.stderr.on('data', (data) => console.error(`[Bot ${botId}] stderr: ${data.toString().trim()}`));
		child.on('error', (err) => console.error(`[Bot ${botId}] Process error:`, err));
		child.on('exit', (code) => {
			console.log(`[Bot ${botId}] Process exited with code ${code}`);
			bots.delete(botId);
		});

		bots.set(botId, child);
		res.json({ message: "Bot started", pm_id: botId, name: `edgerunner-${botId}` });

	} catch (error) {
		console.error('[Bot] Failed to start bot:', error);
		res.status(500).json({ error: "Failed to start bot" });
	}
}


export async function updateConfig(req, res) {
	const pm_id = req.params.id;
	const { fixedStake, stakeFraction, minValueBetPercentage } = req.body;
	try {
		const child = bots.get(pm_id);
		if (!child) {
			return res.status(400).json({ error: "Bot not found" });
		}
		await new Promise((resolve, reject) => {
			child.send({ type: 'config', data: { config: { fixedStake, stakeFraction, minValueBetPercentage } } }, (err) => {
				if (err) return reject(err);
				resolve();
			});
		});
		res.json({ message: "Bot configuration updated", pm_id });
	} catch (error) {
		console.error('[Bot] Failed to update configuration:', error);
		res.status(400).json({ error: "Invalid configuration update" });
	}
}

export async function stopBot(req, res) {
	const pm_id = req.params.id;
	try {
		const child = bots.get(pm_id);
		if (!child) {
			return res.status(400).json({ error: "Bot not found" });
		}
		await new Promise((resolve, reject) => {
			child.send({ type: 'stop' }, (err) => {
				if (err) return reject(err);
				child.on('exit', () => resolve());
				child.kill('SIGTERM');
			});
		});
		await fs.unlink(path.join(__dirname, `../../data/edgerunner/${pm_id}.json`)).catch(() => { });
		bots.delete(pm_id);
		res.json({ message: "Bot stopped", pm_id });
	} catch (error) {
		console.error('[Bot] Failed to stop bot:', error);
		res.status(400).json({ error: "Failed to stop bot" });
	}
}

export async function listBots(req, res) {
	try {
		const botList = Array.from(bots.entries()).map(([pm_id, child]) => ({
			pm_id,
			name: `edgerunner-${pm_id}`,
			status: child.connected ? 'online' : 'stopped'
		}));
		res.json({ bots: botList });
	} catch (error) {
		console.error('[Bot] Failed to list bots:', error);
		res.status(500).json({ error: "Failed to list bots" });
	}
}

export async function getBotStatus(req, res) {
	const pm_id = req.params.id;
	try {
		const child = bots.get(pm_id);
		if (!child) {
			return res.status(400).json({ error: "Bot not found" });
		}
		const status = await new Promise((resolve, reject) => {
			child.send({ type: 'status' }, (err) => {
				if (err) return reject(err);
				child.once('message', (msg) => {
					if (msg.type === 'status') {
						resolve(msg.data.status);
					} else {
						resolve({ status: child.connected ? 'online' : 'stopped' });
					}
				});
			});
		});
		res.json({ message: "Bot status", pm_id, ...status });
	} catch (error) {
		console.error('[Bot] Failed to get bot status:', error);
		res.status(400).json({ error: "Failed to get bot status" });
	}
}
