const { EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');
const MusicFormatters = require('../../utils/formatters');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    name: 'skip',
    aliases: ['s', 'next', 'fs', 'forceskip'],
    description: 'Skip the current song',
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

            const errorMsg = checker.getErrorMessage(conditions, 'skip');
            if (errorMsg) {
                const embed = MusicFormatters.createErrorEmbed(errorMsg);
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            }

            const player = conditions.player;
            const currentTrack = player.current;
            const trackTitle = currentTrack?.info?.title || 'Unknown';
            const nextTrack = player.queue[0];

            player.stop();

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('<:next:1464824274186666139> Skipped')
                .setDescription(`**${trackTitle}**`)
                .setTimestamp();

            if (nextTrack) {
                const sourceEmoji = MusicFormatters.getSourceEmoji(nextTrack.info.sourceName);
                embed.addFields({
                    name: '<:play:1464823386780864563>  Up Next',
                    value: `${sourceEmoji} ${nextTrack.info.title}`,
                    inline: false
                });
            }

            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));

        } catch (error) {
            console.error('Skip command error:', error);
            const embed = MusicFormatters.createErrorEmbed('An error occurred while skipping the song!');
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }
    }
};
