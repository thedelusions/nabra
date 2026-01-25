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
                    .setEmoji('<:Nabra_previous:1464937706613117056>')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_pause')
                    .setEmoji('<:Nabra_pause:1464937750858825993>')
                    .setStyle(ButtonStyle.Secondary),
    
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setEmoji('<:Nabra_next:1464937677664030832>')
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
                    .setEmoji('<:Nabra_stop:1464937648547299442>')
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
            } else {
                const embed = MusicFormatters.createErrorEmbed('No results found for your query!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
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
