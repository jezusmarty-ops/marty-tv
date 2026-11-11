/**
 * Card de canal — capa/logo + nome, com estado de foco visível
 * (borda carmesim + escala), otimizado para renderização em FlatList.
 */
import React, { memo } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius, fontSize } from '../theme/theme';
import { useFocusable } from '../navigation/focusManager';
import type { Channel } from '../store/useTvStore';

interface Props {
  channel: Channel;
  onPress: (ch: Channel) => void;
  hasTVPreferredFocus?: boolean;
}

function ChannelCardInner({ channel, onPress, hasTVPreferredFocus }: Props) {
  const { ref, onFocus, onLayout } = useFocusable(`ch-${channel.id}`, {
    hasTVPreferredFocus,
  });

  const [focused, setFocused] = React.useState(false);

  return (
    <View
      ref={ref}
      focusable
      onFocus={() => {
        setFocused(true);
        onFocus();
      }}
      onBlur={() => setFocused(false)}
      onLayout={onLayout}
      style={[styles.card, focused && styles.cardFocused]}
    >
      <Pressable onPress={() => onPress(channel)} style={styles.pressable}>
        {channel.logo ? (
          <Image
            source={{ uri: channel.logo }}
            style={styles.logo}
            resizeMode="contain"
            onError={() => {}}
          />
        ) : (
          <View style={styles.logoFallback}>
            <Text style={styles.logoFallbackText}>📺</Text>
          </View>
        )}
        <Text style={styles.name} numberOfLines={1}>
          {channel.name}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 168,
    marginRight: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: spacing.sm,
    transform: [{ scale: 1 }],
  },
  cardFocused: {
    borderColor: colors.crimson,
    backgroundColor: colors.cardFocus,
    transform: [{ scale: 1.06 }],
  },
  pressable: { flex: 1 },
  logo: {
    width: '100%',
    height: 84,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  logoFallback: {
    width: '100%',
    height: 84,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: { fontSize: 30 },
  name: {
    color: colors.text,
    fontSize: fontSize.card,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
});

// eslint-disable-next-line import/no-default-export
export default memo(ChannelCardInner);
