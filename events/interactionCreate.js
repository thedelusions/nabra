const { EmbedBuilder } = require('discord.js');
const shiva = require('../shiva');

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
    }
};

async function handleSecureMusicButton(interaction, client) {
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
                        content: '📜 Queue is empty',
                        ephemeral: true
                    });
                }
                
                const queueList = player.queue.map((track, index) => 
                    `\`${index + 1}.\` ${track.info.title.substring(0, 40)}${track.info.title.length > 40 ? '...' : ''}`
                ).slice(0, 10).join('\n');
                
                const moreText = player.queue.size > 10 ? `\n... and ${player.queue.size - 10} more songs` : '';
                
                await interaction.reply({
                    content: `📜 **Queue (${player.queue.size} songs)**\n${queueList}${moreText}`,
                    ephemeral: true
                });
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
                        `▶️/⏸️ Play/Pause • ⏮️ Prev • ⏭️ Next • 📜 Queue • ⏹️ Stop\n\n` +
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
