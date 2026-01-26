const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

/**
 * Create music control buttons
 * @returns {ActionRowBuilder[]} Rows of music control buttons
 */
function createMusicButtons() {
     const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_previous')
                    .setEmoji('<:previous:1464824227827023891>')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_pause')
                    .setEmoji('<:pause:1464823417248415829>')
                    .setStyle(ButtonStyle.Secondary),
    
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setEmoji('<:next:1464824274186666139>')
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId('music_queue')
                    .setEmoji('<:queue:1464823466359521331>')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Row 2: Stop | Loop | Shuffle | Help
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setEmoji('<:stop:1464823585146273967>')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setEmoji('<:repeat:1464823558126698602>')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setEmoji('<:shuffle2:1464823491009314951>')
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId('music_help')
                    .setEmoji('❓')
                    .setStyle(ButtonStyle.Secondary)  
            );
    return [row1, row2];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song or add to queue')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name, URL, or search query')
                .setRequired(true)
        ),
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

        await interaction.deferReply();

        const ConditionChecker = require('../../utils/checks');
        const PlayerHandler = require('../../utils/player');
        const ErrorHandler = require('../../utils/errorHandler');
        const MusicFormatters = require('../../utils/formatters');
        
        const query = interaction.options.getString('query');

        try {
            const checker = new ConditionChecker(client);
            const conditions = await checker.checkMusicConditions(
                interaction.guild.id, 
                interaction.user.id, 
                interaction.member.voice?.channelId
            );

            const errorMsg = checker.getErrorMessage(conditions, 'play');
            if (errorMsg) {
                const embed = MusicFormatters.createErrorEmbed(errorMsg);
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
            }

            const playerHandler = new PlayerHandler(client);
            const player = await playerHandler.createPlayer(
                interaction.guild.id,
                interaction.member.voice.channelId,
                interaction.channel.id
            );

            const result = await playerHandler.playSong(player, query, interaction.user);
            const buttons = createMusicButtons();

            if (result.type === 'track') {
                const isPlaying = !player.playing && player.queue.size === 0;
                const embed = MusicFormatters.createTrackAddedEmbed(result.track, player, isPlaying);
                return interaction.editReply({ embeds: [embed], components: buttons })
                    .then(() => setTimeout(() => {
                        interaction.editReply({ components: [] }).catch(() => {});
                    }, 60000)); // Remove buttons after 60s
            } else if (result.type === 'playlist') {
                const embed = MusicFormatters.createPlaylistAddedEmbed(
                    { name: result.name },
                    result.tracks,
                    interaction.user,
                    result.firstTrack
                );
                return interaction.editReply({ embeds: [embed], components: buttons })
                    .then(() => setTimeout(() => {
                        interaction.editReply({ components: [] }).catch(() => {});
                    }, 60000)); // Remove buttons after 60s
            } else if (result.type === 'duplicate') {
                // Duplicate track detected - show warning with options
                const dupInfo = result.duplicateInfo;
                const locationText = dupInfo.type === 'current' 
                    ? '**currently playing**' 
                    : `already in queue at **position #${dupInfo.position}**`;
                
                const duplicateRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`dup_add_${interaction.user.id}`)
                            .setLabel('Add Anyway')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('➕'),
                        new ButtonBuilder()
                            .setCustomId(`dup_loop_${interaction.user.id}`)
                            .setLabel('Loop Current')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🔂'),
                        new ButtonBuilder()
                            .setCustomId(`dup_cancel_${interaction.user.id}`)
                            .setLabel('Cancel')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('❌')
                    );
                
                const embed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('⚠️ Duplicate Track Detected')
                    .setDescription(
                        `**${result.track.info.title}** is ${locationText}!\n\n` +
                        `💡 **Options:**\n` +
                        `• **Add Anyway** - Add it to the queue again\n` +
                        `• **Loop Current** - Enable loop for the current track\n` +
                        `• **Cancel** - Don't add the track`
                    )
                    .setFooter({ text: 'This message will expire in 30 seconds' });

                const reply = await interaction.editReply({ embeds: [embed], components: [duplicateRow] });
                
                // Store track info for button handler
                client.pendingDuplicates = client.pendingDuplicates || new Map();
                client.pendingDuplicates.set(interaction.user.id, {
                    track: result.track,
                    player: player,
                    guildId: interaction.guild.id
                });
                
                // Auto-cleanup after 30 seconds
                setTimeout(() => {
                    client.pendingDuplicates?.delete(interaction.user.id);
                    interaction.editReply({ components: [] }).catch(() => {});
                }, 30000);
                
                return;
            } else {
                const embed = MusicFormatters.createTrackNotFoundEmbed(query);
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 10000));
            }

        } catch (error) {
            console.error('Play slash command error:', error);
            ErrorHandler.handle(error, 'play slash command');
            const embed = MusicFormatters.createErrorEmbed('An error occurred while trying to play music!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
        }
    }
};
