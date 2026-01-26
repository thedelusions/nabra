const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a song from queue')
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('Position in queue (1, 2, 3...)')
                .setMinValue(1)
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('search')
                .setDescription('Search for a track by name (partial match)')
                .setAutocomplete(true)
                .setRequired(false)
        ),
    securityToken: COMMAND_SECURITY_TOKEN,

    // Handle autocomplete for search option
    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        
        try {
            const player = client.riffy.players.get(interaction.guild.id);
            
            if (!player || player.queue.size === 0) {
                return interaction.respond([]);
            }

            const queueArray = Array.from(player.queue);
            
            // Filter and map queue to autocomplete choices
            const choices = queueArray
                .map((track, index) => ({
                    name: `${index + 1}. ${track.info.title.substring(0, 80)}${track.info.title.length > 80 ? '...' : ''}`,
                    value: track.info.title.substring(0, 100)
                }))
                .filter(choice => 
                    focusedValue === '' || 
                    choice.name.toLowerCase().includes(focusedValue) ||
                    choice.value.toLowerCase().includes(focusedValue)
                )
                .slice(0, 25); // Discord limit is 25 choices

            await interaction.respond(choices);
        } catch (error) {
            console.error('Autocomplete error:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction, client) {
        if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
            const embed = new EmbedBuilder()
                .setDescription('❌ System core offline - Command unavailable')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
        }

        interaction.shivaValidated = true;
        interaction.securityToken = COMMAND_SECURITY_TOKEN;

        await interaction.deferReply();

        const ConditionChecker = require('../../utils/checks');
        const checker = new ConditionChecker(client);

        try {
            const conditions = await checker.checkMusicConditions(
                interaction.guild.id, interaction.user.id, interaction.member.voice?.channelId
            );

            if (!conditions.hasActivePlayer || conditions.queueLength === 0) {
                const embed = new EmbedBuilder().setDescription('❌ Queue is empty!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const position = interaction.options.getInteger('position');
            const searchQuery = interaction.options.getString('search');
            
            // User must provide either position or search
            if (!position && !searchQuery) {
                const embed = new EmbedBuilder().setDescription('❌ Please provide either a position number or a search term!\nExample: `/remove position:3` or `/remove search:never gonna`');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
            }

            const player = conditions.player;
            let removedTrack;
            let removedPosition;
            
            if (searchQuery) {
                // Search for track by name (case-insensitive partial match)
                const queueArray = Array.from(player.queue);
                const searchLower = searchQuery.toLowerCase();
                
                // Find all matching tracks
                const matches = queueArray
                    .map((track, index) => ({ track, index }))
                    .filter(({ track }) => 
                        track.info.title.toLowerCase().includes(searchLower) ||
                        track.info.author.toLowerCase().includes(searchLower)
                    );
                
                if (matches.length === 0) {
                    const embed = new EmbedBuilder().setDescription(`❌ No tracks found matching: **${searchQuery}**`);
                    return interaction.editReply({ embeds: [embed] })
                        .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
                }
                
                if (matches.length > 1) {
                    // Show all matches and let user know to be more specific or use position
                    const matchList = matches.slice(0, 10).map(({ track, index }) => 
                        `\`${index + 1}.\` **${track.info.title.substring(0, 50)}${track.info.title.length > 50 ? '...' : ''}**`
                    ).join('\n');
                    
                    const moreText = matches.length > 10 ? `\n... and ${matches.length - 10} more` : '';
                    
                    const embed = new EmbedBuilder()
                        .setDescription(`🔍 Found ${matches.length} matching tracks:\n\n${matchList}${moreText}\n\n💡 **Tip:** Use \`/remove position:X\` to remove a specific track.`)
                        .setColor('#FFA500');
                    return interaction.editReply({ embeds: [embed] })
                        .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 10000));
                }
                
                // Single match - remove it
                removedPosition = matches[0].index + 1;
                removedTrack = player.queue.remove(matches[0].index);
            } else {
                // Remove by position
                if (position > conditions.queueLength) {
                    const embed = new EmbedBuilder().setDescription(`❌ Invalid position! Queue has only ${conditions.queueLength} songs.`);
                    return interaction.editReply({ embeds: [embed] })
                        .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
                }
                
                removedPosition = position;
                removedTrack = player.queue.remove(position - 1);
            }

            const embed = new EmbedBuilder().setDescription(`🗑️ Removed #${removedPosition}: **${removedTrack.info.title}**`);
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));

        } catch (error) {
            console.error('Remove command error:', error);
            const embed = new EmbedBuilder().setDescription('❌ An error occurred while removing the song!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
        }
    }
};
