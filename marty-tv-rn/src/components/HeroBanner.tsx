/**
 * Hero Banner — canal de filme em autoplay silencioso com gradiente
 * de fundo e título em destaque. Falha no stream cai para um pôster
 * estático (nunca crasha).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Video from 'react-native-video';
import { colors, spacing, radius, fontSize } from '../theme/theme';
import { useFocusable } from '../navigation/focusManager';
import type { Channel } from '../store/useTvStore';

interface Props {
  channel: Channel | null;
  onPress: (ch: Channel) => void;
}

export default function HeroBanner({ channel, onPress }: Props) {
  const { ref, onFocus } = useFocusable('hero-banner', { hasTVPreferredFocus: false });
  const [focused, setFocused] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    setVideoFailed(false);
  }, [channel?.url]);

  if (!channel) {
    return (
      <View style={styles.banner}>
        <Text style={styles.placeholder}>Carregando destaques…</Text>
      </View>
    );
  }

  return (
    <Pressable
      ref={ref}
      focusable
      onFocus={() => {
        setFocused(true);
        onFocus();
      }}
      onBlur={() => setFocused(false)}
      onPress={() => onPress(channel)}
      style={[styles.banner, focused && styles.bannerFocused]}
    >
      {!videoFailed ? (
        <Video
          source={{ uri: channel.url }}
          style={styles.video}
          muted
          repeat
          paused={false}
          resizeMode="cover"
          playInBackground={false}
          onError={() => setVideoFailed(true)}
          bufferConfig={{
            minBufferMs: 8000,
            maxBufferMs: 30000,
            bufferForPlaybackMs: 4000,
            bufferForPlaybackAfterRebufferMs: 4000,
          }}
        />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackIcon}>🎬</Text>
        </View>
      )}
      <View style={styles.scrim} />
      <View style={styles.info}>
        <Text style={styles.kicker}>EM DESTAQUE</Text>
        <Text style={styles.title} numberOfLines={2}>
          {channel.name}
        </Text>
        <Text style={styles.subtitle}>Filmes 24h • sem mensalidade</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 380,
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: spacing.lg,
  },
  bannerFocused: { borderColor: colors.crimson },
  video: { ...StyleSheet.absoluteFillObject },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.crimsonDark,
  },
  fallbackIcon: { fontSize: 72 },
  placeholder: {
    color: colors.muted,
    fontSize: fontSize.body,
    alignSelf: 'center',
    marginTop: 170,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  info: {
    position: 'absolute',
    left: spacing.lg,
    bottom: spacing.lg,
    right: spacing.lg,
  },
  kicker: {
    color: colors.gold,
    fontSize: fontSize.caption,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.hero,
    fontWeight: '800',
    lineHeight: 46,
  },
  subtitle: { color: colors.muted, fontSize: fontSize.body, marginTop: spacing.xs },
});
