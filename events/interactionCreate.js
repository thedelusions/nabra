const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const shiva = require('../shiva');

// Store active pagination collectors for queue
const queuePaginationCollectors = new Map();

// Helper functions for music buttons
function formatTime(ms) {
    if (!ms) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function createProgressBar(percent) {
    const filled = Math.round(percent / 10);
    const empty = 10 - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            
            if (!command) {
                return interaction.reply({
                    content: 'This command is not available!',
                    ephemeral: true
                });
            }

            if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
                const embed = new EmbedBuilder()
                    .setDescription('❌ System core offline - Commands unavailable')
                    .setColor('#FF0000');
                return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
            }

            if (!command.securityToken || command.securityToken !== shiva.SECURITY_TOKEN) {
                
                const securityEmbed = new EmbedBuilder()
                    .setDescription('❌ Command blocked - Security validation required')
                    .setColor('#FF6600');
                
                return interaction.reply({ embeds: [securityEmbed], ephemeral: true }).catch(() => {});
            }

            try {
                await command.execute(interaction, client);

                if (!interaction.shivaValidated || !interaction.securityToken || interaction.securityToken !== shiva.SECURITY_TOKEN) {
                  
                    const warningEmbed = new EmbedBuilder()
                        .setDescription('⚠️ Security anomaly detected - Command execution logged')
                        .setColor('#FF6600');
                    
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ embeds: [warningEmbed], ephemeral: true }).catch(() => {});
                    }
                    return;
                }

              

            } catch (error) {
                console.error('Error executing slash command:', error);
                
                if (error.message.includes('shiva') || error.message.includes('validateCore')) {
                    const securityEmbed = new EmbedBuilder()
                        .setDescription('❌ System security modules offline - Commands unavailable')
                        .setColor('#FF0000');
                    
                    const reply = { embeds: [securityEmbed], ephemeral: true };
                    
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(reply).catch(() => {});
                    } else {
                        await interaction.reply(reply).catch(() => {});
                    }
                    return;
                }
                
                const reply = {
                    content: 'There was an error executing this command!',
                    ephemeral: true
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        }
        
        else if (interaction.isButton()) {
            await handleSecureMusicButton(interaction, client);
        }
        
        // Handle autocomplete interactions
        else if (interaction.isAutocomplete()) {
            const command = client.slashCommands.get(interaction.commandName);
            
            if (!command || !command.autocomplete) {
                return;
            }
            
            try {
                await command.autocomplete(interaction, client);
            } catch (error) {
                console.error('Autocomplete error:', error);
                await interaction.respond([]).catch(() => {});
            }
        }
    }
};

async function handleSecureMusicButton(interaction, client) {
    // Handle changelog approval buttons (owner only, works in DMs)
    if (interaction.customId.startsWith('changelog_')) {
        return handleChangelogButton(interaction, client);
    }
    
    // Handle duplicate track buttons
    if (interaction.customId.startsWith('dup_')) {
        return handleDuplicateButton(interaction, client);
    }
    
    // Handle DJ request buttons
    if (interaction.customId.startsWith('djreq_')) {
        return handleDJRequestButton(interaction, client);
    }
    
    if (interaction.customId === 'music_support') return;
    
    const ConditionChecker = require('../utils/checks');
    const checker = new ConditionChecker(client);
    
    try {
        const conditions = await checker.checkMusicConditions(
            interaction.guild.id,
            interaction.user.id,
            interaction.member.voice?.channelId,
            true 
        );

        if (!conditions.hasActivePlayer) {
            return interaction.reply({
                content: '❌ No music is currently playing!',
                ephemeral: true
            });
        }

        if (!conditions.userInVoice) {
            return interaction.reply({
                content: '❌ You need to be in a voice channel to control music!',
                ephemeral: true
            });
        }

        if (!conditions.sameVoiceChannel) {
            const botChannelName = interaction.guild.channels.cache.get(conditions.botVoiceChannel)?.name || 'Unknown';
            return interaction.reply({
                content: `❌ You need to be in **${botChannelName}** voice channel to control music!`,
                ephemeral: true
            });
        }


        const canUseMusic = await checker.canUseMusic(interaction.guild.id, interaction.user.id);
        if (!canUseMusic) {
            return interaction.reply({
                content: '❌ You need DJ permissions to control music!',
                ephemeral: true
            });
        }


        const player = conditions.player;
        const action = interaction.customId.replace('music_', '');
        const CentralEmbedHandler = require('../utils/centralEmbed');
        // Use singleton pattern for multi-server support
        const centralHandler = CentralEmbedHandler.getInstance(client);
        
        switch (action) {
            case 'previous':
                if (!player.previousTrack) {
                    return interaction.reply({
                        content: '❌ No previous song to play!',
                        ephemeral: true
                    });
                }
                
                const prevTrack = player.previousTrack;
                
                // Add current track to front of queue if playing
                if (player.current) {
                    player.queue.unshift(player.current);
                }
                
                // Play the previous track
                player.queue.unshift(prevTrack);
                player.stop();
                
                await interaction.reply({
                    content: `⏮️ Playing previous: \`${prevTrack.info?.title || 'Unknown'}\``,
                    ephemeral: true
                });
                break;
                
            case 'pause':
                player.pause(true);
                await interaction.reply({
                    content: '⏸️ Music paused',
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'resume':
                player.pause(false);
                await interaction.reply({
                    content: '▶️ Music resumed',
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'skip':
                const currentTrack = player.current?.info?.title || 'Unknown';
                player.stop();
                await interaction.reply({
                    content: `⏭️ Skipped: \`${currentTrack}\``,
                    ephemeral: true
                });
                break;
                
            case 'stop':
                player.destroy();
                await interaction.reply({
                    content: '🛑 Music stopped and disconnected',
                    ephemeral: true
                });
                break;
                
            case 'clear':
                const clearedCount = player.queue.size;
                player.queue.clear();
                await interaction.reply({
                    content: `🗑️ Cleared ${clearedCount} songs from queue`,
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'loop':
                const currentLoop = player.loop || 'none';
                let newLoop;
                
                switch (currentLoop) {
                    case 'none': newLoop = 'track'; break;
                    case 'track': newLoop = 'queue'; break;
                    case 'queue': newLoop = 'none'; break;
                    default: newLoop = 'track';
                }
                
                player.setLoop(newLoop);
                const loopEmojis = { none: '➡️', track: '🔂', queue: '🔁' };
                await interaction.reply({
                    content: `${loopEmojis[newLoop]} Loop mode: **${newLoop}**`,
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'volume_up':
                const newVolumeUp = Math.min(player.volume + 10, 100);
                player.setVolume(newVolumeUp);
                await interaction.reply({
                    content: `🔊 Volume increased to ${newVolumeUp}%`,
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'volume_down':
                const newVolumeDown = Math.max(player.volume - 10, 1);
                player.setVolume(newVolumeDown);
                await interaction.reply({
                    content: `🔉 Volume decreased to ${newVolumeDown}%`,
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'queue':
                if (player.queue.size === 0) {
                    return interaction.reply({
                        content: '<:queue:1464823466359521331> Queue is empty',
                        ephemeral: true
                    });
                }
                
                const songsPerPage = 10;
                let queueCurrentPage = 1;
                
                // Function to create queue content with fresh data
                const createQueueContent = (page, currentPlayer) => {
                    const freshQueue = currentPlayer.queue;
                    const freshTotalPages = Math.ceil(freshQueue.size / songsPerPage) || 1;
                    const startIdx = (page - 1) * songsPerPage;
                    const queueTracks = Array.from(freshQueue).slice(startIdx, startIdx + songsPerPage);
                    
                    if (queueTracks.length === 0) {
                        return `<:queue:1464823466359521331> **Queue is empty**`;
                    }
                    
                    const queueList = queueTracks.map((track, index) => 
                        `\`${startIdx + index + 1}.\` ${track.info.title.substring(0, 40)}${track.info.title.length > 40 ? '...' : ''}`
                    ).join('\n');
                    
                    return `<:queue:1464823466359521331> **Queue (${freshQueue.size} songs)**\n${queueList}\n\n📄 Page ${page}/${freshTotalPages}`;
                };
                
                // Function to create buttons with fresh data
                const createQueueButtons = (page, currentPlayer) => {
                    const freshTotalPages = Math.ceil(currentPlayer.queue.size / songsPerPage) || 1;
                    return new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('queue_page_first')
                                .setEmoji('<:first_page:1465502104977150093>')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(page === 1),
                            new ButtonBuilder()
                                .setCustomId('queue_page_prev')
                                .setEmoji('<:prev_page:1465502151441645619>')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(page === 1),
                            new ButtonBuilder()
                                .setCustomId('queue_page_info')
                                .setLabel(`${page}/${freshTotalPages}`)
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('queue_page_next')
                                .setEmoji('<:next_page:1465502170853019722>')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(page === freshTotalPages),
                            new ButtonBuilder()
                                .setCustomId('queue_page_last')
                                .setEmoji('<:last_page:1465502053848715457>')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(page === freshTotalPages)
                        );
                };
                
                const initialTotalQueuePages = Math.ceil(player.queue.size / songsPerPage);
                const queueComponents = initialTotalQueuePages > 1 ? [createQueueButtons(1, player)] : [];
                
                await interaction.reply({
                    content: createQueueContent(1, player),
                    components: queueComponents,
                    ephemeral: true
                });
                
                // Only set up collector if multiple pages
                if (initialTotalQueuePages > 1) {
                    // Clean up existing collector for this user
                    const existingCollector = queuePaginationCollectors.get(interaction.user.id);
                    if (existingCollector) {
                        existingCollector.stop('new_command');
                    }
                    
                    const queueMessage = await interaction.fetchReply();
                    const queueCollector = queueMessage.createMessageComponentCollector({
                        filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith('queue_page_'),
                        time: 120000
                    });
                    
                    queuePaginationCollectors.set(interaction.user.id, queueCollector);
                    
                    queueCollector.on('collect', async (i) => {
                        // Re-fetch fresh player data
                        const freshPlayer = client.riffy?.players?.get(interaction.guild.id);
                        if (!freshPlayer || freshPlayer.queue.size === 0) {
                            await i.update({
                                content: '<:queue:1464823466359521331> **Queue is empty**',
                                components: []
                            }).catch(() => {});
                            queueCollector.stop();
                            return;
                        }
                        
                        const freshTotalPages = Math.ceil(freshPlayer.queue.size / songsPerPage) || 1;
                        
                        switch (i.customId) {
                            case 'queue_page_first':
                                queueCurrentPage = 1;
                                break;
                            case 'queue_page_prev':
                                queueCurrentPage = Math.max(1, queueCurrentPage - 1);
                                break;
                            case 'queue_page_next':
                                queueCurrentPage = Math.min(freshTotalPages, queueCurrentPage + 1);
                                break;
                            case 'queue_page_last':
                                queueCurrentPage = freshTotalPages;
                                break;
                        }
                        
                        // Adjust page if out of bounds
                        queueCurrentPage = Math.max(1, Math.min(queueCurrentPage, freshTotalPages));
                        
                        await i.update({
                            content: createQueueContent(queueCurrentPage, freshPlayer),
                            components: freshTotalPages > 1 ? [createQueueButtons(queueCurrentPage, freshPlayer)] : []
                        }).catch(() => {});
                    });
                    
                    queueCollector.on('end', () => {
                        queuePaginationCollectors.delete(interaction.user.id);
                    });
                }
                break;
                
            case 'shuffle':
                if (player.queue.size === 0) {
                    return interaction.reply({
                        content: '❌ Queue is empty, nothing to shuffle!',
                        ephemeral: true
                    });
                }
                
                player.queue.shuffle();
                await interaction.reply({
                    content: `🔀 Shuffled ${player.queue.size} songs in queue`,
                    ephemeral: true
                });
                break;

            case 'rewind':
                // Rewind 10 seconds
                const currentPosRewind = player.position;
                const newPosRewind = Math.max(0, currentPosRewind - 10000);
                player.seek(newPosRewind);
                await interaction.reply({
                    content: `⏪ Rewound 10 seconds (${formatTime(newPosRewind)})`,
                    ephemeral: true
                });
                break;

            case 'forward':
                // Forward 10 seconds
                const currentPosForward = player.position;
                const trackDuration = player.current?.info?.length || 0;
                const newPosForward = Math.min(trackDuration - 1000, currentPosForward + 10000);
                player.seek(newPosForward);
                await interaction.reply({
                    content: `⏩ Forwarded 10 seconds (${formatTime(newPosForward)})`,
                    ephemeral: true
                });
                break;

            case 'nowplaying':
                const currentSong = player.current;
                if (!currentSong) {
                    return interaction.reply({
                        content: '❌ No song is currently playing!',
                        ephemeral: true
                    });
                }
                
                const progress = Math.round((player.position / currentSong.info.length) * 100);
                const progressBar = createProgressBar(progress);
                
                await interaction.reply({
                    content: `🎵 **Now Playing**\n\`${currentSong.info.title}\`\n${progressBar} ${formatTime(player.position)}/${formatTime(currentSong.info.length)}`,
                    ephemeral: true
                });
                break;

            case 'help':
                await interaction.reply({
                    content: `🎵 **Nabra Music Controls**\n\n` +
                        `**Row 1 - Playback**\n` +
                        `▶️/⏸️ Play/Pause • ⏮️ Prev • ⏭️ Next • <:queue:1464823466359521331> Queue • ⏹️ Stop\n\n` +
                        `**Row 2 - Track**\n` +
                        `🔁 Loop • ⏪ Rewind 10s • ⏩ Forward 10s • 🔉 Vol- • 🔊 Vol+\n\n` +
                        `**Row 3 - Utility**\n` +
                        `🔀 Shuffle • 🗑️ Clear Queue • 🎵 Now Playing • ❓ Help • 🔗 Support\n\n` +
                        `Use \`/help\` for full command list!`,
                    ephemeral: true
                });
                break;
                
            default:
                await interaction.reply({
                    content: '❌ Unknown button action',
                    ephemeral: true
                });
        }


        async function updateCentralEmbed() {
            if (player && player.current) {
                const playerInfo = {
                    title: player.current.info.title,
                    author: player.current.info.author,
                    duration: player.current.info.length,
                    thumbnail: player.current.info.thumbnail,
                    requester: player.current.info.requester,
                    paused: player.paused,
                    volume: player.volume,
                    loop: player.loop,
                    queueLength: player.queue.size
                };
                await centralHandler.updateCentralEmbed(interaction.guild.id, playerInfo);
            }
        }

    } catch (error) {
        console.error('Error handling secure music button:', error);
        await interaction.reply({
            content: '❌ An error occurred while processing your request',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Handle changelog approval/rejection buttons (owner only)
 */
async function handleChangelogButton(interaction, client) {
    const config = require('../config');
    const ChangelogService = require('../utils/changelogService');
    
    // Check if user is bot owner
    const ownerIds = config.bot?.ownerIds || [];
    if (!ownerIds.includes(interaction.user.id)) {
        return interaction.reply({
            content: '❌ Only the bot owner can manage changelog announcements.',
            ephemeral: true
        });
    }
    
    const changelogService = new ChangelogService(client);
    const [action, type, version] = interaction.customId.split('_');
    
    try {
        switch (type) {
            case 'approve':
                await interaction.deferUpdate();
                const announced = await changelogService.announceChangelog(version);
                
                if (announced) {
                    await interaction.editReply({
                        content: `✅ **Changelog v${version} announced successfully!**\n\nThe update has been posted to the announcement channel.`,
                        embeds: [],
                        components: []
                    });
                } else {
                    await interaction.editReply({
                        content: `❌ Failed to announce changelog v${version}. Check the logs for details.`,
                        embeds: interaction.message.embeds,
                        components: []
                    });
                }
                break;
                
            case 'reject':
                await interaction.deferUpdate();
                changelogService.skipChangelog(version);
                
                await interaction.editReply({
                    content: `<:last_page:1465502053848715457> **Changelog v${version} skipped.**\n\nThis update won't be announced. You can manually announce later if needed.`,
                    embeds: [],
                    components: []
                });
                break;
                
            case 'preview':
                // Send a preview to the announcement channel without marking as announced
                await interaction.deferReply({ ephemeral: true });
                
                const changelog = changelogService.loadChangelog();
                const change = changelog.changes.find(c => c.version === version);
                
                if (!change) {
                    return interaction.editReply({
                        content: `❌ Changelog v${version} not found.`
                    });
                }
                
                try {
                    const channel = await client.channels.fetch(changelog.announcementChannelId);
                    const embed = changelogService.createChangelogEmbed(change, false);
                    
                    const previewMsg = await channel.send({
                        content: '👁️ **[PREVIEW - Will be deleted in 30 seconds]**',
                        embeds: [embed]
                    });
                    
                    // Delete preview after 30 seconds
                    setTimeout(() => previewMsg.delete().catch(() => {}), 30000);
                    
                    await interaction.editReply({
                        content: `✅ Preview sent to <#${changelog.announcementChannelId}>!\n\nIt will be automatically deleted in 30 seconds.`
                    });
                } catch (error) {
                    await interaction.editReply({
                        content: `❌ Failed to send preview: ${error.message}`
                    });
                }
                break;
        }
    } catch (error) {
        console.error('Error handling changelog button:', error);
        await interaction.reply({
            content: '❌ An error occurred while processing your request.',
            ephemeral: true
        }).catch(() => {});
    }
}

/**
 * Handle duplicate track buttons (Add Anyway, Loop, Cancel)
 */
async function handleDuplicateButton(interaction, client) {
    const [prefix, action, userId] = interaction.customId.split('_');
    
    // Only the original user can interact
    if (interaction.user.id !== userId) {
        return interaction.reply({
            content: '❌ Only the person who requested this can use these buttons!',
            ephemeral: true
        });
    }
    
    const pendingData = client.pendingDuplicates?.get(userId);
    
    if (!pendingData) {
        return interaction.update({
            content: '⏰ This request has expired.',
            embeds: [],
            components: []
        });
    }
    
    const { track, player, guildId } = pendingData;
    client.pendingDuplicates.delete(userId);
    
    try {
        switch (action) {
            case 'add':
                // Add the track anyway
                player.queue.add(track);
                
                if (!player.playing && !player.paused) {
                    await player.play();
                }
                
                await interaction.update({
                    content: `✅ Added **${track.info.title}** to the queue anyway!`,
                    embeds: [],
                    components: []
                });
                break;
                
            case 'loop':
                // Enable loop for current track
                player.setLoop('track');
                
                await interaction.update({
                    content: `🔂 Enabled **track loop** for the current song!\nThe duplicate was not added.`,
                    embeds: [],
                    components: []
                });
                
                // Update central embed
                const CentralEmbedHandler = require('../utils/centralEmbed');
                const centralHandler = CentralEmbedHandler.getInstance(client);
                if (player.current) {
                    await centralHandler.updateCentralEmbed(guildId, {
                        title: player.current.info.title,
                        author: player.current.info.author,
                        duration: player.current.info.length,
                        thumbnail: player.current.info.thumbnail,
                        requester: player.current.info.requester,
                        paused: player.paused,
                        volume: player.volume,
                        loop: 'track',
                        queueLength: player.queue.size
                    });
                }
                break;
                
            case 'cancel':
                await interaction.update({
                    content: '❌ Cancelled - track was not added.',
                    embeds: [],
                    components: []
                });
                break;
        }
        
        // Auto-delete message after 5 seconds
        setTimeout(() => {
            interaction.deleteReply().catch(() => {});
        }, 5000);
        
    } catch (error) {
        console.error('Error handling duplicate button:', error);
        await interaction.update({
            content: '❌ An error occurred.',
            embeds: [],
            components: []
        }).catch(() => {});
    }
}

/**
 * Handle DJ request approve/reject buttons
 */
async function handleDJRequestButton(interaction, client) {
    const [prefix, action, requestId] = interaction.customId.split('_');
    
    const requestData = client.pendingDJRequests?.get(requestId);
    
    if (!requestData) {
        return interaction.reply({
            content: '⏰ This request has expired or was already processed.',
            ephemeral: true
        });
    }
    
    const { track, requester, player, guildId, allowedRoleMembers } = requestData;
    
    // Check if user is one of the allowed role members in the VC
    if (!allowedRoleMembers.includes(interaction.user.id)) {
        return interaction.reply({
            content: '❌ Only DJs in the voice channel can approve/reject requests!',
            ephemeral: true
        });
    }
    
    client.pendingDJRequests.delete(requestId);
    
    try {
        if (action === 'approve') {
            // Add the track to queue
            player.queue.add(track);
            
            if (!player.playing && !player.paused) {
                await player.play();
            }
            
            await interaction.update({
                content: `✅ **Request Approved** by ${interaction.user}\n\n🎵 **${track.info.title}** requested by <@${requester.id}> has been added to the queue!`,
                embeds: [],
                components: []
            });
            
            // Notify requester
            try {
                const requesterUser = await client.users.fetch(requester.id);
                await requesterUser.send({
                    content: `✅ Your song request **${track.info.title}** was approved and added to the queue!`
                }).catch(() => {});
            } catch (e) {}
            
        } else if (action === 'reject') {
            await interaction.update({
                content: `❌ **Request Rejected** by ${interaction.user}\n\n🎵 **${track.info.title}** requested by <@${requester.id}> was not added.`,
                embeds: [],
                components: []
            });
            
            // Notify requester
            try {
                const requesterUser = await client.users.fetch(requester.id);
                await requesterUser.send({
                    content: `❌ Your song request **${track.info.title}** was rejected by the DJ.`
                }).catch(() => {});
            } catch (e) {}
        }
        
    } catch (error) {
        console.error('Error handling DJ request button:', error);
        await interaction.reply({
            content: '❌ An error occurred while processing the request.',
            ephemeral: true
        }).catch(() => {});
    }
}
