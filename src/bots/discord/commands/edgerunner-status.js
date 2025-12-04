import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import configurations from "../../../../configurations/index.js";

const apiBase = `${configurations.apiBaseUrl}/edgerunner`;

// Safe fetch with timeout
async function safeFetch(url, options = {}, timeout = 15000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out")), timeout)
        )
    ]);
}

export default {
    data: new SlashCommandBuilder()
        .setName("runner-status")
        .setDescription("Gets the live status of a running bot.")
        .addStringOption(opt =>
            opt.setName("username")
                .setDescription("The bookmaker account username of the bot.")
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const pm_id = interaction.options.getString("username");

        try {
            const response = await safeFetch(`${apiBase}/status/${pm_id}`);
            const result = await response.json().catch(() => null);

            if (!response.ok) {
                await interaction.editReply(
                    `❌ **Failed to get status:** ${result?.error || "Unknown error"}`
                );
                return;
            }

            const edgerunner = result?.edgerunner || {};
            const bookmaker = result?.bookmaker || {};
            const provider = result?.provider || {};

            const statusEmbed = new EmbedBuilder()
                .setTitle(`📊 Status for Bot: ${pm_id}`)
                .setColor(edgerunner.isActive ? "#57F287" : "#ED4245")
                .addFields(
                    // -----------------------------------------------------
                    // 1. STATUS
                    // -----------------------------------------------------
                    {
                        name: "Bot Status",
                        value: edgerunner.isActive ? "✅ Active" : "🛑 Inactive",
                        inline: true
                    },
                    {
                        name: "Worker",
                        value: edgerunner.isWorkerRunning ? "🏃 Running" : "💤 Idle",
                        inline: true
                    },
                    {
                        name: "Game Queue",
                        value: `\`${edgerunner.queueLength ?? 0}\` games`,
                        inline: true
                    },

                    // -----------------------------------------------------
                    // 2. PERFORMANCE
                    // -----------------------------------------------------
                    {
                        name: "Bankroll",
                        value: `💰 **₦${bookmaker.balance?.toFixed?.(2) ?? "N/A"}**`,
                        inline: true
                    },
                    {
                        name: "Daily Change (₦)",
                        value: `${edgerunner.dailyBalanceChange > 0 ? "🟢" :
                            edgerunner.dailyBalanceChange < 0 ? "🔴" : "⚪"} \`${edgerunner.dailyBalanceChange ?? "0.00"}\``,
                        inline: true
                    },
                    {
                        name: "Daily Change (%)",
                        value: `${edgerunner.dailyBalanceChange > 0 ? "🟢" :
                            edgerunner.dailyBalanceChange < 0 ? "🔴" : "⚪"} \`${edgerunner.dailyChangePercent ?? "0.00"}%\``,
                        inline: true
                    },

                    // -----------------------------------------------------
                    // 3. BETTING STATS
                    // -----------------------------------------------------
                    {
                        name: "Open Bets",
                        value: `🎫 \`${bookmaker.openBets ?? "N/A"}\``,
                        inline: true
                    },
                    {
                        name: "Today Bets",
                        value: `📈 \`${edgerunner.betsPlacedToday ?? 0}\``,
                        inline: true
                    },
                    {
                        name: "Total Bets",
                        value: `🧾 \`${edgerunner.totalBetsPlaced ?? 0}\``,
                        inline: true
                    },
                    {
                        name: "Possible Bets",
                        value: `🎯 \`${edgerunner.possibleBetsCount ?? "N/A"}\``,
                        inline: false
                    },

                    // -----------------------------------------------------
                    // 4. CONFIG
                    // -----------------------------------------------------
                    {
                        name: "Min Value %",
                        value: `**${edgerunner.minValueBetPercentage ?? "N/A"}%**`,
                        inline: true
                    },
                    {
                        name: "Stake Amount",
                        value: `\`${edgerunner.stakeAmount ?? "N/A"}\``,
                        inline: true
                    },
                    {
                        name: "Odds Range",
                        value: `\`${edgerunner.minValueBetOdds ?? "N/A"}\` ↔ \`${edgerunner.maxValueBetOdds ?? "N/A"}\``,
                        inline: true
                    },

                    // -----------------------------------------------------
                    // 5. HEALTH
                    // -----------------------------------------------------
                    {
                        name: "Provider Status",
                        value: `\`\`\`json\n${JSON.stringify(provider.status?.status ?? "N/A", null, 2)}\n\`\`\``,
                        inline: true
                    },
                    {
                        name: "Bookmaker Status",
                        value: `\`\`\`json\n${JSON.stringify(bookmaker.status?.status ?? "N/A", null, 2)}\n\`\`\``,
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({ text: "EdgeRunner Bot Status" });

            await interaction.editReply({ embeds: [statusEmbed] });

        } catch (err) {
            console.error("runner-status error:", err);

            try {
                await interaction.editReply("❌ Error while fetching bot status.");
            } catch {
                // interaction already acknowledged
            }
        }
    }
};
