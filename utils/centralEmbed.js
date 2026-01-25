const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const Server = require('../models/Server');
const cache = require('./cache');
const logger = require('./logger');

// Singleton instance for multi-server support
let instance = null;

class CentralEmbedHandler {
    constructor(client) {
        this.client = client;
        // Local cache fallback (also used when Redis unavailable)
        this.configCache = new Map();
        this.CACHE_TTL = 60; // 60 seconds (in seconds for Redis)
    }
    
    /**
     * Get or create the singleton instance
     * This is the ONLY way to get the CentralEmbedHandler - always use getInstance()
     * @param {Client} client - Discord client
     * @returns {CentralEmbedHandler} The singleton instance
     */
    static getInstance(client) {
        if (!instance) {
            instance = new CentralEmbedHandler(client);
            logger.info('✅ CentralEmbedHandler singleton created');
        }
        return instance;
    }
    
    /**
     * Get server config with Redis caching to reduce DB queries
     */
    async getServerConfig(guildId, forceRefresh = false) {
        const cacheKey = `server:config:${guildId}`;
        
        if (!forceRefresh) {
            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                logger.debug(`Cache hit for server config: ${guildId}`);
                return cached;
            }
        }
        
        // Fetch from database
        const serverConfig = await Server.findById(guildId);
        
        // Store in cache
        if (serverConfig) {
            await cache.set(cacheKey, serverConfig.toObject(), this.CACHE_TTL);
        }
        
        return serverConfig;
    }
    
    /**
     * Invalidate cache for a guild (call after updates)
     */
    async invalidateCache(guildId) {
        const cacheKey = `server:config:${guildId}`;
        await cache.del(cacheKey);
        this.configCache.delete(guildId);
        logger.debug(`Cache invalidated for guild: ${guildId}`);
    }


    validateThumbnail(thumbnail) {
        if (!thumbnail || typeof thumbnail !== 'string' || thumbnail.trim() === '') {
            return null;
        }
        try {
            new URL(thumbnail);
            return thumbnail;
        } catch {
            return null;
        }
    }

    async createCentralEmbed(channelId, guildId) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            
            const embed = new EmbedBuilder()
            .setAuthor({ name: 'Ultimate Music Control Center', iconURL: 'https://cdn.discordapp.com/emojis/896724352949706762.gif', url: 'https://discord.gg/v9SzcXyzrk' })
                .setDescription([
                    '',
                    '- Simply type a **song name** or **YouTube link** to start the party!',
                    '- In free version I only support **YouTube** only.',
                    '',
                    '✨ *Ready to fill this place with amazing music?*'
                ].join('\n'))
                .setColor(0x9966ff) 
                .addFields(
                    {
                        name: '🎯 Quick Examples',
                        value: [
                            '• `shape of you`',
                            '• `lofi hip hop beats`',
                            '• `https://youtu.be/dQw4w9WgXcQ`',
                            '• `imagine dragons believer`'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🚀 Features',
                        value: [
                            '• 🎵 High quality audio',
                            '• 📜 Queue management', 
                            '• 🔁 Loop & shuffle modes',
                            '• 🎛️ Volume controls',
                            '• ⚡ Lightning fast search'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '💡 Pro Tips',
                        value: [
                            '• Join voice channel first',
                            '• Use specific song names',
                            '• Try artist + song combo',
                            '• Playlists are supported!'
                        ].join('\n'),
                        inline: false
                    }
                )
                .setImage('https://i.ibb.co/DDSdKy31/ezgif-8aec7517f2146d.gif')
                .setFooter({ 
                    text: 'Nabra Music Bot • Developed By 𝖇𝖎𝖔𝖘!',
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();

            const message = await channel.send({ embeds: [embed] });
            
            // Update or create server config - handle potential duplicate key errors
            try {
                await Server.findByIdAndUpdate(guildId, {
                    _id: guildId,
                    'centralSetup.enabled': true,
                    'centralSetup.embedId': message.id,
                    'centralSetup.channelId': channelId
                }, { upsert: true, setDefaultsOnInsert: true });
            } catch (dbError) {
                // If duplicate key error, try without upsert (document exists)
                if (dbError.code === 11000) {
                    await Server.findByIdAndUpdate(guildId, {
                        'centralSetup.enabled': true,
                        'centralSetup.embedId': message.id,
                        'centralSetup.channelId': channelId
                    });
                } else {
                    throw dbError;
                }
            }

            logger.info(`✅ Central embed created in ${guildId}`);
            return message;
        } catch (error) {
            logger.error('Error creating central embed', { error: error.message, guildId });
            return null;
        }
    }

    async resetAllCentralEmbedsOnStartup() {
        try {
            const servers = await Server.find({
                'centralSetup.enabled': true,
                'centralSetup.embedId': { $exists: true, $ne: null }
            });

            let resetCount = 0;
            let errorCount = 0;

            for (const serverConfig of servers) {
                try {
                    const guild = this.client.guilds.cache.get(serverConfig._id);
                    if (!guild) {
                        logger.warn(`⚠️ Bot no longer in guild ${serverConfig._id}, cleaning up database...`);
                        await Server.findByIdAndUpdate(serverConfig._id, {
                            'centralSetup.enabled': false,
                            'centralSetup.embedId': null
                        });
                        continue;
                    }

                    const channel = await this.client.channels.fetch(serverConfig.centralSetup.channelId).catch(() => null);
                    if (!channel) {
                        logger.warn(`⚠️ Central channel not found in ${guild.name}, cleaning up...`);
                        await Server.findByIdAndUpdate(serverConfig._id, {
                            'centralSetup.enabled': false,
                            'centralSetup.embedId': null
                        });
                        continue;
                    }

                    const botMember = guild.members.me;
                    if (!channel.permissionsFor(botMember).has(['SendMessages', 'EmbedLinks'])) {
                        logger.warn(`⚠️ Missing permissions in ${guild.name}, skipping...`);
                        continue;
                    }

                    const message = await channel.messages.fetch(serverConfig.centralSetup.embedId).catch(() => null);
                    if (!message) {
                        logger.warn(`⚠️ Central embed not found in ${guild.name}, creating new one...`);
                        const newMessage = await this.createCentralEmbed(channel.id, guild.id);
                        if (newMessage) {
                            resetCount++;
                        }
                        continue;
                    }

                    await this.updateCentralEmbed(serverConfig._id, null);
                    resetCount++;

                    await new Promise(resolve => setTimeout(resolve, 100));

                } catch (error) {
                    errorCount++;
                    if (error.code === 50001 || error.code === 10003 || error.code === 50013) {
                        await Server.findByIdAndUpdate(serverConfig._id, {
                            'centralSetup.enabled': false,
                            'centralSetup.embedId': null
                        });
                    }
                }
            }

        } catch (error) {
            logger.error('Error during central embed auto-reset', { error: error.message });
        }
    }

    async updateCentralEmbed(guildId, trackInfo = null) {
        try {
            // Use cached config to reduce database queries
            const serverConfig = await this.getServerConfig(guildId);
            
            // Check if central setup is enabled and has required data
            if (!serverConfig?.centralSetup?.enabled) {
                return; // Central not enabled for this guild
            }
            
            if (!serverConfig.centralSetup.embedId || !serverConfig.centralSetup.channelId) {
                logger.debug(`Central embed missing embedId or channelId for guild ${guildId}`);
                return;
            }

            const channel = await this.client.channels.fetch(serverConfig.centralSetup.channelId).catch(() => null);
            if (!channel) {
                logger.warn(`Could not fetch central channel for guild ${guildId}`);
                return;
            }
            
            const message = await channel.messages.fetch(serverConfig.centralSetup.embedId).catch(() => null);
            if (!message) {
                logger.warn(`Could not fetch central embed message for guild ${guildId}, recreating...`);
                // Try to recreate the embed
                const newMessage = await this.createCentralEmbed(serverConfig.centralSetup.channelId, guildId);
                if (!newMessage) return;
                // Continue with the new message for update
                return this.updateCentralEmbed(guildId, trackInfo);
            }
            
            let embed, components = [];
            
            if (trackInfo) {
                const statusEmoji = trackInfo.paused ? '⏸️' : '▶️';
                const statusText = trackInfo.paused ? 'Paused' : 'Now Playing';
                const loopEmoji = this.getLoopEmoji(trackInfo.loop);
                const embedColor = trackInfo.paused ? 0xFFA500 : 0x2F3767;
                
                const validThumbnail = this.validateThumbnail(trackInfo.thumbnail);
                
                embed = new EmbedBuilder()
                    .setAuthor({ 
                        name: `${trackInfo.title}`, 
                        iconURL: 'https://cdn.discordapp.com/emojis/896724352949706762.gif',
                        url: 'https://discord.gg/v9SzcXyzrk' 
                    })
                    .setDescription([
                        `**🎤 Artist:** ${trackInfo.author}`,
                        `**👤 Requested by:** <@${trackInfo.requester.id}>`,
                        '',
                        `⏰ **Duration:** \`${this.formatDuration(trackInfo.duration)}\``,
                        `${loopEmoji} **Loop:** \`${trackInfo.loop || 'Off'}\``,
                        `🔊 **Volume:** \`${trackInfo.volume || 50}%\``,
                        '',
                        '🎶 *Enjoying the vibes? Type more song names below to keep the party going!*'
                    ].join('\n'))
                    .setColor(embedColor)
                    .setFooter({ 
                        text: `Nabra Music Bot • ${statusText} • Developed By 𝖇𝖎𝖔𝖘`,
                        iconURL: this.client.user.displayAvatarURL()
                    })
                    .setTimestamp();

                // Only set thumbnail if we have a valid URL
                if (validThumbnail) {
                    embed.setThumbnail(validThumbnail);
                }

              
                if (!trackInfo.paused) {
                    embed.setImage('https://i.ibb.co/KzbPV8jd/aaa.gif');
                }
            
                components = this.createAdvancedControlButtons(trackInfo);
            } else {
               
                embed = new EmbedBuilder()
                .setAuthor({ name: 'Ultimate Music Control Center', iconURL: 'https://cdn.discordapp.com/emojis/896724352949706762.gif', url: 'https://discord.gg/v9SzcXyzrk' })
                .setDescription([
                    '',
                    '- Simply type a **song name** or **YouTube link** to start the party!',
                    '',
                    '✨ *Ready to fill this place with amazing music?*'
                ].join('\n'))
                .setColor(0x2F3767) 
                .addFields(
                    {
                        name: '🎯 Quick Examples',
                        value: [
                            '• `Deep by Anathema`',
                            '• `lofi hip hop beats`',
                            '• `https://youtu.be/dQw4w9WgXcQ`',
                            '• `I Will Fail You`'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🚀 Features',
                        value: [
                            '• 🎵 High quality audio',
                            '• 📜 Queue management', 
                            '• 🔁 Loop & shuffle modes',
                            '• 🎛️ Volume controls',
                            '• ⚡ Lightning fast search'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '💡 Pro Tips',
                        value: [
                            '• Join voice channel first',
                            '• Use specific song names',
                            '• Try artist + song combo',
                            '• Playlists are supported!'
                        ].join('\n'),
                        inline: false
                    }
                )
                .setImage('https://i.ibb.co/DDSdKy31/ezgif-8aec7517f2146d.gif')
                .setFooter({ 
                    text: 'Nabra Music Bot • Developed By 𝖇𝖎𝖔𝖘',
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();

                components = [];
            }

            await message.edit({ embeds: [embed], components });

        } catch (error) {
            logger.error('Error updating central embed', { error: error.message, guildId });
        }
    }

    createAdvancedControlButtons(trackInfo) {
        if (!trackInfo) return [];

        // Row 1: Playback Controls
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(trackInfo.paused ? 'music_resume' : 'music_pause')
                    .setEmoji(trackInfo.paused ? '<:play:1464823386780864563>' : '<:pause:1464823417248415829>')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_previous')
                    .setEmoji('<:previous:1464824227827023891>')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setEmoji('<:next:1464824274186666139>')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_queue')
                    .setEmoji('<:queue:1464823466359521331>')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setEmoji('<:stop:1464823585146273967>')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Row 2: Track Controls
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setEmoji('<:repeat:1464823558126698602>')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_rewind')
                    .setEmoji('<:rewind:1464826397401940071>')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_forward')
                    .setEmoji('<:rewind1:1464826294494695565>')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_volume_down')
                    .setEmoji('🔉')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_volume_up')
                    .setEmoji('🔊')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Row 3: Utility Controls  
        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setEmoji('<:shuffle2:1464823491009314951>')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_clear')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_nowplaying')
                    .setEmoji('🎵')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_help')
                    .setEmoji('❓')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setEmoji('🔗')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/XxgZ9cXuqD')
            );

        return [row1, row2, row3];
    }


    getLoopEmoji(loopMode) {
        switch (loopMode) {
            case 'track': return '🔂';
            case 'queue': return '🔁';
            default: return '⏺️';
        }
    }

    formatDuration(duration) {
        if (!duration) return '0:00';
        
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

module.exports = CentralEmbedHandler;
