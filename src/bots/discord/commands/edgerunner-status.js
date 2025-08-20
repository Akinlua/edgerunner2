import { SlashCommandBuilder, MessageFlags } from "discord.js";
import configurations from "../../../../configurations/index.js";

const apiBase = `${configurations.apiBaseUrl}/edgerunner`;

export default
	{
		data: new SlashCommandBuilder()
			.setName("runner-status")
			.setDescription("Get status of a bot")
			.addStringOption(opt => opt.setName("username").setDescription("The boookmaker account username of the bot to stop").setRequired(true)),
		async execute(interaction) {
			await interaction.deferReply({ ephemeral: MessageFlags.Ephemeral });
			const pm_id = interaction.options.getString("username");
			try {
				const response = await fetch(`${apiBase}/status/${pm_id}`);
				const result = await response.json();
				if (response.ok) {
					await interaction.editReply(
						`ℹ️ Bot ${pm_id} status:\n` +
						`Bot Active: ${result.isBotActive}\n` + 
						`Bankroll: ${result.bankroll}\n` +
						`Queue Length: ${result.queueLength}\n` +
						`Worker Running: ${result.isWorkerRunning}\n` +
						`Browser Active: ${result.browserActive}`
					);
				} else {
					await interaction.editReply(`❌ Failed: ${result.error}`);
				}

			} catch (err) {
				console.error(err);
				await interaction.editReply("❌ Error fetching bot status.");
			}
		}
	}
