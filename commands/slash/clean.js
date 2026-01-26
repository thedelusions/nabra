const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clean')
        .setDescription('Delete bot messages in this channel')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of bot messages to delete (default: 50, max: 100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    securityToken: COMMAND_SECURITY_TOKEN,

    async execute(interaction, client) {
        if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
            const embed = new EmbedBuilder()
                .setDescription('❌ System core offline - Command unavailable')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
        }

        interaction.shivaValidated = true;
        interaction.securityToken = COMMAND_SECURITY_TOKEN;

        await interaction.deferReply({ ephemeral: true });

        const amount = interaction.options.getInteger('amount') || 50;

        try {
            // Fetch messages (Discord API limit is 100)
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            
            // Filter only bot messages
            const botMessages = messages.filter(msg => msg.author.id === client.user.id);
            
            // Take only the requested amount
            const messagesToDelete = Array.from(botMessages.values()).slice(0, amount);
            
            if (messagesToDelete.length === 0) {
                return interaction.editReply({
                    content: '📭 No bot messages found in this channel!'
                });
            }

            // Separate messages into bulk-deletable (< 14 days) and old ones
            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            const bulkDeletable = messagesToDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);
            const oldMessages = messagesToDelete.filter(msg => msg.createdTimestamp <= twoWeeksAgo);

            let deletedCount = 0;

            // Bulk delete recent messages
            if (bulkDeletable.length > 0) {
                try {
                    await interaction.channel.bulkDelete(bulkDeletable, true);
                    deletedCount += bulkDeletable.length;
                } catch (bulkError) {
                    console.error('Bulk delete error:', bulkError.message);
                    // Fallback to individual deletion
                    for (const msg of bulkDeletable) {
                        try {
                            await msg.delete();
                            deletedCount++;
                        } catch (e) {}
                    }
                }
            }

            // Individually delete old messages (can't bulk delete messages > 14 days)
            for (const msg of oldMessages) {
                try {
                    await msg.delete();
                    deletedCount++;
                    // Small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (deleteError) {
                    // Message might already be deleted
                }
            }

            const embed = new EmbedBuilder()
                .setDescription(`🧹 Cleaned up **${deletedCount}** bot message${deletedCount !== 1 ? 's' : ''}!`)
                .setColor(0x2F3767);

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Clean command error:', error);
            return interaction.editReply({
                content: '❌ An error occurred while cleaning messages!'
            });
        }
    }
};
