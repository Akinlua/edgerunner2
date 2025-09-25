import EdgeRunner from "./index.js";
import fs from "fs/promises";
import chalk from "chalk";

async function main() {
  const sendLog = (message) => {
    if (process.send) {
      process.send({ type: "log", message });
    }
  };
  const configPath = process.env.CONFIG_PATH;
  if (!configPath) {
    console.error("[BotRunner] No CONFIG_PATH provided");
    process.exit(1);
  }
  let bot;
  try {
    const config = JSON.parse(await fs.readFile(configPath, "utf8"));
    bot = await EdgeRunner.create(config); // ASSIGN 'bot' here
    await bot.start();
    console.log(
      chalk.green(`[BotRunner] EdgeRunner started with config: ${configPath}`),
    );

    process.on("message", async (msg) => {
      if (msg.type === "config") {
        bot.edgerunnerConf = { ...bot.edgerunnerConf, ...msg.data.config };
        console.log(chalk.cyan(`[BotRunner] Config updated:`, bot.edgerunner));
      } else if (msg.type === "stop") {
        await bot.stop();
        console.log("[BotRunner] Stopped");
        process.exit(0);
      } else if (msg.type === "status") {
        const statusData = await bot.getStatus();
        process.send({
          type: "status",
          data: {
            status: statusData,
          },
        });
      }
    });
  } catch (error) {
    console.error("[BotRunner] Failed to start bot:", error);
    const startupFailureMessage = `🛑 **BOT STARTUP FAILED** 🛑\n**Reason:** ${error.message}`;
    sendLog(startupFailureMessage);

    // 1. Attempt to use the Store method to delete the runtime data file
    if (bot && bot.botStore) {
      try {
        await bot.botStore.deleteStoreFile();
      } catch (cleanupError) {
        console.error(chalk.red("[BotRunner] Final store cleanup failed."));
      }
    } else {
      // 2. FALLBACK: If the bot/store failed to initialize, delete the static config file
      try {
        await fs.unlink(configPath);
        console.log(
          chalk.yellow(
            `[BotRunner] Cleaned up config for failed bot at ${configPath}`,
          ),
        );
      } catch (cleanupError) {
        console.error(
          chalk.red("[BotRunner] Fallback cleanup failed:", cleanupError),
        );
      }
    }
    process.exit(1);
  }
}

main();
