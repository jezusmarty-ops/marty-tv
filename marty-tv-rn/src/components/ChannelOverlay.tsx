/**
 * Overlay de zapping — aparece por cima do player quando o usuário aperta
 * UP/DOWN no controle. Lista horizontal de canais (seção atual) para troca
 * rápida sem sair da tela cheia.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius, fontSize } from '../theme/theme';
import { useFocusable } from '../navigation/focusManager';
import type { Channel } from '../store/useTvStore';

interface Props {
  visible: boolean;
  channels: Channel[];
  currentId: string | null;
  onSelect: (ch: Channel) => void;
  onClose: () => void;
}

function OverlayCard({
  channel,
  active,
  onPress,
}: {
  channel: Channel;
  active: boolean;
  onPress: () => void;
}) {
  const { ref, onFocus } = useFocusable(`ov-${channel.id}`);
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      ref={ref}
      focusable
      onFocus={() => {
        setFocused(true);
        onFocus();
      }}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        styles.card,
        focused && styles.cardFocused,
        active && !focused && styles.cardActive,
      ]}
    >
      <Text style={styles.cardTitle} numberOfLines={1}>
        {channel.name}
      </Text>
    </Pressable>
  );
}

export default function ChannelOverlay({ visible, channels, currentId, onSelect, onClose }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const i = channels.findIndex(c => c.id === currentId);
    if (i >= 0) setIndex(i);
  }, [channels, currentId]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Text style={styles.header}>▲▼ navegue • OK para sintonizar</Text>
      <FlatList
        horizontal
        data={channels}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <OverlayCard
            channel={item}
            active={item.id === currentId}
            onPress={() => {
              onSelect(item);
              onClose();
            }}
          />
        )}
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: 220, offset: 220 * i, index: i })}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    paddingVertical: spacing.md,
    zIndex: 20,
  },
  header: {
    color: colors.muted,
    fontSize: fontSize.caption,
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
  },
  list: { paddingHorizontal: spacing.md },
  card: {
    width: 208,
    marginRight: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardFocused: { borderColor: colors.crimson, backgroundColor: colors.cardFocus },
  cardActive: { borderColor: colors.gold },
  cardTitle: { color: colors.text, fontSize: fontSize.card, fontWeight: '600' },
});
