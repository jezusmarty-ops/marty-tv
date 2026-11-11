/**
 * Tela de favoritos — canais marcados pelo usuário.
 */
import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../theme/theme';
import ChannelCard from '../components/ChannelCard';
import { useTvStore, favoritesSection } from '../store/useTvStore';

export default function FavoritesScreen() {
  const channels = useTvStore(s => s.channels);
  const favorites = useTvStore(s => s.favorites);
  const playChannel = useTvStore(s => s.playChannel);

  const section = useMemo(() => favoritesSection(channels, favorites), [channels, favorites]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⭐ Favoritos</Text>
      {section.data.length > 0 ? (
        <FlatList
          data={section.data}
          keyExtractor={item => item.id}
          numColumns={4}
          renderItem={({ item, index }) => (
            <ChannelCard
              channel={item}
              onPress={playChannel}
              hasTVPreferredFocus={index === 0}
            />
          )}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={styles.grid}
        />
      ) : (
        <Text style={styles.empty}>
          Nenhum favorito ainda. Durante o player, aperte MENU para favoritar o canal.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: 24 },
  title: {
    color: colors.text,
    fontSize: fontSize.section + 6,
    fontWeight: '800',
    marginLeft: spacing.md,
    marginBottom: spacing.md,
  },
  grid: { paddingHorizontal: spacing.md, paddingBottom: 60 },
  empty: {
    color: colors.muted,
    fontSize: fontSize.body,
    marginLeft: spacing.md,
    marginTop: spacing.md,
  },
});
