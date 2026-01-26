const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    name: 'help',
    aliases: ['h'],
    description: 'List all available commands',
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

        try {
            const prefix = process.env.PREFIX || 'n!';
            const embedColor = process.env.EMBED_COLOR || '#2F3767';
            
            // Create the main help embed with better categorization
            const embed = new EmbedBuilder()
                .setTitle('🎵 Nabra Music Bot - Command Guide')
                .setColor(embedColor)
                .setDescription(`**Welcome to Nabra Music Bot!**\nPrefix: \`${prefix}\` | Slash Commands: \`/\`\nServing in **${client.guilds.cache.size}** servers 🌐`)
                .addFields(
                    {
                        name: '🎧 Essential Commands',
                        value: 
                            `\`${prefix}play <song/url>\` or \`/play\` - Play music\n` +
                            `\`${prefix}pr <song>\` or \`/play-request\` - Request song (DJ mode)\n` +
                            `\`${prefix}pause\` or \`/pause\` - Pause playback\n` +
                            `\`${prefix}resume\` or \`/resume\` - Resume playback\n` +
                            `\`${prefix}skip\` or \`/skip\` - Skip current song\n` +
                            `\`${prefix}stop\` or \`/stop\` - Stop and clear queue\n` +
                            `\`${prefix}join\` or \`/join\` - Join your voice channel`,
                        inline: false
                    },
                    {
                        name: '📋 Queue Management',
                        value: 
                            `\`${prefix}queue\` or \`/queue\` - View queue (with pagination)\n` +
                            `\`${prefix}nowplaying\` or \`/nowplaying\` - Show current song\n` +
                            `\`${prefix}loop [mode]\` or \`/loop\` - Toggle loop (off/track/queue)\n` +
                            `\`${prefix}shuffle\` or \`/shuffle\` - Shuffle queue\n` +
                            `\`${prefix}clear [from]\` or \`/clear\` - Clear queue\n` +
                            `\`${prefix}remove <pos>\` or \`/remove\` - Remove song (with search)\n` +
                            `\`${prefix}move <from> <to>\` or \`/move\` - Move songs`,
                        inline: false
                    },
                    {
                        name: '⏯️ Playback Control',
                        value: 
                            `\`${prefix}forward [sec]\` or \`/forward\` - Fast forward ⏩\n` +
                            `\`${prefix}rewind [sec]\` or \`/rewind\` - Rewind ⏪\n` +
                            `\`${prefix}jump <pos>\` or \`/jump\` - Jump to track\n` +
                            `\`${prefix}seek <time>\` or \`/seek\` - Seek to timestamp\n` +
                            `\`${prefix}volume [1-100]\` or \`/volume\` - Adjust volume\n` +
                            `\`/autoplay\` - Toggle autoplay mode`,
                        inline: false
                    },
                    {
                        name: '⚙️ Settings & Admin',
                        value: 
                            `\`${prefix}247\` or \`/24-7\` - Toggle 24/7 mode\n` +
                            `\`/setup-central\` - Setup/configure control center\n` +
                            `\`/disable-central\` - Disable control center\n` +
                            `\`/clean [amount]\` - Delete bot messages\n` +
                            `\`/clean-up\` - Clean up old bot messages`,
                        inline: false
                    },
                    {
                        name: '🎫 DJ Request Mode',
                        value: 
                            `Enable via \`/setup-central dj-request-mode:True\`\n` +
                            `Non-DJs use \`/play-request\` for approval\n` +
                            `DJs approve/reject requests with buttons`,
                        inline: false
                    },
                    {
                        name: '📡 Supported Platforms',
                        value: '🎬 YouTube • 🎧 Spotify • 🔊 SoundCloud • 🎵 Deezer',
                        inline: false
                    },
                    {
                        name: '💡 Need Help?',
                        value: 
                            `• Use \`${prefix}support\` for support server\n` +
                            `• Discord: https://discord.gg/qKKBqNSD65`,
                        inline: false
                    }
                )
                .setFooter({ text: 'Developed by 𝖇𝖎𝖔𝖘 • Duplicate detection & smart suggestions enabled!' })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Help command error:', error);
            await message.reply('❌ An error occurred while fetching commands.');
        }
    }
};
