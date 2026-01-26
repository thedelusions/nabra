const { EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    name: 'remove',
    aliases: ['rm', 'delete', 'del'],
    description: 'Remove a song from queue by position or search',
    usage: 'n!remove <position> OR n!remove <track name>',
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
        
        if (!args.length) {
            const embed = new EmbedBuilder().setDescription('❌ Please provide a position number or search term!\nExample: `n!remove 3` or `n!remove never gonna`');
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }

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

            const player = conditions.player;
            const input = args.join(' ');
            const position = parseInt(input);
            
            let removedTrack;
            let removedPosition;
            
            // Check if input is a number (position) or search query
            if (!isNaN(position) && position >= 1 && args.length === 1) {
                // Remove by position
                if (position > conditions.queueLength) {
                    const embed = new EmbedBuilder().setDescription(`❌ Invalid position! Queue has only ${conditions.queueLength} songs.`);
                    return message.reply({ embeds: [embed] })
                        .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
                }
                
                removedPosition = position;
                removedTrack = player.queue.remove(position - 1);
            } else {
                // Search for track by name (case-insensitive partial match)
                const queueArray = Array.from(player.queue);
                const searchLower = input.toLowerCase();
                
                // Find all matching tracks
                const matches = queueArray
                    .map((track, index) => ({ track, index }))
                    .filter(({ track }) => 
                        track.info.title.toLowerCase().includes(searchLower) ||
                        track.info.author.toLowerCase().includes(searchLower)
                    );
                
                if (matches.length === 0) {
                    const embed = new EmbedBuilder().setDescription(`❌ No tracks found matching: **${input}**`);
                    return message.reply({ embeds: [embed] })
                        .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
                }
                
                if (matches.length > 1) {
                    // Show all matches and let user know to be more specific
                    const matchList = matches.slice(0, 10).map(({ track, index }) => 
                        `\`${index + 1}.\` **${track.info.title.substring(0, 50)}${track.info.title.length > 50 ? '...' : ''}**`
                    ).join('\n');
                    
                    const moreText = matches.length > 10 ? `\n... and ${matches.length - 10} more` : '';
                    
                    const embed = new EmbedBuilder()
                        .setDescription(`🔍 Found ${matches.length} matching tracks:\n\n${matchList}${moreText}\n\n💡 **Tip:** Use \`n!remove <position>\` to remove a specific track.`)
                        .setColor('#FFA500');
                    return message.reply({ embeds: [embed] })
                        .then(m => setTimeout(() => m.delete().catch(() => {}), 10000));
                }
                
                // Single match - remove it
                removedPosition = matches[0].index + 1;
                removedTrack = player.queue.remove(matches[0].index);
            }

            const embed = new EmbedBuilder().setDescription(`🗑️ Removed #${removedPosition}: **${removedTrack.info.title}**`);
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));

        } catch (error) {
            console.error('Remove command error:', error);
            const embed = new EmbedBuilder().setDescription('❌ An error occurred while removing the song!');
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
        }
    }
};
