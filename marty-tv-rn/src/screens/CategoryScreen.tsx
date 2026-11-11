/**
 * Tela de categoria — grade/grid de canais de uma seção específica.
 */
import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../theme/theme';
import ChannelCard from '../components/ChannelCard';
import { useTvStore } from '../store/useTvStore';

export default function CategoryScreen() {
  const activeSection = useTvStore(s => s.activeSection);
  const sections = useTvStore(s => s.sections);
  const playChannel = useTvStore(s => s.playChannel);

  const section = useMemo(
    () => sections.find(s => s.key === activeSection) || null,
    [sections, activeSection],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{section ? section.title : 'Categoria'}</Text>
      {section && section.data.length > 0 ? (
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
        <Text style={styles.empty}>Nenhum canal nesta categoria.</Text>
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
