const { EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');
const MusicFormatters = require('../../utils/formatters');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    name: 'resume',
    aliases: ['continue', 'unpause', 'start'],
    description: 'Resume the paused music',
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

            if (!conditions.isPaused) {
                const embed = MusicFormatters.createWarningEmbed('Music is not paused!');
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            }

            const player = conditions.player;
            const currentTrack = player.current;
            player.pause(false);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('<:play:1464823386780864563>  Music Resumed')
                .setTimestamp();

            if (currentTrack) {
                const sourceEmoji = MusicFormatters.getSourceEmoji(currentTrack.info.sourceName);
                embed.setDescription(`${sourceEmoji} **${currentTrack.info.title}**`);
            }

            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));

        } catch (error) {
            console.error('Resume command error:', error);
            const embed = new EmbedBuilder().setDescription('❌ An error occurred while resuming music!');
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
        }
    }
};
