/**
 * Tela do player — TVPlayer em tela cheia + overlay de zapping.
 * Se o canal falhar de vez (retries esgotados), troca automaticamente
 * para o próximo canal da lista — o app nunca fica preso num sinal morto.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import TVPlayer from '../components/TVPlayer';
import ChannelOverlay from '../components/ChannelOverlay';
import { useTvStore } from '../store/useTvStore';
import type { Channel } from '../store/useTvStore';

export default function PlayerScreen() {
  const selected = useTvStore(s => s.selectedChannel);
  const channels = useTvStore(s => s.channels);
  const playChannel = useTvStore(s => s.playChannel);
  const closePlayer = useTvStore(s => s.closePlayer);
  const toggleFavorite = useTvStore(s => s.toggleFavorite);
  const favorites = useTvStore(s => s.favorites);

  const [overlayVisible, setOverlayVisible] = useState(false);

  // contexto de zapping: seção do canal atual (ou todos, como fallback)
  const context = useMemo(() => {
    if (!selected) return [];
    const group = channels.filter(c => c.group === selected.group);
    return group.length ? group : channels;
  }, [selected, channels]);

  const handleChannelError = useCallback(() => {
    if (!selected) {
      closePlayer();
      return;
    }
    // pula para o próximo canal do contexto
    const idx = context.findIndex(c => c.id === selected.id);
    const next = context[(idx + 1) % Math.max(context.length, 1)];
    if (next && next.id !== selected.id) {
      playChannel(next);
    } else {
      closePlayer();
    }
  }, [selected, context, playChannel, closePlayer]);

  const isFav = selected ? favorites.includes(selected.id) : false;

  if (!selected) {
    closePlayer();
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <TVPlayer
        url={selected.url}
        title={`${isFav ? '⭐ ' : ''}${selected.name}`}
        onExit={closePlayer}
        onShowOverlay={() => setOverlayVisible(true)}
        onChannelError={handleChannelError}
      />
      <ChannelOverlay
        visible={overlayVisible}
        channels={context}
        currentId={selected.id}
        onSelect={ch => playChannel(ch)}
        onClose={() => setOverlayVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});
