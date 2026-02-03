/**
 * Voice State Update Event Handler
 * 
 * Handles user joins/leaves from voice channels
 * Auto-disconnects bot when all users leave the voice channel
 * 
 * @fileoverview Voice state management
 * @version 1.0.0
 * @author thedelusions
 */

const Server = require('../models/Server');
const logger = require('../utils/logger');

module.exports = {
    name: 'voiceStateUpdate',
    once: false,

    /**
     * Handle voice state update events
     * @param {VoiceState} oldState - Previous voice state
     * @param {VoiceState} newState - New voice state
     */
    async execute(oldState, newState) {
        const client = oldState.client;
        
        // Get the bot's voice channel in this guild
        const player = client.riffy?.players?.get(oldState.guild.id);
        if (!player) return;

        const botVoiceChannelId = player.voiceChannel;
        if (!botVoiceChannelId) return;

        // Only care about changes in the bot's voice channel
        const isRelevantChannel = oldState.channelId === botVoiceChannelId || 
                                   newState.channelId === botVoiceChannelId;
        if (!isRelevantChannel) return;

        // Get the voice channel
        const voiceChannel = oldState.guild.channels.cache.get(botVoiceChannelId);
        if (!voiceChannel) return;

        // Count human members in the voice channel (exclude bots)
        const humanMembers = voiceChannel.members.filter(member => !member.user.bot);
        
        // If no humans left in the channel
        if (humanMembers.size === 0) {
            try {
                // Check if 24/7 mode is enabled
                const serverConfig = await Server.findById(oldState.guild.id);
                if (serverConfig?.settings?.alwaysOn) {
                    logger.info(`🔛 24/7 mode enabled for ${oldState.guild.id} - staying in voice channel`);
                    return;
                }

                logger.info(`👋 All users left voice channel in ${oldState.guild.id} - disconnecting bot`);
                
                // Clear any existing disconnect timeout
                if (client.playerHandler?.disconnectTimeouts?.has(oldState.guild.id)) {
                    clearTimeout(client.playerHandler.disconnectTimeouts.get(oldState.guild.id));
                    client.playerHandler.disconnectTimeouts.delete(oldState.guild.id);
                }

                // Update central embed to idle state
                if (client.playerHandler?.centralEmbed) {
                    await client.playerHandler.centralEmbed.updateCentralEmbed(oldState.guild.id, null);
                }

                // Destroy the player and disconnect
                player.destroy();
                
            } catch (error) {
                logger.error('Voice state update error', { error: error.message, guildId: oldState.guild.id });
            }
        }
    }
};
