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
            const msgCommandsPath = path.join(__dirname, '..', 'message');
            const msgFiles = fs.readdirSync(msgCommandsPath).filter(file => file.endsWith('.js'));
            const messageCommands = msgFiles.map(file => {
                const cmd = require(path.join(msgCommandsPath, file));
                return { name: cmd.name || 'Unknown', description: cmd.description || 'No description' };
            });

            const slashCommandsPath = path.join(__dirname, '..', 'slash');
            const slashFiles = fs.readdirSync(slashCommandsPath).filter(file => file.endsWith('.js'));
            const slashCommands = slashFiles.map(file => {
                const cmd = require(path.join(slashCommandsPath, file));
                return {
                    name: cmd.data?.name || 'Unknown',
                    description: cmd.data?.description || 'No description'
                };
            });

            let description = `**🌐 Bot Stats:** Serving in **${client.guilds.cache.size}** servers.\n\n`;

            description += `**💬 Message Commands [${messageCommands.length}]:**\n`;
            messageCommands.forEach(cmd => {
                description += `- \`n!${cmd.name}\` - ${cmd.description}\n`;
            });

            description += `\n**⚡ Slash Commands [${slashCommands.length}]:**\n`;
            slashCommands.forEach(cmd => {
                description += `- \`/${cmd.name}\` - ${cmd.description}\n`;
            });

            description += `\n**🎵 Supported Platforms:**\n`;
            description += `• 🎬 YouTube •🎧 Spotify  •🔊 SoundCloud \n\n`;
            description += `**🎮 Playback Control:**\n`;
            description += `\`n!forward [seconds]\` - Fast forward (⏩ default: 10s)\n`;
            description += `\`n!rewind [seconds]\` - Rewind (⏪ default: 10s)\n`;
            description += `\`n!pause\` / \`n!resume\` - Pause/Resume playback\n`;
            description += `\`n!skip\` - Skip current track\n`;
            description += `\`n!jump <number>\` - Jump to specific track\n\n`;
            description += `**🔄 Queue Management:**\n`;
            description += `\`n!loop <mode>\` - Loop off/track/queue\n`;
            description += `\`n!move <from> <to>\` - Rearrange queue\n`;
            description += `\`n!clear [from]\` - Clear queue (optionally from position)\n`;
            description += `\`n!shuffle\` - Shuffle queue\n\n`;
            description += `**⚙️ Settings:**\n`;
            description += `\`n!24/7\` - Toggle 24/7 mode (Admin only)\n\n`;

            if (description.length > 4096) {
                description = description.slice(0, 4093) + '...';
            }

            const embed = new EmbedBuilder()
                .setTitle('📖 Nabra Music Bot - Command List')
                .setColor(0x1DB954)
                .setDescription(description)
                .setFooter({ text: 'Developed by Bios | https://oureonbh.com' })
                .setTimestamp();

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Help command error:', error);
            await message.reply('❌ An error occurred while fetching commands.');
        }
    }
};
