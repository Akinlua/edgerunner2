import { SlashCommandBuilder, MessageFlags } from "discord.js";
import configurations from "../../../../configurations/index.js";

const apiBase = `${configurations.apiBaseUrl}/edgerunner`;

export default
    {
        data: new SlashCommandBuilder()
            .setName("runner-update")
            .setDescription("Update bot configuration")
			.addStringOption(opt => opt.setName("username").setDescription("The boookmaker account username of the bot to stop").setRequired(true))
            .addNumberOption(opt => opt.setName("fixedstake").setDescription("Fixed stake value"))
            .addNumberOption(opt => opt.setName("stakefraction").setDescription("Stake fraction (e.g., 0.1 for 10%)"))
            .addNumberOption(opt => opt.setName("minvaluebet").setDescription("Min value bet percentage (e.g., 2 for 2%)")),
        async execute(interaction) {
			await interaction.deferReply({ ephemeral: MessageFlags.Ephemeral });
            
            const pm_id = interaction.options.getString("username");
            const fixedStake = interaction.options.getNumber("fixedstake");
            const stakeFraction = interaction.options.getNumber("stakefraction");
            const minValueBetPercentage = interaction.options.getNumber("minvaluebet");

            if (fixedStake === null && stakeFraction === null && minValueBetPercentage === null) {
                await interaction.editReply("❌ You must provide at least one configuration option to update.");
                return;
            }

            const payload = { edgerunner: {} };
            if (fixedStake !== null) {
                payload.edgerunner.fixedStake = { enabled: true, value: fixedStake };
            }
            if (stakeFraction !== null) {
                payload.edgerunner.stakeFraction = stakeFraction;
            }
            if (minValueBetPercentage !== null) {
                payload.edgerunner.minValueBetPercentage = minValueBetPercentage;
            }

            try {
                const response = await fetch(`${apiBase}/config/${pm_id}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                
                const result = await response.json();
                if (response.ok) {
                    await interaction.editReply(`✅ Bot config updated for ID: ${pm_id}`);
                } else {
                    await interaction.editReply(`❌ Failed: ${result.error}`);
                }
            } catch (err) {
                console.error(err);
                await interaction.editReply("❌ Error updating bot config.");
            }
        }
    }
