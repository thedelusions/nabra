const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    name: 'play-request',
    aliases: ['pr', 'request', 'songrequest', 'sr'],
    description: 'Request a song (requires DJ approval if DJ mode is enabled)',
    usage: 'n!pr <song name or URL>',
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
        }, 3000);

        if (!args.length) {
            const embed = new EmbedBuilder()
                .setDescription('❌ Please provide a song name or URL!\nExample: `n!pr never gonna give you up`')
                .setColor(0xFF0000);
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }

        const Server = require('../../models/Server');
        const ConditionChecker = require('../../utils/checks');
        const PlayerHandler = require('../../utils/player');
        const MusicFormatters = require('../../utils/formatters');

        const query = args.join(' ');

        try {
            const checker = new ConditionChecker(client);
            const conditions = await checker.checkMusicConditions(
                message.guild.id,
                message.author.id,
                message.member.voice?.channelId
            );

            // Check if user is in voice channel
            if (!conditions.userInVoice) {
                const embed = MusicFormatters.createErrorEmbed('You need to be in a voice channel to request songs!');
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            }

            // Get server config
            const serverConfig = await Server.findById(message.guild.id);
            const allowedRoles = serverConfig?.centralSetup?.allowedRoles || [];
            const djRequestMode = serverConfig?.centralSetup?.djRequestMode;

            // Check if user has an allowed role (DJ)
            const userHasAllowedRole = allowedRoles.length === 0 || 
                allowedRoles.some(roleId => message.member.roles.cache.has(roleId));

            // If user is a DJ or no DJ roles are set, play directly
            if (userHasAllowedRole || !djRequestMode) {
                const playerHandler = new PlayerHandler(client);
                
                let player = conditions.player;
                if (!player) {
                    player = await playerHandler.createPlayer(
                        message.guild.id,
                        message.member.voice.channelId,
                        message.channel.id
                    );
                }

                const result = await playerHandler.playSong(player, query, message.author);

                if (result.type === 'track') {
                    const embed = MusicFormatters.createTrackAddedEmbed(result.track, player, !player.playing);
                    return message.reply({ embeds: [embed] })
                        .then(m => setTimeout(() => m.delete().catch(() => {}), 10000));
                } else if (result.type === 'duplicate') {
                    const embed = new EmbedBuilder()
                        .setDescription(`⚠️ **${result.track.info.title}** is already in the queue or playing!`)
                        .setColor(0xFFA500);
                    return message.reply({ embeds: [embed] })
                        .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
                } else {
                    const embed = MusicFormatters.createErrorEmbed('No results found for your query!');
                    return message.reply({ embeds: [embed] })
                        .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
                }
            }

            // DJ Request Mode - need approval
            const playerHandler = new PlayerHandler(client);
            const processedQuery = playerHandler.processQuery(query);
            
            const resolve = await client.riffy.resolve({
                query: processedQuery,
                requester: message.author
            });

            if (!resolve.tracks || resolve.tracks.length === 0) {
                const embed = MusicFormatters.createErrorEmbed('No results found for your query!');
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            }

            const track = resolve.tracks[0];
            track.info.requester = message.author;

            // Find DJs in the same voice channel
            const voiceChannel = message.member.voice.channel;
            const djsInVC = voiceChannel.members.filter(member => 
                !member.user.bot && 
                allowedRoles.some(roleId => member.roles.cache.has(roleId))
            );

            if (djsInVC.size === 0) {
                const embed = new EmbedBuilder()
                    .setDescription('❌ No DJs are currently in the voice channel to approve your request!\n\n💡 Ask a DJ to join, or wait for one to be available.')
                    .setColor(0xFF0000);
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 10000));
            }

            // Create or get player
            let player = conditions.player;
            if (!player) {
                player = await playerHandler.createPlayer(
                    message.guild.id,
                    message.member.voice.channelId,
                    message.channel.id
                );
            }

            // Create request embed
            const duration = track.info.length || 0;
            const minutes = Math.floor(duration / 60000);
            const seconds = Math.floor((duration % 60000) / 1000);
            const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            const requestId = `${message.author.id}_${Date.now()}`;
            const djMentions = djsInVC.map(m => `<@${m.id}>`).join(' ');

            const requestEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🎵 Song Request')
                .setDescription(
                    `**${track.info.title}**\n\n` +
                    `**Artist:** ${track.info.author || 'Unknown'}\n` +
                    `**Duration:** \`${durationStr}\`\n` +
                    `**Requested by:** ${message.author}\n\n` +
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
                requester: message.author,
                player: player,
                guildId: message.guild.id,
                allowedRoleMembers: djsInVC.map(m => m.id)
            });

            // Send to voice channel's text chat or current channel
            let targetChannel = message.channel;
            
            if (voiceChannel.type === 2) {
                targetChannel = voiceChannel;
            }

            await targetChannel.send({
                content: `🎵 **New Song Request** from ${message.author}`,
                embeds: [requestEmbed],
                components: [requestButtons]
            });

            const confirmMsg = await message.reply({
                content: `✅ Your request for **${track.info.title}** has been sent to the DJs!\n\nWaiting for approval...`
            });

            // Auto-cleanup
            setTimeout(() => {
                if (client.pendingDJRequests?.has(requestId)) {
                    client.pendingDJRequests.delete(requestId);
                }
            }, 2 * 60 * 1000);

            setTimeout(() => {
                confirmMsg.delete().catch(() => {});
            }, 10000);

        } catch (error) {
            console.error('Play request command error:', error);
            const embed = MusicFormatters.createErrorEmbed('An error occurred while processing your request!');
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }
    }
};
