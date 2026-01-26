const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const Server = require('../../models/Server');
const CentralEmbedHandler = require('../../utils/centralEmbed');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-central')
        .setDescription('Setup the central music system in current channel')
        .addChannelOption(option =>
            option.setName('voice-channel')
                .setDescription('Voice channel for music (optional)')
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('allowed-role')
                .setDescription('Role allowed to use central system / DJ role (optional)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('dj-request-mode')
                .setDescription('Require DJ approval for non-DJ song requests (default: false)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('now-playing-announce')
                .setDescription('Announce "Now Playing" in voice chat (default: false)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    securityToken: COMMAND_SECURITY_TOKEN,

    async execute(interaction, client) {
        if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
            const embed = new EmbedBuilder()
                .setDescription('❌ System core offline - Command unavailable')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
        }

        interaction.shivaValidated = true;
        interaction.securityToken = COMMAND_SECURITY_TOKEN;

        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guild.id;
        const channelId = interaction.channel.id;
        const voiceChannel = interaction.options.getChannel('voice-channel');
        const allowedRole = interaction.options.getRole('allowed-role');
        const djRequestMode = interaction.options.getBoolean('dj-request-mode') || false;
        const nowPlayingAnnounce = interaction.options.getBoolean('now-playing-announce') || false;

        try {
            let serverConfig = await Server.findById(guildId);
            const isUpdate = serverConfig?.centralSetup?.enabled;
            
            const botMember = interaction.guild.members.me;
            const channel = interaction.channel;
            
            // Only check permissions if setting up new or changing channel
            if (!isUpdate || serverConfig.centralSetup.channelId !== channelId) {
                if (!channel.permissionsFor(botMember).has(['SendMessages', 'EmbedLinks', 'ManageMessages'])) {
                    return interaction.editReply({
                        content: '❌ I need `Send Messages`, `Embed Links`, and `Manage Messages` permissions in this channel!',
                        ephemeral: true
                    });
                }
            }

            // Use singleton pattern for multi-server support
            const centralHandler = CentralEmbedHandler.getInstance(client);
            
            let embedMessage;
            let finalChannelId = channelId;
            
            if (isUpdate) {
                // If updating, keep existing embed unless channel changed
                if (serverConfig.centralSetup.channelId !== channelId) {
                    // Channel changed - create new embed in new channel
                    embedMessage = await centralHandler.createCentralEmbed(channelId, guildId);
                    if (!embedMessage) {
                        return interaction.editReply({
                            content: '❌ Failed to create central embed in new channel!',
                            ephemeral: true
                        });
                    }
                } else {
                    // Same channel - keep existing embed
                    finalChannelId = serverConfig.centralSetup.channelId;
                }
            } else {
                // New setup - create embed
                embedMessage = await centralHandler.createCentralEmbed(channelId, guildId);
                if (!embedMessage) {
                    return interaction.editReply({
                        content: '❌ Failed to create central embed!',
                        ephemeral: true
                    });
                }
            }

            // Build update data - preserve existing values if not provided
            const updateData = {
                'centralSetup.enabled': true,
                'centralSetup.deleteMessages': true,
            };
            
            // Only update these if we created a new embed
            if (embedMessage) {
                updateData['centralSetup.channelId'] = channelId;
                updateData['centralSetup.embedId'] = embedMessage.id;
            }
            
            // Update voice channel if provided, or keep existing
            if (voiceChannel !== null) {
                updateData['centralSetup.vcChannelId'] = voiceChannel?.id || null;
            }
            
            // Update allowed role if provided, or keep existing
            if (allowedRole !== null) {
                updateData['centralSetup.allowedRoles'] = allowedRole ? [allowedRole.id] : [];
            }
            
            // Always update these boolean settings
            updateData['centralSetup.djRequestMode'] = djRequestMode;
            updateData['settings.nowPlayingAnnounce'] = nowPlayingAnnounce;

            // Handle potential duplicate key errors from stale guildId index
            try {
                await Server.findByIdAndUpdate(guildId, { $set: updateData }, { 
                    upsert: true, 
                    new: true 
                });
            } catch (dbError) {
                if (dbError.code === 11000) {
                    // Duplicate key - try update without upsert
                    await Server.findByIdAndUpdate(guildId, { $set: updateData });
                } else {
                    throw dbError;
                }
            }

            // Get updated config for display
            const updatedConfig = await Server.findById(guildId);
            const displayChannelId = updatedConfig?.centralSetup?.channelId || channelId;
            const displayVcId = updatedConfig?.centralSetup?.vcChannelId;
            const displayRoles = updatedConfig?.centralSetup?.allowedRoles || [];

            const successEmbed = new EmbedBuilder()
                .setTitle(isUpdate ? '✅ Central Music System Updated!' : '✅ Central Music System Setup Complete!')
                .setDescription(isUpdate 
                    ? `Settings have been updated for <#${displayChannelId}>`
                    : `Central music control has been setup in <#${displayChannelId}>`)
                .addFields(
                    { name: '📍 Channel', value: `<#${displayChannelId}>`, inline: true },
                    { name: '🔊 Voice Channel', value: displayVcId ? `<#${displayVcId}>` : 'Not set', inline: true },
                    { name: '👥 DJ Role', value: displayRoles.length > 0 ? `<@&${displayRoles[0]}>` : 'Everyone', inline: true },
                    { name: '🎫 DJ Request Mode', value: djRequestMode ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: '📢 Now Playing', value: nowPlayingAnnounce ? '✅ Enabled' : '❌ Disabled', inline: true }
                )
                .setColor(0x2F3767)
                .setFooter({ text: djRequestMode ? 'Non-DJs must use /play-request for approval' : 'Users can type song names to play music!' });

            await interaction.editReply({ embeds: [successEmbed] });

            // Only show usage instructions for new setups
            if (!isUpdate) {
                setTimeout(async () => {
                    try {
                        const usageEmbed = new EmbedBuilder()
                            .setTitle('🎵 Central Music System Active!')
                            .setDescription(
                                '• Type any **song name** to play music\n' +
                                '• Links (YouTube, Spotify) are supported\n' +
                                '• Other messages will be auto-deleted\n' +
                                '• Use normal commands (`!play`, `/play`) in other channels\n\n' +
                                '⚠️ This message will be automatically deleted in 10 seconds!'
                            )
                            .setColor(0x2F3767)
                            .setFooter({ text: 'Enjoy your music!' });
                
                        const msg = await channel.send({ embeds: [usageEmbed] });
                
                        // Delete after 10 seconds
                        setTimeout(() => {
                            msg.delete().catch(() => {});
                        }, 10000);
                
                    } catch (error) {
                        console.error('Error sending usage instructions:', error);
                    }
                }, 2000);
            }
            

        } catch (error) {
            console.error('Error setting up central system:', error);
            
            await interaction.editReply({
                content: '❌ An error occurred while setting up the central music system!',
                ephemeral: true
            });
        }
    }
};
