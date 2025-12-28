const { EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');
const Server = require('../../models/Server');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    name: '24/7',
    aliases: ['247', 'alwayson', 'stay'],
    description: 'Toggle 24/7 mode (bot never disconnects)',
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
        }, 4000);

        // Check for admin permission
        if (!message.member.permissions.has('Administrator')) {
            const embed = new EmbedBuilder()
                .setDescription('❌ You need Administrator permission to use this command!');
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
        }
        
        try {
            // Get or create server config
            let serverConfig = await Server.findById(message.guild.id);
            if (!serverConfig) {
                serverConfig = new Server({
                    _id: message.guild.id,
                    settings: { alwaysOn: false }
                });
            }

            // Toggle 24/7 mode
            const currentState = serverConfig.settings?.alwaysOn || false;
            const newState = !currentState;
            
            serverConfig.settings = serverConfig.settings || {};
            serverConfig.settings.alwaysOn = newState;
            await serverConfig.save();

            const statusEmoji = newState ? '🔛' : '🔴';
            const statusText = newState ? 'enabled' : 'disabled';
            const description = newState 
                ? '🔛 **24/7 Mode Enabled**\nBot will stay in voice channel even when queue is empty.'
                : '🔴 **24/7 Mode Disabled**\nBot will disconnect after 3 minutes of inactivity.';

            const embed = new EmbedBuilder()
                .setDescription(description)
                .setColor(newState ? '#00FF00' : '#FF0000');
            
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));

        } catch (error) {
            console.error('24/7 command error:', error);
            const embed = new EmbedBuilder()
                .setDescription('❌ An error occurred while toggling 24/7 mode!');
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
        }
    }
};
