/**
 * Message Formatting Utilities
 * Creates beautiful, detailed embeds for music commands
 */

const { EmbedBuilder } = require('discord.js');

class MusicFormatters {
    /**
     * Format duration from milliseconds to MM:SS or HH:MM:SS
     */
    static formatDuration(duration) {
        if (!duration || duration === 0) return '🔴 LIVE';
        
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Get emoji for music source
     */
    static getSourceEmoji(source) {
        const sourceMap = {
            'youtube': '🎬',
            'soundcloud': '🔊',
            'spotify': '🎧',
            'bandcamp': '🎸',
            'twitch': '🎮',
            'vimeo': '📹',
            'http': '🌐'
        };
        return sourceMap[source?.toLowerCase()] || '🎵';
    }

    /**
     * Get emoji for loop mode
     */
    static getLoopEmoji(loopMode) {
        switch (loopMode) {
            case 'track': return '🔂';
            case 'queue': return '🔁';
            default: return '➡️';
        }
    }

    /**
     * Get status emoji
     */
    static getStatusEmoji(playing, paused) {
        if (paused) return '⏸️';
        if (playing) return '▶️';
        return '⏹️';
    }

    /**
     * Create a detailed track added embed
     */
    static createTrackAddedEmbed(track, player, isPlaying = false) {
        const sourceEmoji = this.getSourceEmoji(track.info.sourceName);
        const duration = this.formatDuration(track.info.length);
        const queuePosition = player.queue.size;

        const embed = new EmbedBuilder()
            .setColor('#2F3767')
            .setTitle(`${sourceEmoji} ${isPlaying ? 'Now Playing' : 'Added to Queue'}`)
            .setDescription(`**[${track.info.title}](${track.info.uri})**`)
            .addFields(
                { name: '🎤 Artist', value: track.info.author || 'Unknown', inline: true },
                { name: '⏱️ Duration', value: duration, inline: true },
                { name: '🔊 Source', value: track.info.sourceName || 'Unknown', inline: true }
            )
            .setFooter({ 
                text: `Requested by ${track.info.requester.username}${queuePosition > 0 ? ` • Position in queue: ${queuePosition}` : ''}`,
                iconURL: track.info.requester.displayAvatarURL()
            })
            .setTimestamp();

        // Add thumbnail if available
        if (track.info.thumbnail || track.info.artworkUrl) {
            embed.setThumbnail(track.info.thumbnail || track.info.artworkUrl);
        }

        return embed;
    }

    /**
     * Create a playlist added embed
     */
    static createPlaylistAddedEmbed(playlistInfo, trackCount, requester, firstTrack = null) {
        const embed = new EmbedBuilder()
            .setColor('#2F3767')
            .setTitle('📚 Playlist Added to Queue')
            .setDescription(`**${playlistInfo.name || 'Unknown Playlist'}**`)
            .addFields(
                { name: '🎵 Tracks Added', value: `${trackCount} songs`, inline: true },
                { name: '👤 Requested By', value: requester.username, inline: true }
            )
            .setFooter({ 
                text: `${trackCount} tracks have been added to the queue`,
                iconURL: requester.displayAvatarURL()
            })
            .setTimestamp();

        // Add first track info if available
        if (firstTrack && firstTrack.info) {
            embed.addFields({
                name: '▶️ First Track',
                value: `${firstTrack.info.title} - ${firstTrack.info.author}`,
                inline: false
            });

            if (firstTrack.info.thumbnail || firstTrack.info.artworkUrl) {
                embed.setThumbnail(firstTrack.info.thumbnail || firstTrack.info.artworkUrl);
            }
        }

        return embed;
    }

    /**
     * Create a now playing embed
     */
    static createNowPlayingEmbed(track, player) {
        const sourceEmoji = this.getSourceEmoji(track.info.sourceName);
        const statusEmoji = this.getStatusEmoji(player.playing, player.paused);
        const loopEmoji = this.getLoopEmoji(player.loop);
        
        const duration = this.formatDuration(track.info.length);
        const position = this.formatDuration(player.position);
        const progress = this.createProgressBar(player.position, track.info.length);

        const embed = new EmbedBuilder()
            .setColor('#2F3767')
            .setTitle(`${sourceEmoji} Now Playing`)
            .setDescription(`**[${track.info.title}](${track.info.uri})**`)
            .addFields(
                { name: '🎤 Artist', value: track.info.author || 'Unknown', inline: true },
                { name: '⏱️ Duration', value: duration, inline: true },
                { name: '<:volume:1464838911439409305> Volume', value: `${player.volume || 50}%`, inline: true },
                { name: '📊 Progress', value: `${progress}\n${position} / ${duration}`, inline: false },
                { name: '🔁 Loop', value: `${loopEmoji} ${player.loop || 'Off'}`, inline: true },
                { name: '<:queue:1464823466359521331> Queue', value: `${player.queue.size} songs`, inline: true },
                { name: '⚡ Status', value: `${statusEmoji} ${player.paused ? 'Paused' : 'Playing'}`, inline: true }
            )
            .setFooter({ 
                text: `Requested by ${track.info.requester?.username || 'Unknown'}`,
                iconURL: track.info.requester?.displayAvatarURL?.() || null
            })
            .setTimestamp();

        // Add thumbnail if available
        if (track.info.thumbnail || track.info.artworkUrl) {
            embed.setThumbnail(track.info.thumbnail || track.info.artworkUrl);
        }

        return embed;
    }

    /**
     * Create a progress bar
     */
    static createProgressBar(current, total, length = 20) {
        if (!total || total === 0) return '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ 🔴 LIVE';
        
        const progress = Math.min(Math.max(current / total, 0), 1);
        const filledLength = Math.round(length * progress);
        const emptyLength = length - filledLength;
        
        const filledBar = '▬'.repeat(filledLength);
        const emptyBar = '▬'.repeat(emptyLength);
        
        return `${filledBar}🔘${emptyBar}`;
    }

    /**
     * Create a simple success embed
     */
    static createSuccessEmbed(message) {
        return new EmbedBuilder()
            .setColor('#00FF00')
            .setDescription(`✅ ${message}`)
            .setTimestamp();
    }

    /**
     * Create a simple error embed
     */
    static createErrorEmbed(message) {
        return new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription(`❌ ${message}`)
            .setTimestamp();
    }

    /**
     * Create a track not found embed with helpful suggestions
     */
    static createTrackNotFoundEmbed(query) {
        const suggestions = [];
        
        // Analyze the query and provide contextual suggestions
        if (query.length < 3) {
            suggestions.push('Try a longer search term');
        }
        
        if (!query.includes(' ')) {
            suggestions.push('Try adding the artist name: `song name - artist`');
        }
        
        if (query.includes('https://')) {
            suggestions.push('The link might be unavailable or restricted');
            suggestions.push('Try searching by song name instead');
        } else {
            suggestions.push('Check your spelling');
            suggestions.push('Try the official song title');
            suggestions.push('Use a YouTube/Spotify link directly');
        }

        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('🔍 No Results Found')
            .setDescription(
                `Could not find: **${query.substring(0, 100)}${query.length > 100 ? '...' : ''}**\n\n` +
                `**💡 Suggestions:**\n${suggestions.map(s => `• ${s}`).join('\n')}`
            )
            .addFields({
                name: '📝 Examples',
                value: 
                    '• `Never Gonna Give You Up - Rick Astley`\n' +
                    '• `lofi hip hop beats`\n' +
                    '• `https://youtube.com/watch?v=...`',
                inline: false
            })
            .setFooter({ text: 'Tip: More specific searches work better!' })
            .setTimestamp();

        return embed;
    }

    /**
     * Create a simple info embed
     */
    static createInfoEmbed(message, color = '#3498DB') {
        return new EmbedBuilder()
            .setColor(color)
            .setDescription(`ℹ️ ${message}`)
            .setTimestamp();
    }

    /**
     * Create a warning embed
     */
    static createWarningEmbed(message) {
        return new EmbedBuilder()
            .setColor('#FFA500')
            .setDescription(`⚠️ ${message}`)
            .setTimestamp();
    }
}

module.exports = MusicFormatters;
