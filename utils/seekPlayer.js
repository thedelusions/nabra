async function seekPlayer(player, position) {
    if (!player?.current || !player.node?.rest?.updatePlayer) {
        throw new Error('No active player is available for seeking');
    }

    const trackLength = player.current.info?.length || 0;
    const safePosition = Math.max(0, Math.min(trackLength, Math.floor(position)));

    player.position = safePosition;

    await player.node.rest.updatePlayer({
        guildId: player.guildId,
        data: { position: safePosition }
    });

    return safePosition;
}

module.exports = seekPlayer;
