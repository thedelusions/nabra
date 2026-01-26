const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play-request')
        .setDescription('Request a song (requires DJ approval if DJ mode is enabled)')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name or URL to request')
                .setRequired(true)
        ),
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

        await interaction.deferReply();

        const Server = require('../../models/Server');
        const ConditionChecker = require('../../utils/checks');
        const PlayerHandler = require('../../utils/player');
        const MusicFormatters = require('../../utils/formatters');

        const query = interaction.options.getString('query');

        try {
            const checker = new ConditionChecker(client);
            const conditions = await checker.checkMusicConditions(
                interaction.guild.id,
                interaction.user.id,
                interaction.member.voice?.channelId
            );

            // Check if user is in voice channel
            if (!conditions.userInVoice) {
                const embed = MusicFormatters.createErrorEmbed('You need to be in a voice channel to request songs!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
            }

            // Get server config
            const serverConfig = await Server.findById(interaction.guild.id);
            const allowedRoles = serverConfig?.centralSetup?.allowedRoles || [];
            const djRequestMode = serverConfig?.centralSetup?.djRequestMode;

            // Check if user has an allowed role (DJ)
            const userHasAllowedRole = allowedRoles.length === 0 || 
                allowedRoles.some(roleId => interaction.member.roles.cache.has(roleId));

            // If user is a DJ or no DJ roles are set, play directly
            if (userHasAllowedRole || !djRequestMode) {
                // Use normal play functionality
                const playerHandler = new PlayerHandler(client);
                
                let player = conditions.player;
                if (!player) {
                    player = await playerHandler.createPlayer(
                        interaction.guild.id,
                        interaction.member.voice.channelId,
                        interaction.channel.id
                    );
                }

                const result = await playerHandler.playSong(player, query, interaction.user);

                if (result.type === 'track') {
                    const embed = MusicFormatters.createTrackAddedEmbed(result.track, player, !player.playing);
                    return interaction.editReply({ embeds: [embed] })
                        .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 10000));
                } else if (result.type === 'duplicate') {
                    const embed = new EmbedBuilder()
                        .setDescription(`⚠️ **${result.track.info.title}** is already in the queue or playing!`)
                        .setColor(0xFFA500);
                    return interaction.editReply({ embeds: [embed] })
                        .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
                } else {
                    const embed = MusicFormatters.createErrorEmbed('No results found for your query!');
                    return interaction.editReply({ embeds: [embed] })
                        .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
                }
            }

            // DJ Request Mode - need approval
            // First resolve the track to show what's being requested
            const playerHandler = new PlayerHandler(client);
            const processedQuery = playerHandler.processQuery(query);
            
            const resolve = await client.riffy.resolve({
                query: processedQuery,
                requester: interaction.user
            });

            if (!resolve.tracks || resolve.tracks.length === 0) {
                const embed = MusicFormatters.createErrorEmbed('No results found for your query!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
            }

            const track = resolve.tracks[0];
            track.info.requester = interaction.user;

            // Find DJs in the same voice channel
            const voiceChannel = interaction.member.voice.channel;
            const djsInVC = voiceChannel.members.filter(member => 
                !member.user.bot && 
                allowedRoles.some(roleId => member.roles.cache.has(roleId))
            );

            if (djsInVC.size === 0) {
                const embed = new EmbedBuilder()
                    .setDescription('❌ No DJs are currently in the voice channel to approve your request!\n\n💡 Ask a DJ to join, or wait for one to be available.')
                    .setColor(0xFF0000);
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 10000));
            }

            // Create or get player
            let player = conditions.player;
            if (!player) {
                player = await playerHandler.createPlayer(
                    interaction.guild.id,
                    interaction.member.voice.channelId,
                    interaction.channel.id
                );
            }

            // Create request embed
            const duration = track.info.length || 0;
            const minutes = Math.floor(duration / 60000);
            const seconds = Math.floor((duration % 60000) / 1000);
            const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            const requestId = `${interaction.user.id}_${Date.now()}`;
            const djMentions = djsInVC.map(m => `<@${m.id}>`).join(' ');

            const requestEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🎵 Song Request')
                .setDescription(
                    `**${track.info.title}**\n\n` +
                    `**Artist:** ${track.info.author || 'Unknown'}\n` +
                    `**Duration:** \`${durationStr}\`\n` +
                    `**Requested by:** ${interaction.user}\n\n` +
                    `${djMentions}\n` +
                    `*Please approve or reject this request*`
                )
                .setThumbnail(track.info.thumbnail || null)
                .setFooter({ text: 'This request expires in 2 minutes' })
                .setTimestamp();

            const requestButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`djreq_approve_${requestId}`)
                        .setLabel('Approve')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId(`djreq_reject_${requestId}`)
                        .setLabel('Reject')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

            // Store request data
            client.pendingDJRequests = client.pendingDJRequests || new Map();
            client.pendingDJRequests.set(requestId, {
                track: track,
                requester: interaction.user,
                player: player,
                guildId: interaction.guild.id,
                allowedRoleMembers: djsInVC.map(m => m.id)
            });

            // Send to voice channel's text chat or current channel
            let targetChannel = interaction.channel;
            
            // Try to find VC's linked text channel
            if (voiceChannel.type === 2) { // GuildVoice with text
                targetChannel = voiceChannel;
            }

            await targetChannel.send({
                content: `🎵 **New Song Request** from ${interaction.user}`,
                embeds: [requestEmbed],
                components: [requestButtons]
            });

            await interaction.editReply({
                content: `✅ Your request for **${track.info.title}** has been sent to the DJs!\n\nWaiting for approval...`
            });

            // Auto-cleanup after 2 minutes
            setTimeout(() => {
                if (client.pendingDJRequests?.has(requestId)) {
                    client.pendingDJRequests.delete(requestId);
                }
            }, 2 * 60 * 1000);

            // Delete confirmation after 10 seconds
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 10000);

        } catch (error) {
            console.error('Play request command error:', error);
            const embed = MusicFormatters.createErrorEmbed('An error occurred while processing your request!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
        }
    }
};
