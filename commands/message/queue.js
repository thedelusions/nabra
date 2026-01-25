const { EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');
const MusicFormatters = require('../../utils/formatters');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    name: 'queue',
    aliases: ['q', 'list', 'playlist', 'songs'],
    description: 'Show the music queue',
    securityToken: COMMAND_SECURITY_TOKEN,
    
    async execute(message, args, client) {
        if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
            const embed = new EmbedBuilder()
                .setDescription('❌ System core offline - Command unavailable')
                .setColor('#FF0000');
            return message.reply({ embeds: [embed] }).catch(() => {});
        }

        message.shivaValidated = true;
        message.securityToken = COMMAND_SECURITY_TOKEN;

        setTimeout(() => {
            message.delete().catch(() => {});
        }, 4000);
        
        const ConditionChecker = require('../../utils/checks');
        const checker = new ConditionChecker(client);
        
        try {
            const conditions = await checker.checkMusicConditions(
                message.guild.id, 
                message.author.id, 
                message.member.voice?.channelId
            );

            if (!conditions.hasActivePlayer) {
                const embed = MusicFormatters.createErrorEmbed('No music is currently playing!');
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            }

            const player = conditions.player;
            const queue = player.queue;
            const currentTrack = player.current;
            
            if (!currentTrack && queue.size === 0) {
                const embed = MusicFormatters.createInfoEmbed('Queue is empty!', '#9B59B6');
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            }

            const page = parseInt(args[0]) || 1;
            const songsPerPage = 10;
            const startIndex = (page - 1) * songsPerPage;
            const endIndex = startIndex + songsPerPage;
            const totalPages = Math.ceil(queue.size / songsPerPage) || 1;

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('<:queue:1464823466359521331> Music Queue')
                .setTimestamp();

            // Now playing
            if (currentTrack) {
                const sourceEmoji = MusicFormatters.getSourceEmoji(currentTrack.info.sourceName);
                const duration = MusicFormatters.formatDuration(currentTrack.info.length);
                const position = MusicFormatters.formatDuration(player.position);
                const statusEmoji = MusicFormatters.getStatusEmoji(player.playing, player.paused);
                
                embed.addFields({
                    name: `${statusEmoji} Now Playing`,
                    value: `${sourceEmoji} **[${currentTrack.info.title}](${currentTrack.info.uri})**\n` +
                           `🎤 ${currentTrack.info.author} | ⏱️ ${position}/${duration}\n` +
                           `👤 Requested by <@${currentTrack.info.requester.id}>`,
                    inline: false
                });
            }

            // Queue
            if (queue.size > 0) {
                const queueTracks = Array.from(queue).slice(startIndex, endIndex);
                if (queueTracks.length > 0) {
                    const queueList = queueTracks.map((track, index) => {
                        const position = startIndex + index + 1;
                        const duration = MusicFormatters.formatDuration(track.info.length);
                        const sourceEmoji = MusicFormatters.getSourceEmoji(track.info.sourceName);
                        return `\`${position}.\` ${sourceEmoji} **${track.info.title.substring(0, 50)}${track.info.title.length > 50 ? '...' : ''}**\n    ⏱️ \`${duration}\` | 👤 <@${track.info.requester.id}>`;
                    }).join('\n\n');

                    embed.addFields({
                        name: `<:queue:1464823466359521331> Up Next (${queue.size} ${queue.size === 1 ? 'song' : 'songs'})`,
                        value: queueList,
                        inline: false
                    });
                }

                // Queue stats
                const totalDuration = Array.from(queue).reduce((acc, track) => acc + (track.info.length || 0), 0);
                const totalDurationFormatted = MusicFormatters.formatDuration(totalDuration);
                
                embed.setFooter({ 
                    text: `Page ${page}/${totalPages} | Total Duration: ${totalDurationFormatted} | Loop: ${player.loop || 'Off'}` 
                });
            } else {
                embed.setFooter({ text: 'No songs in queue' });
            }

            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 15000));

        } catch (error) {
            console.error('Queue command error:', error);
            const embed = MusicFormatters.createErrorEmbed('An error occurred while fetching the queue!');
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }
    }
};

function formatDuration(duration) {
    if (!duration) return '0:00';
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
