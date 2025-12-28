const { EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');


const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    name: 'clear',
    aliases: ['empty', 'clean', 'clearqueue'],
    description: 'Clear all songs from queue or from a specific position',
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

            if (!conditions.hasActivePlayer || conditions.queueLength === 0) {
                const embed = new EmbedBuilder().setDescription('❌ Queue is empty!');
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
            }

            if (!conditions.sameVoiceChannel) {
                const embed = new EmbedBuilder().setDescription('❌ You need to be in the same voice channel as the bot!');
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
            }

            const player = conditions.player;
            const fromPosition = parseInt(args[0]);
            
            // If a position is provided, clear from that position onwards
            if (fromPosition && !isNaN(fromPosition) && fromPosition > 0) {
                const queueSize = player.queue.size;
                
                if (fromPosition > queueSize) {
                    const embed = new EmbedBuilder().setDescription(`❌ Invalid position! Queue has only **${queueSize}** tracks.`);
                    return message.reply({ embeds: [embed] })
                        .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
                }
                
                // Get all tracks and keep only the ones before the position
                const tracks = [...player.queue];
                const keepTracks = tracks.slice(0, fromPosition - 1);
                const clearedCount = tracks.length - keepTracks.length;
                
                // Rebuild queue with kept tracks
                player.queue.clear();
                keepTracks.forEach(track => player.queue.add(track));
                
                const embed = new EmbedBuilder().setDescription(`🗑️ Cleared **${clearedCount}** tracks from position **#${fromPosition}** onwards!`);
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
            }
            
            // Otherwise clear the entire queue
            const clearedCount = player.queue.size;
            player.queue.clear();

            const embed = new EmbedBuilder().setDescription(`🗑️ Cleared **${clearedCount}** songs from queue!`);
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));

        } catch (error) {
            console.error('Clear command error:', error);
            const embed = new EmbedBuilder().setDescription('❌ An error occurred while clearing queue!');
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
        }
    }
};
