const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');
const Server = require('../../models/Server');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('24-7')
        .setDescription('Toggle 24/7 mode (bot never disconnects)')
        .setDefaultMemberPermissions('0'), // Administrator only
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

        try {
            // Get or create server config
            let serverConfig = await Server.findById(interaction.guild.id);
            if (!serverConfig) {
                serverConfig = new Server({
                    _id: interaction.guild.id,
                    settings: { alwaysOn: false }
                });
            }

            // Toggle 24/7 mode
            const currentState = serverConfig.settings?.alwaysOn || false;
            const newState = !currentState;
            
            serverConfig.settings = serverConfig.settings || {};
            serverConfig.settings.alwaysOn = newState;
            await serverConfig.save();

            const description = newState 
                ? '🔛 **24/7 Mode Enabled**\nBot will stay in voice channel even when queue is empty.'
                : '🔴 **24/7 Mode Disabled**\nBot will disconnect after 3 minutes of inactivity.';

            const embed = new EmbedBuilder()
                .setDescription(description)
                .setColor(newState ? '#00FF00' : '#FF0000');
            
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));

        } catch (error) {
            console.error('24/7 slash command error:', error);
            const embed = new EmbedBuilder()
                .setDescription('❌ An error occurred while toggling 24/7 mode!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
        }
    }
};
