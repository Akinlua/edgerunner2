import { SlashCommandBuilder } from "discord.js";
import configurations from "../../../../configurations/index.js";

const apiBase = `${configurations.apiBaseUrl}/edgerunner`;

export default
	{
		data: new SlashCommandBuilder()
			.setName("runner-stop")
			.setDescription("Stop a running bot")
			.addStringOption(opt => opt.setName("id").setDescription("Bot ID").setRequired(true)),
		async execute(interaction) {
			await interaction.deferReply({ ephemeral: true });
			const pm_id = interaction.options.getString("id");
			try {
				const response = await fetch(`${apiBase}/stop/${pm_id}`, { method: "POST" });
				const result = await response.json();
				if (response.ok) {
					await interaction.editReply(`🛑 Bot stopped: ${pm_id}`);
				} else {
					await interaction.editReply(`❌ Failed: ${result.error}`);
				}
			} catch (err) {
				console.error(err);
				await interaction.editReply("❌ Error stopping bot.");
			}
		}
	}
