const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const shiva = require('../../shiva');
const MusicFormatters = require('../../utils/formatters');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

// Store active pagination collectors
const activeCollectors = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the music queue')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Queue page number')
                .setMinValue(1)
                .setRequired(false)
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

        const ConditionChecker = require('../../utils/checks');
        const checker = new ConditionChecker(client);

        try {
            const conditions = await checker.checkMusicConditions(
                interaction.guild.id,
                interaction.user.id,
                interaction.member.voice?.channelId
            );

            if (!conditions.hasActivePlayer) {
                const embed = new EmbedBuilder().setDescription('❌ No music is currently playing!').setColor('#FF0000');
                return interaction.editReply({ embeds: [embed] });
            }

            const player = conditions.player;

            if (!player.current && player.queue.size === 0) {
                const embed = new EmbedBuilder().setDescription('<:queue:1464823466359521331> Queue is empty!').setColor('#9B59B6');
                return interaction.editReply({ embeds: [embed] });
            }

            const songsPerPage = 10;
            const page = interaction.options.getInteger('page') || 1;
            
            // Create queue embed with fresh data
            const createQueueEmbed = (currentPage, currentPlayer) => {
                const pageStartIndex = (currentPage - 1) * songsPerPage;
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
                    const queueTracks = Array.from(freshQueue).slice(pageStartIndex, pageStartIndex + songsPerPage);
                    if (queueTracks.length > 0) {
                        const queueList = queueTracks.map((track, index) => {
                            const pos = pageStartIndex + index + 1;
                            const dur = MusicFormatters.formatDuration(track.info.length);
                            const srcEmoji = MusicFormatters.getSourceEmoji(track.info.sourceName);
                            return `\`${pos}.\` ${srcEmoji} **${track.info.title.substring(0, 45)}${track.info.title.length > 45 ? '...' : ''}** \`${dur}\``;
                        }).join('\n');

                        embed.addFields({
                            name: `<:queue:1464823466359521331> Up Next (${freshQueue.size} ${freshQueue.size === 1 ? 'song' : 'songs'})`,
                            value: queueList,
                            inline: false
                        });
                    }

                    const totalDuration = Array.from(freshQueue).reduce((acc, track) => acc + (track.info.length || 0), 0);
                    embed.setFooter({ 
                        text: `Page ${currentPage}/${freshTotalPages} | Total: ${MusicFormatters.formatDuration(totalDuration)} | Loop: ${currentPlayer.loop || 'Off'}` 
                    });
                } else {
                    embed.setFooter({ text: 'No songs in queue' });
                }
                
                return embed;
            };

            // Create pagination buttons
            const createPaginationButtons = (currentPage, pageTotals) => {
                return new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('slashq_first')
                            .setEmoji('<:first_page:1465502104977150093>')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === 1),
                        new ButtonBuilder()
                            .setCustomId('slashq_prev')
                            .setEmoji('<:prev_page:1465502151441645619>')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === 1),
                        new ButtonBuilder()
                            .setCustomId('slashq_page')
                            .setLabel(`${currentPage}/${pageTotals}`)
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('slashq_next')
                            .setEmoji('<:next_page:1465502170853019722>')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === pageTotals),
                        new ButtonBuilder()
                            .setCustomId('slashq_last')
                            .setEmoji('<:last_page:1465502053848715457>')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === pageTotals)
                    );
            };

            const initialTotalPages = Math.ceil(player.queue.size / songsPerPage) || 1;
            const validPage = Math.max(1, Math.min(page, initialTotalPages));
            
            const embed = createQueueEmbed(validPage, player);
            const components = initialTotalPages > 1 ? [createPaginationButtons(validPage, initialTotalPages)] : [];
            
            await interaction.editReply({ embeds: [embed], components });
            
            // Setup pagination collector if needed
            if (initialTotalPages > 1) {
                const existingCollector = activeCollectors.get(interaction.user.id);
                if (existingCollector) {
                    existingCollector.stop('new_command');
                }
                
                const message = await interaction.fetchReply();
                const collector = message.createMessageComponentCollector({
                    filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith('slashq_'),
                    time: 120000
                });
                
                activeCollectors.set(interaction.user.id, collector);
                let currentPage = validPage;
                
                collector.on('collect', async (i) => {
                    const currentConditions = await checker.checkMusicConditions(
                        interaction.guild.id,
                        interaction.user.id,
                        interaction.member.voice?.channelId
                    );
                    
                    if (!currentConditions.hasActivePlayer) {
                        await i.update({ content: '❌ Player is no longer active!', embeds: [], components: [] }).catch(() => {});
                        collector.stop();
                        return;
                    }
                    
                    const currentPlayer = currentConditions.player;
                    const currentTotalPages = Math.ceil(currentPlayer.queue.size / songsPerPage) || 1;
                    
                    switch (i.customId) {
                        case 'slashq_first': currentPage = 1; break;
                        case 'slashq_prev': currentPage = Math.max(1, currentPage - 1); break;
                        case 'slashq_next': currentPage = Math.min(currentTotalPages, currentPage + 1); break;
                        case 'slashq_last': currentPage = currentTotalPages; break;
                    }
                    
                    currentPage = Math.max(1, Math.min(currentPage, currentTotalPages));
                    
                    const newEmbed = createQueueEmbed(currentPage, currentPlayer);
                    const newComponents = currentTotalPages > 1 ? [createPaginationButtons(currentPage, currentTotalPages)] : [];
                    
                    await i.update({ embeds: [newEmbed], components: newComponents }).catch(() => {});
                });
                
                collector.on('end', async () => {
                    activeCollectors.delete(interaction.user.id);
                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId('slashq_first').setEmoji('<:first_page:1465502104977150093>').setStyle(ButtonStyle.Secondary).setDisabled(true),
                            new ButtonBuilder().setCustomId('slashq_prev').setEmoji('<:prev_page:1465502151441645619>').setStyle(ButtonStyle.Secondary).setDisabled(true),
                            new ButtonBuilder().setCustomId('slashq_page').setLabel('Expired').setStyle(ButtonStyle.Secondary).setDisabled(true),
                            new ButtonBuilder().setCustomId('slashq_next').setEmoji('<:next_page:1465502170853019722>').setStyle(ButtonStyle.Secondary).setDisabled(true),
                            new ButtonBuilder().setCustomId('slashq_last').setEmoji('<:last_page:1465502053848715457>').setStyle(ButtonStyle.Secondary).setDisabled(true)
                        );
                    await interaction.editReply({ components: [disabledRow] }).catch(() => {});
                });
            }

        } catch (error) {
            console.error('Queue command error:', error);
            const embed = new EmbedBuilder().setDescription('❌ An error occurred while fetching the queue!').setColor('#FF0000');
            return interaction.editReply({ embeds: [embed] });
        }
    }
};
