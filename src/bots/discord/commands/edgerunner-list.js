import { SlashCommandBuilder, MessageFlags } from "discord.js";
import configurations from "../../../../configurations/index.js";

const apiBase = `${configurations.apiBaseUrl}/edgerunner`;

export default 
	{
		data: new SlashCommandBuilder()
			.setName("runner-list")
			.setDescription("List all running bots"),
		async execute(interaction) {
			await interaction.deferReply({ ephemeral: MessageFlags.Ephemeral });
			try {
				const response = await fetch(`${apiBase}/list`);
				const result = await response.json();
				if (response.ok) {
					const botList = result.bots.map(b => `${b.name} — ${b.status}`).join("\n") || "No bots running";
					await interaction.editReply(`📋 Running Bots:\n${botList}`);
				} else {
					await interaction.editReply(`❌ Failed: ${result.error}`);
				}
			} catch (err) {
				console.error(err);
				await interaction.editReply("❌ Error fetching bots.");
			}
		}
	}
