const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const shiva = require('../../shiva');
const MusicFormatters = require('../../utils/formatters');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

// Store active pagination collectors to clean up
const activeCollectors = new Map();

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
            const totalPages = Math.ceil(queue.size / songsPerPage) || 1;
            
            // Validate page number
            const validPage = Math.max(1, Math.min(page, totalPages));
            const startIndex = (validPage - 1) * songsPerPage;
            const endIndex = startIndex + songsPerPage;

            // Create the embed for the current page
            const createQueueEmbed = (currentPage) => {
                const pageStartIndex = (currentPage - 1) * songsPerPage;
                const pageEndIndex = pageStartIndex + songsPerPage;
                
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
                    const queueTracks = Array.from(queue).slice(pageStartIndex, pageEndIndex);
                    if (queueTracks.length > 0) {
                        const queueList = queueTracks.map((track, index) => {
                            const position = pageStartIndex + index + 1;
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
                        text: `Page ${currentPage}/${totalPages} | Total Duration: ${totalDurationFormatted} | Loop: ${player.loop || 'Off'}` 
                    });
                } else {
                    embed.setFooter({ text: 'No songs in queue' });
                }
                
                return embed;
            };

            // Create pagination buttons
            const createPaginationButtons = (currentPage) => {
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('queue_first')
                            .setEmoji('<:music_previous:1464824274186666139>')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === 1),
                        new ButtonBuilder()
                            .setCustomId('queue_prev')
                            .setEmoji('<:rewind:1464826397401940071>')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === 1),
                        new ButtonBuilder()
                            .setCustomId('queue_page')
                            .setLabel(`${currentPage}/${totalPages}`)
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('queue_next')
                            .setEmoji('<:rewind1:1464826294494695565>')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === totalPages),
                        new ButtonBuilder()
                            .setCustomId('queue_last')
                            .setEmoji('<:next:1464824274186666139>')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === totalPages)
                    );
                return [row];
            };

            const embed = createQueueEmbed(validPage);
            const components = totalPages > 1 ? createPaginationButtons(validPage) : [];
            
            const reply = await message.reply({ embeds: [embed], components });
            
            // Only set up collector if there are multiple pages
            if (totalPages > 1) {
                // Clean up any existing collector for this user
                const existingCollector = activeCollectors.get(message.author.id);
                if (existingCollector) {
                    existingCollector.stop('new_command');
                }
                
                const collector = reply.createMessageComponentCollector({
                    filter: (i) => i.user.id === message.author.id,
                    time: 60000 // 60 seconds
                });
                
                activeCollectors.set(message.author.id, collector);
                
                let currentPage = validPage;
                
                collector.on('collect', async (i) => {
                    switch (i.customId) {
                        case 'queue_first':
                            currentPage = 1;
                            break;
                        case 'queue_prev':
                            currentPage = Math.max(1, currentPage - 1);
                            break;
                        case 'queue_next':
                            currentPage = Math.min(totalPages, currentPage + 1);
                            break;
                        case 'queue_last':
                            currentPage = totalPages;
                            break;
                    }
                    
                    const newEmbed = createQueueEmbed(currentPage);
                    const newComponents = createPaginationButtons(currentPage);
                    
                    await i.update({ embeds: [newEmbed], components: newComponents }).catch(() => {});
                });
                
                collector.on('end', async () => {
                    activeCollectors.delete(message.author.id);
                    // Disable all buttons when collector ends
                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('queue_first')
                                .setEmoji('<:music_previous:1464824274186666139>')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('queue_prev')
                                .setEmoji('<:rewind:1464826397401940071>')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('queue_page')
                                .setLabel(`${currentPage}/${totalPages}`)
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('queue_next')
                                .setEmoji('<:rewind1:1464826294494695565>')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('queue_last')
                                .setEmoji('<:next:1464824274186666139>')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true)
                        );
                    await reply.edit({ components: [disabledRow] }).catch(() => {});
                    setTimeout(() => reply.delete().catch(() => {}), 5000);
                });
            } else {
                // Auto-delete after 15 seconds if no pagination needed
                setTimeout(() => reply.delete().catch(() => {}), 15000);
            }

        } catch (error) {
            console.error('Queue command error:', error);
            const embed = MusicFormatters.createErrorEmbed('An error occurred while fetching the queue!');
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }
    }
};
