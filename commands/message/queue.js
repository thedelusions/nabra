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

            // Create the embed for the current page - takes player for fresh data
            const createQueueEmbed = (currentPage, currentPlayer) => {
                const pageStartIndex = (currentPage - 1) * songsPerPage;
                const pageEndIndex = pageStartIndex + songsPerPage;
                const freshQueue = currentPlayer.queue;
                const freshCurrentTrack = currentPlayer.current;
                const freshTotalPages = Math.ceil(freshQueue.size / songsPerPage) || 1;
                
                const embed = new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle('<:queue:1464823466359521331> Music Queue')
                    .setTimestamp();

                // Now playing
                if (freshCurrentTrack) {
                    const sourceEmoji = MusicFormatters.getSourceEmoji(freshCurrentTrack.info.sourceName);
                    const duration = MusicFormatters.formatDuration(freshCurrentTrack.info.length);
                    const position = MusicFormatters.formatDuration(currentPlayer.position);
                    const statusEmoji = MusicFormatters.getStatusEmoji(currentPlayer.playing, currentPlayer.paused);
                    
                    embed.addFields({
                        name: `${statusEmoji} Now Playing`,
                        value: `${sourceEmoji} **[${freshCurrentTrack.info.title}](${freshCurrentTrack.info.uri})**\n` +
                               `🎤 ${freshCurrentTrack.info.author} | ⏱️ ${position}/${duration}\n` +
                               `👤 Requested by <@${freshCurrentTrack.info.requester.id}>`,
                        inline: false
                    });
                }

                // Queue
                if (freshQueue.size > 0) {
                    const queueTracks = Array.from(freshQueue).slice(pageStartIndex, pageEndIndex);
                    if (queueTracks.length > 0) {
                        const queueList = queueTracks.map((track, index) => {
                            const pos = pageStartIndex + index + 1;
                            const dur = MusicFormatters.formatDuration(track.info.length);
                            const srcEmoji = MusicFormatters.getSourceEmoji(track.info.sourceName);
                            return `\`${pos}.\` ${srcEmoji} **${track.info.title.substring(0, 50)}${track.info.title.length > 50 ? '...' : ''}**\n    ⏱️ \`${dur}\` | 👤 <@${track.info.requester.id}>`;
                        }).join('\n\n');

                        embed.addFields({
                            name: `<:queue:1464823466359521331> Up Next (${freshQueue.size} ${freshQueue.size === 1 ? 'song' : 'songs'})`,
                            value: queueList,
                            inline: false
                        });
                    }

                    // Queue stats
                    const totalDuration = Array.from(freshQueue).reduce((acc, track) => acc + (track.info.length || 0), 0);
                    const totalDurationFormatted = MusicFormatters.formatDuration(totalDuration);
                    
                    embed.setFooter({ 
                        text: `Page ${currentPage}/${freshTotalPages} | Total Duration: ${totalDurationFormatted} | Loop: ${currentPlayer.loop || 'Off'}` 
                    });
                } else {
                    embed.setFooter({ text: 'No songs in queue' });
                }
                
                return embed;
            };

            // Create pagination buttons - takes totalPages for fresh calculation
            const createPaginationButtons = (currentPage, pageTotals) => {
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('queue_first')
                            .setEmoji('<:first_page:1465502104977150093>')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === 1),
                        new ButtonBuilder()
                            .setCustomId('queue_prev')
                            .setEmoji('<:prev_page:1465502151441645619>')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === 1),
                        new ButtonBuilder()
                            .setCustomId('queue_page')
                            .setLabel(`${currentPage}/${pageTotals}`)
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('queue_next')
                            .setEmoji('<:next_page:1465502170853019722>')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === pageTotals),
                        new ButtonBuilder()
                            .setCustomId('queue_last')
                            .setEmoji('<:last_page:1465502053848715457>')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === pageTotals)
                    );
                return [row];
            };

            const embed = createQueueEmbed(validPage, player);
            const initialTotalPages = Math.ceil(player.queue.size / songsPerPage) || 1;
            const components = initialTotalPages > 1 ? createPaginationButtons(validPage, initialTotalPages) : [];
            
            const reply = await message.reply({ embeds: [embed], components });
            
            // Only set up collector if there are multiple pages
            if (initialTotalPages > 1) {
                // Clean up any existing collector for this user
                const existingCollector = activeCollectors.get(message.author.id);
                if (existingCollector) {
                    existingCollector.stop('new_command');
                }
                
                const collector = reply.createMessageComponentCollector({
                    filter: (i) => i.user.id === message.author.id,
                    time: 120000 // 2 minutes
                });
                
                activeCollectors.set(message.author.id, collector);
                
                let currentPage = validPage;
                
                collector.on('collect', async (i) => {
                    // Re-fetch current player state for fresh queue data
                    const currentConditions = await checker.checkMusicConditions(
                        message.guild.id, 
                        message.author.id, 
                        message.member.voice?.channelId
                    );
                    
                    if (!currentConditions.hasActivePlayer) {
                        await i.update({ content: '❌ Player is no longer active!', embeds: [], components: [] }).catch(() => {});
                        collector.stop();
                        return;
                    }
                    
                    const currentPlayer = currentConditions.player;
                    const currentTotalPages = Math.ceil(currentPlayer.queue.size / songsPerPage) || 1;
                    
                    switch (i.customId) {
                        case 'queue_first':
                            currentPage = 1;
                            break;
                        case 'queue_prev':
                            currentPage = Math.max(1, currentPage - 1);
                            break;
                        case 'queue_next':
                            currentPage = Math.min(currentTotalPages, currentPage + 1);
                            break;
                        case 'queue_last':
                            currentPage = currentTotalPages;
                            break;
                    }
                    
                    // Adjust page if it's now out of bounds (songs were removed)
                    currentPage = Math.max(1, Math.min(currentPage, currentTotalPages));
                    
                    const newEmbed = createQueueEmbed(currentPage, currentPlayer);
                    const newComponents = currentTotalPages > 1 ? createPaginationButtons(currentPage, currentTotalPages) : [];
                    
                    await i.update({ embeds: [newEmbed], components: newComponents }).catch(() => {});
                });
                
                collector.on('end', async () => {
                    activeCollectors.delete(message.author.id);
                    // Just disable buttons, don't delete
                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('queue_first')
                                .setEmoji('<:first_page:1465502104977150093>')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('queue_prev')
                                .setEmoji('<:prev_page:1465502151441645619>')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('queue_page')
                                .setLabel('Expired')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('queue_next')
                                .setEmoji('<:next_page:1465502170853019722>')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('queue_last')
                                .setEmoji('<:last_page:1465502053848715457>')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(true)
                        );
                    await reply.edit({ components: [disabledRow] }).catch(() => {});
                });
            } else {
                // No pagination needed - keep message permanently
            }

        } catch (error) {
            console.error('Queue command error:', error);
            const embed = MusicFormatters.createErrorEmbed('An error occurred while fetching the queue!');
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }
    }
};
