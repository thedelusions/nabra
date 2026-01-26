/**
 * Changelog Announcement Service
 * Handles version-based changelog announcements with owner approval
 * 
 * @author thedelusions
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const CHANGELOG_PATH = path.join(__dirname, '..', 'changelog.json');

class ChangelogService {
    constructor(client) {
        this.client = client;
        this.changelog = null;
    }

    /**
     * Load changelog from file
     */
    loadChangelog() {
        try {
            const data = fs.readFileSync(CHANGELOG_PATH, 'utf8');
            this.changelog = JSON.parse(data);
            
            // Auto-fill missing dates with today's date
            let needsSave = false;
            for (const change of this.changelog.changes) {
                if (!change.date || change.date === '') {
                    change.date = this.getTodayDate();
                    needsSave = true;
                }
            }
            
            if (needsSave) {
                this.saveChangelog();
            }
            
            return this.changelog;
        } catch (error) {
            logger.error('Failed to load changelog:', error);
            return null;
        }
    }

    /**
     * Get today's date in YYYY-MM-DD format
     */
    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Save changelog to file
     */
    saveChangelog() {
        try {
            fs.writeFileSync(CHANGELOG_PATH, JSON.stringify(this.changelog, null, 4));
            return true;
        } catch (error) {
            logger.error('Failed to save changelog:', error);
            return false;
        }
    }

    /**
     * Check if there are pending changelog announcements
     */
    hasPendingAnnouncement() {
        if (!this.changelog) this.loadChangelog();
        if (!this.changelog) return false;

        return this.changelog.currentVersion !== this.changelog.lastAnnouncedVersion;
    }

    /**
     * Get pending changes that haven't been announced
     */
    getPendingChanges() {
        if (!this.changelog) this.loadChangelog();
        if (!this.changelog) return [];

        return this.changelog.changes.filter(change => !change.announced);
    }

    /**
     * Create the changelog embed for preview/announcement
     */
    createChangelogEmbed(change, isPreview = false) {
        const embed = new EmbedBuilder()
            .setColor(isPreview ? 0xFFA500 : 0x9966FF)
            .setTitle(change.title)
            .setDescription(change.description)
            .setTimestamp();

        if (isPreview) {
            embed.setAuthor({ 
                name: '📋 Changelog Preview - Pending Approval',
                iconURL: this.client.user.displayAvatarURL()
            });
        } else {
            embed.setAuthor({ 
                name: `Nabra Music Bot v${change.version}`,
                iconURL: this.client.user.displayAvatarURL()
            });
        }

        // Add features
        if (change.features && change.features.length > 0) {
            embed.addFields({
                name: '✨ New Features',
                value: change.features.join('\n'),
                inline: false
            });
        }

        // Add fixes
        if (change.fixes && change.fixes.length > 0) {
            embed.addFields({
                name: '🐛 Bug Fixes',
                value: change.fixes.map(f => `• ${f}`).join('\n'),
                inline: false
            });
        }

        // Add improvements
        if (change.improvements && change.improvements.length > 0) {
            embed.addFields({
                name: '⚡ Improvements',
                value: change.improvements.map(i => `• ${i}`).join('\n'),
                inline: false
            });
        }

        embed.setFooter({ 
            text: `Version ${change.version} • ${change.date}`,
            iconURL: this.client.user.displayAvatarURL()
        });

        return embed;
    }

    /**
     * Create approval buttons for owner
     */
    createApprovalButtons(version) {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`changelog_approve_${version}`)
                    .setLabel('✅ Announce')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`changelog_reject_${version}`)
                    .setLabel('❌ Skip')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`changelog_preview_${version}`)
                    .setLabel('👁️ Preview in Channel')
                    .setStyle(ButtonStyle.Secondary)
            );
    }

    /**
     * Send changelog preview to bot owner for approval
     */
    async sendOwnerApproval(ownerIds) {
        if (!this.hasPendingAnnouncement()) {
            logger.info('No pending changelog announcements');
            return;
        }

        const pendingChanges = this.getPendingChanges();
        if (pendingChanges.length === 0) return;

        // Get the latest pending change
        const latestChange = pendingChanges[pendingChanges.length - 1];

        for (const ownerId of ownerIds) {
            try {
                const owner = await this.client.users.fetch(ownerId);
                if (!owner) continue;

                const embed = this.createChangelogEmbed(latestChange, true);
                const buttons = this.createApprovalButtons(latestChange.version);

                await owner.send({
                    content: `🔔 **New version detected!** v${this.changelog.lastAnnouncedVersion} → v${latestChange.version}\n\nWould you like to announce this update to <#${this.changelog.announcementChannelId}>?`,
                    embeds: [embed],
                    components: [buttons]
                });

                logger.info(`Sent changelog approval request to owner: ${owner.tag}`);
            } catch (error) {
                logger.error(`Failed to send changelog to owner ${ownerId}:`, error.message);
            }
        }
    }

    /**
     * Announce changelog to the support server
     */
    async announceChangelog(version) {
        if (!this.changelog) this.loadChangelog();

        const change = this.changelog.changes.find(c => c.version === version);
        if (!change) {
            logger.error(`Changelog version ${version} not found`);
            return false;
        }

        try {
            const channel = await this.client.channels.fetch(this.changelog.announcementChannelId);
            if (!channel) {
                logger.error('Announcement channel not found');
                return false;
            }

            const embed = this.createChangelogEmbed(change, false);
            
            await channel.send({
                content: '📢 **New Update Released!** <@&1465232267659186257>',
                embeds: [embed]
            });

            // Mark as announced
            change.announced = true;
            this.changelog.lastAnnouncedVersion = version;
            this.saveChangelog();

            logger.info(`Changelog v${version} announced successfully`);
            return true;
        } catch (error) {
            logger.error('Failed to announce changelog:', error);
            return false;
        }
    }

    /**
     * Skip a changelog announcement (mark as announced without posting)
     */
    skipChangelog(version) {
        if (!this.changelog) this.loadChangelog();

        const change = this.changelog.changes.find(c => c.version === version);
        if (!change) return false;

        change.announced = true;
        this.changelog.lastAnnouncedVersion = version;
        this.saveChangelog();

        logger.info(`Changelog v${version} skipped`);
        return true;
    }

    /**
     * Add a new changelog entry programmatically
     */
    addChangelogEntry(entry) {
        if (!this.changelog) this.loadChangelog();

        // Ensure required fields
        const newEntry = {
            version: entry.version,
            date: entry.date || this.getTodayDate(),
            title: entry.title,
            description: entry.description || '',
            features: entry.features || [],
            fixes: entry.fixes || [],
            improvements: entry.improvements || [],
            announced: false
        };

        this.changelog.changes.push(newEntry);
        this.changelog.currentVersion = entry.version;
        this.saveChangelog();

        return newEntry;
    }
}

module.exports = ChangelogService;
