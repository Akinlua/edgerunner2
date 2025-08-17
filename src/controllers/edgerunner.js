import { fork } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import configurations from "../../configurations/index.js";
import { createEdgeRunnerConfig } from "../bots/edgerunner/helper.js";
import { client } from "../server.js";
import { ChannelType } from "discord.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Map to store child processes: { botId: ChildProcess }
const bots = new Map();

export async function startBot(req, res) {
	const maxAllowedBots = parseInt(configurations.MAX_EDGERUNNER_INSTANCES) || 1;
	if (bots.size >= maxAllowedBots) {
		console.warn(`[Bot] Start request failed: Maximum number of bots reached [${maxAllowedBots}]`);
		return res.status(429).json({ error: `Server has reached its maximum capacity of running bots [${maxAllowedBots}]` });
	}

	const config = createEdgeRunnerConfig(req.body);
	if (!config.provider.userId || !config.bookmaker.username || !config.bookmaker.password) {
		return res.status(400).json({ error: "Missing required fields: userId, username, password" });
	}

	const botId = config.bookmaker.username;
	const configPath = path.join(__dirname, `../../data/edgerunner/${botId}.json`);

	try {
		// check for duplicates
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

		// create dedicated channel
		const guild = await client.guilds.fetch(configurations.DISCORD_GUILD_ID);
		const category = await guild.channels.fetch(configurations.DISCORD_BOTS_CATEGORY_ID);

		const channel = await guild.channels.create({
			name: `bot-${botId}`,
			type: ChannelType.GuildText,
			parent: category,
			topic: `Logs and status for bot running on account ${botId}.`
		});

		console.log(`[Discord] Created channel #${channel.name} for bot ${botId}`);
		config.discordChannelId = channel.id;

		// Save config
		await fs.mkdir(configDir, { recursive: true });
		await fs.writeFile(configPath, JSON.stringify(config, null, 2));
		console.log(`[Bot ${botId}] Config written to ${configPath}`);

		// Spawn bot process
		const child = fork(path.join(__dirname, "../bots/edgerunner/instance.js"), [], {
			env: { CONFIG_PATH: configPath },
			stdio: ['pipe', 'pipe', 'pipe', 'ipc']
		});

		// Listen for 'log' messages from the child process
		child.on('message', async (msg) => {
			if (msg.type.toLowerCase() === 'log' && msg.message) {
				try {
					// Fetch the channel using the ID we saved and send the message
					const logChannel = await client.channels.fetch(config.discordChannelId);
					if (logChannel) {
						await logChannel.send(msg.message);
					}
				} catch (err) {
					console.error(`[Bot ${botId}] Failed to send log to Discord channel:`, err);
				}
			}
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
	const partialConfig = req.body;
	const configPath = path.join(__dirname, `../../data/edgerunner/${pm_id}.json`);

	try {
		const child = bots.get(pm_id);
		if (!child) {
			return res.status(404).json({ error: "Bot not found" });
		}

		const existingConfig = JSON.parse(await fs.readFile(configPath, 'utf8'));
		const updatedConfig = createEdgeRunnerConfig({ ...existingConfig, ...partialConfig });

		await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
		console.log(`[Bot ${pm_id}] Config updated and saved to ${configPath}`);

		await new Promise((resolve, reject) => {
			child.send({ type: 'config', data: { config: partialConfig.edgerunner } }, (err) => {
				if (err) return reject(err);
				resolve();
			});
		});

		res.json({ message: "Bot configuration updated", pm_id });
	} catch (error) {
		console.error('[Bot] Failed to update configuration:', error);
		res.status(500).json({ error: "Failed to update configuration" });
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
