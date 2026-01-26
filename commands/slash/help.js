const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands and features'),
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

        try {
            const prefix = process.env.BOT_PREFIX || 'n!';
            
            const embed = new EmbedBuilder()
                .setTitle('🎵 Nabra Music Bot - Command Guide')
                .setColor('#2F3767')
                .setDescription(`**Welcome to Nabra Music Bot!**\nPrefix: \`${prefix}\` | Slash Commands: \`/\`\nServing in **${client.guilds.cache.size}** servers 🌐`)
                .addFields(
                    {
                        name: '🎧 Essential Commands',
                        value: [
                            '`/play <song>` - Play music',
                            '`/play-request` - Request song (DJ mode)',
                            '`/pause` - Pause playback',
                            '`/resume` - Resume playback',
                            '`/skip` - Skip current song',
                            '`/stop` - Stop and clear queue',
                            '`/join` - Join your voice channel'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '📋 Queue Management',
                        value: [
                            '`/queue` - View queue (paginated)',
                            '`/nowplaying` - Show current song',
                            '`/loop` - Toggle loop mode',
                            '`/shuffle` - Shuffle queue',
                            '`/clear` - Clear queue',
                            '`/remove` - Remove (with search)',
                            '`/move` - Move songs'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '⏯️ Playback Control',
                        value: [
                            '`/forward` - Fast forward ⏩',
                            '`/rewind` - Rewind ⏪',
                            '`/jump` - Jump to track',
                            '`/seek` - Seek to timestamp',
                            '`/volume` - Adjust volume',
                            '`/autoplay` - Toggle autoplay'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '⚙️ Settings & Admin',
                        value: [
                            '`/24-7` - Toggle 24/7 mode',
                            '`/setup-central` - Setup/config center',
                            '`/disable-central` - Disable center',
                            '`/clean` - Delete bot messages',
                            '`/stats` - View statistics'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🎫 DJ Request Mode',
                        value: [
                            '**Enable:** `/setup-central dj-request-mode:True`',
                            '• Non-DJs use `/play-request` for approval',
                            '• DJs approve/reject with buttons',
                            '• Now Playing announces in VC chat'
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '📡 Supported Platforms',
                        value: '🎬 YouTube • 🎧 Spotify • 🔊 SoundCloud • 🎵 Deezer',
                        inline: false
                    },
                    {
                        name: '💡 Pro Tips',
                        value: [
                            '• `/remove search:` shows autocomplete suggestions',
                            '• Duplicate songs are detected with loop option',
                            '• Bot auto-disconnects after 3min inactivity'
                        ].join('\n'),
                        inline: false
                    }
                )
                .setFooter({ text: 'Developed by 𝖇𝖎𝖔𝖘 • discord.gg/qKKBqNSD65' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('Help slash command error:', error);
            await interaction.reply({ 
                content: '❌ An error occurred while fetching commands.',
                ephemeral: true 
            });
        }
    }
};
