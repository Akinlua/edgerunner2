import { SlashCommandBuilder } from "discord.js";
import configurations from "../../../../configurations/index.js";

const apiBase = `${configurations.apiBaseUrl}/edgerunner`;

export default 
	{
		data: new SlashCommandBuilder()
			.setName("runner-update")
			.setDescription("Update bot configuration")
			.addStringOption(opt => opt.setName("id").setDescription("Bot ID").setRequired(true))
			.addNumberOption(opt => opt.setName("fixedstake").setDescription("Fixed stake value"))
			.addNumberOption(opt => opt.setName("stakefraction").setDescription("Stake fraction"))
			.addNumberOption(opt => opt.setName("minvaluebet").setDescription("Min value bet percentage")),
		async execute(interaction) {
			await interaction.deferReply({ ephemeral: true });
			const pm_id = interaction.options.getString("id");
			const fixedStake = interaction.options.getNumber("fixedstake");
			const stakeFraction = interaction.options.getNumber("stakefraction");
			const minValueBetPercentage = interaction.options.getNumber("minvaluebet");

			try {
				const response = await fetch(`${apiBase}/config/${pm_id}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ fixedStake, stakeFraction, minValueBetPercentage })
				});
				const result = await response.json();
				if (response.ok) {
					await interaction.editReply(`✅ Bot config updated: ${pm_id}`);
				} else {
					await interaction.editReply(`❌ Failed: ${result.error}`);
				}
			} catch (err) {
				console.error(err);
				await interaction.editReply("❌ Error updating bot config.");
			}
		}
	}
