const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');
const MusicFormatters = require('../../utils/formatters');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Seek to a specific position in the current track')
        .addStringOption(option =>
            option.setName('position')
                .setDescription('Time to seek to (e.g., 1:30, 90, 2:15:30)')
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
        const checker = new ConditionChecker(client);
        
        try {
            const conditions = await checker.checkMusicConditions(
                interaction.guild.id, 
                interaction.user.id, 
                interaction.member.voice?.channelId
            );

            if (!conditions.userInVoice) {
                const embed = MusicFormatters.createErrorEmbed('You need to be in a voice channel!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
            }

            if (!conditions.hasActivePlayer || !conditions.currentTrack) {
                const embed = MusicFormatters.createErrorEmbed('No music is currently playing!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
            }

            if (!conditions.sameVoiceChannel) {
                const embed = MusicFormatters.createErrorEmbed('You need to be in the same voice channel as the bot!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
            }

            const player = conditions.player;
            const track = conditions.currentTrack;
            const positionInput = interaction.options.getString('position');
            
            // Parse time input (supports: 90, 1:30, 1:30:00)
            const seekMs = parseTimeToMs(positionInput);
            
            if (seekMs === null || seekMs < 0) {
                const embed = MusicFormatters.createErrorEmbed('Invalid time format! Use: `1:30`, `90`, or `1:30:00`');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
            }

            const trackDuration = track.info.length;
            if (seekMs > trackDuration) {
                const embed = MusicFormatters.createErrorEmbed(`Cannot seek past track duration (${MusicFormatters.formatDuration(trackDuration)})`);
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
            }

            await player.seek(seekMs);

            const embed = new EmbedBuilder()
                .setDescription(`⏱️ Seeked to **${MusicFormatters.formatDuration(seekMs)}**`)
                .setColor('#2F3767');
            
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));

        } catch (error) {
            console.error('Seek slash command error:', error);
            const embed = MusicFormatters.createErrorEmbed('An error occurred while seeking!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
        }
    }
};

/**
 * Parse time string to milliseconds
 * Supports: "90" (seconds), "1:30" (min:sec), "1:30:00" (hr:min:sec)
 */
function parseTimeToMs(input) {
    if (!input) return null;
    
    const cleaned = input.trim();
    
    // Pure number = seconds
    if (/^\d+$/.test(cleaned)) {
        return parseInt(cleaned) * 1000;
    }
    
    // Time format with colons
    const parts = cleaned.split(':').map(p => parseInt(p));
    
    if (parts.some(isNaN)) return null;
    
    if (parts.length === 2) {
        // MM:SS
        const [minutes, seconds] = parts;
        return (minutes * 60 + seconds) * 1000;
    }
    
    if (parts.length === 3) {
        // HH:MM:SS
        const [hours, minutes, seconds] = parts;
        return (hours * 3600 + minutes * 60 + seconds) * 1000;
    }
    
    return null;
}
