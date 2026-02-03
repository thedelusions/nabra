const CentralEmbedHandler = require('./centralEmbed');

class PlayerHandler {
    constructor(client) {
        this.client = client;
        // Use singleton pattern for multi-server support
        this.centralEmbed = CentralEmbedHandler.getInstance(client);
        this.statsService = client.statsService;
        this.disconnectTimeouts = new Map(); // Track disconnect timers
        this.DISCONNECT_DELAY = 3 * 60 * 1000; // 3 minutes in milliseconds
        this.nowPlayingMessages = new Map(); // Track now playing messages to delete old ones
    }

    /**
     * Send Now Playing announcement to the voice channel's linked text chat
     */
    async sendNowPlayingAnnouncement(player, track, thumbnail) {
        try {
            const guild = this.client.guilds.cache.get(player.guildId);
            if (!guild) return;

            // Get the voice channel to find its linked text chat
            const voiceChannel = guild.channels.cache.get(player.voiceChannel);
            if (!voiceChannel) return;

            // Check if server has announcements enabled (default: false)
            const Server = require('../models/Server');
            const serverConfig = await Server.findById(player.guildId);
            if (!serverConfig?.settings?.nowPlayingAnnounce) return;

            // Get the text channel associated with the voice channel
            // Discord voice channels can have a text chat inside them
            let textChannel = null;
            
            // First try: Voice channel's own text chat (for voice channels with text)
            if (voiceChannel.type === 2) { // GuildVoice
                textChannel = voiceChannel;
            }
            
            // Fallback: Use the player's text channel
            if (!textChannel && player.textChannel) {
                textChannel = guild.channels.cache.get(player.textChannel);
            }

            if (!textChannel) return;

            const { EmbedBuilder } = require('discord.js');
            
            // Format duration
            const duration = track.info.length || 0;
            const minutes = Math.floor(duration / 60000);
            const seconds = Math.floor((duration % 60000) / 1000);
            const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            const embed = new EmbedBuilder()
                .setColor(0x9966FF)
                .setAuthor({ name: '🎵 Now Playing', iconURL: this.client.user.displayAvatarURL() })
                .setTitle(track.info.title || 'Unknown Track')
                .setURL(track.info.uri || null)
                .setDescription(`**Artist:** ${track.info.author || 'Unknown'}\n**Duration:** \`${durationStr}\``)
                .setFooter({ text: `Requested by ${track.info.requester?.username || 'Unknown'}` })
                .setTimestamp();

            if (thumbnail) {
                embed.setThumbnail(thumbnail);
            }

            // Delete previous now playing message for this guild
            const previousMsg = this.nowPlayingMessages.get(player.guildId);
            if (previousMsg) {
                previousMsg.delete().catch(() => {});
            }

            const msg = await textChannel.send({ embeds: [embed] });
            this.nowPlayingMessages.set(player.guildId, msg);

            // Auto-delete after 30 seconds
            setTimeout(() => {
                msg.delete().catch(() => {});
                if (this.nowPlayingMessages.get(player.guildId) === msg) {
                    this.nowPlayingMessages.delete(player.guildId);
                }
            }, 30000);

        } catch (error) {
            console.error('Now playing announcement error:', error.message);
        }
    }

    /**
     * Check if a track already exists in the queue or is currently playing
     * Returns the duplicate track info if found
     */
    checkDuplicate(player, track) {
        if (!player || !track || !track.info) return null;

        const trackUri = track.info.uri;
        const trackTitle = track.info.title?.toLowerCase();
        const trackIdentifier = track.info.identifier;

        // Check current track
        if (player.current) {
            const current = player.current.info;
            if (current.uri === trackUri || 
                current.identifier === trackIdentifier ||
                current.title?.toLowerCase() === trackTitle) {
                return { type: 'current', track: player.current };
            }
        }

        // Check queue
        for (let i = 0; i < player.queue.size; i++) {
            const queueTrack = player.queue[i];
            if (!queueTrack || !queueTrack.info) continue;
            
            const qInfo = queueTrack.info;
            if (qInfo.uri === trackUri || 
                qInfo.identifier === trackIdentifier ||
                qInfo.title?.toLowerCase() === trackTitle) {
                return { type: 'queue', track: queueTrack, position: i + 1 };
            }
        }

        return null;
    }

    /**
     * Process query to determine if it's a URL or needs a search prefix
     * Supports YouTube, Spotify, SoundCloud, and other platforms
     */
    processQuery(query) {
        // Trim whitespace
        query = query.trim();
        
        // If query already has a search prefix, return as-is
        if (/^(ytsearch|ytmsearch|scsearch|spsearch|amsearch|dzsearch):/i.test(query)) {
            return query;
        }

        // Check if it's a URL (including YouTube, Spotify, SoundCloud, etc.)
        const urlPatterns = [
            /^https?:\/\//i,                                    // Standard URLs
            /^www\./i,                                          // www URLs
            /youtube\.com/i,                                    // YouTube
            /youtu\.be/i,                                       // YouTube short
            /spotify\.com/i,                                    // Spotify
            /soundcloud\.com/i,                                 // SoundCloud
            /music\.apple\.com/i,                               // Apple Music
            /deezer\.com/i,                                     // Deezer
            /open\.spotify\.com/i                               // Spotify Open
        ];
        
        if (urlPatterns.some(pattern => pattern.test(query))) {
            return query; // Return URLs as-is for Lavalink to resolve
        }

        // If not a URL and no prefix, add default search prefix
        return `ytmsearch:${query}`;
    }

    async createPlayer(guildId, voiceChannelId, textChannelId, options = {}) {
        try {
            let player = this.client.riffy.players.get(guildId);
            
            if (player) {
                if (player.voiceChannel === voiceChannelId) {
                    return player;
                } else {
                    await player.setVoiceChannel(voiceChannelId);
                    return player;
                }
            }

            player = this.client.riffy.createConnection({
                guildId: guildId,
                voiceChannel: voiceChannelId,
                textChannel: textChannelId,
                deaf: true,
                ...options
            });

            return player;
        } catch (error) {
            console.error('Player creation error:', error.message);
            return null;
        }
    }

    async playSong(player, query, requester) {
        try {
            if (!player) return { type: 'error', message: 'Player not available' };

            // Smart query processing - detect if it's a URL or needs search prefix
            const processedQuery = this.processQuery(query);
            
            console.log(`🔍 Resolving query: ${processedQuery.substring(0, 100)}...`);

            const resolve = await this.client.riffy.resolve({ 
                query: processedQuery, 
                requester: requester 
            });

            const { loadType, tracks, playlistInfo } = resolve;
            
            console.log(`📊 Load type: ${loadType}, Tracks found: ${tracks?.length || 0}`);

            // Handle playlist loadType
            if (loadType === 'playlist' || loadType === 'PLAYLIST_LOADED') {
                for (const track of tracks) {
                    if (track && track.info) {
                        track.info.requester = requester;
                        player.queue.add(track);
                    }
                }

                if (!player.playing && !player.paused) {
                    await player.play();
                }

                return {
                    type: 'playlist',
                    tracks: tracks.length,
                    name: playlistInfo?.name || 'Unknown Playlist',
                    firstTrack: tracks[0] || null
                };

            } else if (loadType === 'search' || loadType === 'track' || loadType === 'TRACK_LOADED' || loadType === 'SEARCH_RESULT') {
                const track = tracks[0];
                if (!track || !track.info) {
                    console.warn('⚠️ No valid track info found');
                    return { type: 'error', message: 'No results found' };
                }

                const source = track.info.sourceName || 'unknown';
                console.log(`✅ Track loaded from ${source}: ${track.info.title}`);

                track.info.requester = requester;
                
                // Check for duplicate
                const duplicate = this.checkDuplicate(player, track);
                if (duplicate) {
                    return {
                        type: 'duplicate',
                        track: track,
                        duplicateInfo: duplicate
                    };
                }

                player.queue.add(track);

                if (!player.playing && !player.paused) {
                    await player.play();
                }

                return {
                    type: 'track',
                    track: track
                };

            } else if (loadType === 'empty' || loadType === 'NO_MATCHES') {
                console.warn('⚠️ Load type is empty - no results found');
                return { type: 'error', message: 'No results found' };
            } else if (loadType === 'error' || loadType === 'LOAD_FAILED') {
                console.error('❌ Lavalink returned error load type');
                return { type: 'error', message: 'Failed to load track' };
            } else {
                // Handle any other loadType - if we have tracks, try to use them
                if (tracks && tracks.length > 0) {
                    console.log(`⚠️ Unknown load type "${loadType}" but tracks found, attempting to play...`);
                    const track = tracks[0];
                    if (track && track.info) {
                        track.info.requester = requester;
                        
                        const duplicate = this.checkDuplicate(player, track);
                        if (duplicate) {
                            return { type: 'duplicate', track: track, duplicateInfo: duplicate };
                        }
                        
                        player.queue.add(track);
                        if (!player.playing && !player.paused) {
                            await player.play();
                        }
                        return { type: 'track', track: track };
                    }
                }
                console.warn(`⚠️ Unknown load type: ${loadType}`);
                return { type: 'error', message: 'No results found' };
            }

        } catch (error) {
            console.error('Play song error:', error.message);
            console.error('Stack:', error.stack);
            return { type: 'error', message: 'Failed to play song' };
        }
    }


    async getThumbnailSafely(track) {
        try {
            // Handle promise-based thumbnails with timeout
            if (track.info.thumbnail instanceof Promise) {
                const thumbnail = await Promise.race([
                    track.info.thumbnail,
                    new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000))
                ]);
                return typeof thumbnail === 'string' ? thumbnail : null;
            }
            
            // Return existing string thumbnail
            if (typeof track.info.thumbnail === 'string' && track.info.thumbnail.trim() !== '') {
                return track.info.thumbnail;
            }
            
            // Generate thumbnail based on source
            const source = track.info.sourceName?.toLowerCase();
            
            if (source === 'youtube' && track.info.identifier) {
                return `https://img.youtube.com/vi/${track.info.identifier}/maxresdefault.jpg`;
            }
            
            if (source === 'soundcloud' && track.info.artworkUrl) {
                return track.info.artworkUrl;
            }
            
            if (source === 'spotify' && track.info.artworkUrl) {
                return track.info.artworkUrl;
            }
            
            return null;
        } catch (error) {
            // Fallback: try to get thumbnail from track info
            try {
                if (track.info.artworkUrl) return track.info.artworkUrl;
                if (track.info.identifier && track.info.sourceName === 'youtube') {
                    return `https://img.youtube.com/vi/${track.info.identifier}/maxresdefault.jpg`;
                }
            } catch (fallbackError) {
                console.error('Thumbnail fallback error:', fallbackError.message);
            }
            return null;
        }
    }

    async getPlayerInfo(guildId) {
        try {
            const player = this.client.riffy.players.get(guildId);
            
            if (!player || !player.current || !player.current.info) {
                return null;
            }

      
            const thumbnail = await this.getThumbnailSafely(player.current);

            return {
                title: player.current.info.title || 'Unknown Title',
                author: player.current.info.author || 'Unknown Artist',
                duration: player.current.info.length || 0,
                thumbnail: thumbnail,
                requester: player.current.info.requester || null,
                playing: player.playing || false,
                paused: player.paused || false,
                position: player.position || 0,
                volume: player.volume || 50,
                loop: player.loop || 'none',
                queueLength: player.queue.size || 0
            };
        } catch (error) {
            console.error('Get player info error:', error.message);
            return null;
        }
    }

    initializeEvents() {
        this.client.riffy.on('trackStart', async (player, track) => {
            try {
                const trackTitle = track?.info?.title || 'Unknown Track';
                console.log(`🎵 Started playing: ${trackTitle} in ${player.guildId}`);
                
                // Clear disconnect timeout since a new track is playing
                if (this.disconnectTimeouts.has(player.guildId)) {
                    clearTimeout(this.disconnectTimeouts.get(player.guildId));
                    this.disconnectTimeouts.delete(player.guildId);
                    console.log(`✅ Cancelled disconnect timer for ${player.guildId}`);
                }
                
                // Update status manager with track info
                if (this.client.statusManager) {
                    await this.client.statusManager.onTrackStart(player.guildId, track, player);
                }
                
                if (track && track.info) {
                    const thumbnail = await this.getThumbnailSafely(track);
                    
                    console.log(`🎯 Calling updateCentralEmbed for guild ${player.guildId}`);
                    await this.centralEmbed.updateCentralEmbed(player.guildId, {
                        title: track.info.title || 'Unknown Title',
                        author: track.info.author || 'Unknown Artist',
                        duration: track.info.length || 0,
                        thumbnail: thumbnail,
                        requester: track.info.requester || null,
                        paused: player.paused || false,
                        volume: player.volume || 50,
                        loop: player.loop || 'none',
                        queueLength: player.queue.size || 0
                    });

                    // Send Now Playing announcement to voice channel's text chat
                    await this.sendNowPlayingAnnouncement(player, track, thumbnail);

                    if (this.statsService) {
                        await this.statsService.startSession(player, track);
                    }

                    // Oureon analytics tracking
                    if (this.client.oureon) {
                        this.client.oureon.trackPlayed(
                            player.guildId,
                            track.info.requester?.id,
                            track.info
                        );
                    }
                }
            } catch (error) {
                console.error('Track start error:', error.message);
            }
        });

        this.client.riffy.on('trackEnd', async (player, track) => {
            try {
                const trackTitle = track?.info?.title || 'Unknown Track';
                console.log(`🎵 Finished playing: ${trackTitle} in ${player.guildId}`);

                // Store the previous track for "previous" command
                if (track) {
                    player.previousTrack = track;
                }

                if (this.statsService) {
                    await this.statsService.endSession(player, track);
                }
                
                if (this.client.statusManager) {
                    await this.client.statusManager.onTrackEnd(player.guildId);
                }
            } catch (error) {
                console.error('Track end error (handled):', error.message);
            }
        });

        this.client.riffy.on('queueEnd', async (player) => {
            try {
                console.log(`🎵 Queue ended in ${player.guildId}`);
        
                await this.centralEmbed.updateCentralEmbed(player.guildId, null);
        
                const serverConfig = await require('../models/Server').findById(player.guildId);
        
                // Check if 24/7 mode is enabled
                if (serverConfig?.settings?.alwaysOn) {
                    console.log(`🔛 24/7 mode enabled - staying in voice channel`);
                    return; // Don't disconnect, stay in voice channel
                }
        
                if (serverConfig?.settings?.autoplay) {
                    player.isAutoplay = true;
                }
        
                if (player.isAutoplay) {
                    player.autoplay(player);
                } else {
                    // Set a 3-minute timeout before disconnecting
                    console.log(`⏰ Bot will disconnect in 3 minutes if no new songs are added...`);
                    
                    // Clear any existing timeout for this guild
                    if (this.disconnectTimeouts.has(player.guildId)) {
                        clearTimeout(this.disconnectTimeouts.get(player.guildId));
                    }
                    
                    // Set new timeout
                    const timeout = setTimeout(async () => {
                        try {
                            // Check if player still exists and queue is still empty
                            const currentPlayer = this.client.riffy.players.get(player.guildId);
                            if (currentPlayer && currentPlayer.queue.size === 0 && !currentPlayer.playing) {
                                // Double-check 24/7 mode hasn't been enabled during the timeout
                                const currentConfig = await require('../models/Server').findById(player.guildId);
                                if (currentConfig?.settings?.alwaysOn) {
                                    console.log(`🔛 24/7 mode was enabled - cancelling disconnect`);
                                    this.disconnectTimeouts.delete(player.guildId);
                                    return;
                                }
                                
                                console.log(`👋 Disconnecting from ${player.guildId} after 3 minutes of inactivity`);
                                
                                if (this.client.statusManager) {
                                    await this.client.statusManager.onPlayerDisconnect(player.guildId);
                                }
                                
                                currentPlayer.destroy();
                                this.disconnectTimeouts.delete(player.guildId);
                            }
                        } catch (error) {
                            console.error('Disconnect timeout error:', error.message);
                        }
                    }, this.DISCONNECT_DELAY);
                    
                    this.disconnectTimeouts.set(player.guildId, timeout);
                }
            } catch (error) {
                console.error('Queue end error:', error.message);
                try {
                    player.destroy();
                } catch (destroyError) {
                    console.error('Player destroy error:', destroyError.message);
                }
            }
        });

        this.client.riffy.on('playerCreate', async (player) => {
            try {
                console.log(`🎵 Player created for guild ${player.guildId}`);
            } catch (error) {
                console.error('Player create error:', error.message);
            }
        });

        this.client.riffy.on('playerDisconnect', async (player) => {
            try {
                console.log(`🎵 Player destroyed for guild ${player.guildId}`);
                
                if (this.client.statusManager) {
                    await this.client.statusManager.onPlayerDisconnect(player.guildId);
                }
                
                await this.centralEmbed.updateCentralEmbed(player.guildId, null);
            } catch (error) {
                console.error('Player disconnect error:', error.message);
            }
        });

        // Critical: Handle track errors (especially for SoundCloud)
        this.client.riffy.on('trackError', async (player, track, error) => {
            try {
                const trackTitle = track?.info?.title || 'Unknown Track';
                const source = track?.info?.sourceName || 'Unknown';
                const errorMsg = error.exception?.message || error.message || 'Unknown error';
                
                console.error(`❌ Track error [${source}]: ${trackTitle}`);
                console.error(`   Error: ${errorMsg}`);
                
                // Notify user about the error
                if (player.textChannel) {
                    try {
                        const { EmbedBuilder } = require('discord.js');
                        const channel = await this.client.channels.fetch(player.textChannel);
                        const embed = new EmbedBuilder()
                            .setDescription(`⚠️ Failed to play: **${trackTitle}**\n` +
                                          `Source: ${source}\n` +
                                          `${player.queue.size > 0 ? '⏭️ Playing next track...' : ''}`)
                            .setColor('#FFA500');
                        await channel.send({ embeds: [embed] })
                            .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
                    } catch (notifyError) {
                        console.error('Could not send error notification:', notifyError.message);
                    }
                }
                
                // Try to play next track instead of disconnecting
                if (player.queue.size > 0) {
                    console.log(`⏭️ Skipping failed track, playing next...`);
                    setTimeout(() => player.play(), 500);
                } else {
                    console.log(`🛑 No more tracks in queue after error`);
                }
            } catch (err) {
                console.error('Error handling track error:', err.message);
            }
        });

        // Handle stuck tracks (timeout issues)
        this.client.riffy.on('trackStuck', async (player, track, thresholdMs) => {
            try {
                const trackTitle = track?.info?.title || 'Unknown Track';
                console.warn(`⚠️ Track stuck: ${trackTitle} (${thresholdMs}ms)`);
                
                // Skip stuck track and continue
                if (player.queue.size > 0) {
                    console.log(`⏭️ Skipping stuck track, playing next...`);
                    await player.play();
                } else {
                    console.log(`🛑 No more tracks in queue after stuck track`);
                }
            } catch (error) {
                console.error('Error handling stuck track:', error.message);
            }
        });

        // Handle WebSocket errors
        this.client.riffy.on('playerException', async (player, track, exception) => {
            try {
                const trackTitle = track?.info?.title || 'Unknown Track';
                console.error(`💥 Player exception: ${trackTitle} - ${exception.message}`);
                
                // Try to continue with next track
                if (player.queue.size > 0) {
                    console.log(`⏭️ Skipping failed track, playing next...`);
                    await player.play();
                }
            } catch (error) {
                console.error('Error handling player exception:', error.message);
            }
        });

        this.client.riffy.on('nodeError', (node, error) => {
            console.error('🔴 Riffy Node Error:', error.message);
        });

        this.client.riffy.on('nodeDisconnect', (node) => {
            console.log('🟡 Riffy Node Disconnected:', node.name);
        });
    }
}

module.exports = PlayerHandler;
