/**
 * Carrossel horizontal virtualizado (FlatList) para trilhas de conteúdo.
 * Otimizações de memória para TV: windowSize enxuto, removeClippedSubviews
 * e chave estável por canal.
 */
import React, { memo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../theme/theme';
import ChannelCard from './ChannelCard';
import type { Channel } from '../store/useTvStore';

interface Props {
  title: string;
  data: Channel[];
  onPressChannel: (ch: Channel) => void;
  /** foca o primeiro card ao montar (usado pelo Hero/primeira trilha) */
  initialFocus?: boolean;
}

function CarouselInner({ title, data, onPressChannel, initialFocus }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        horizontal
        data={data}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <ChannelCard
            channel={item}
            onPress={onPressChannel}
            hasTVPreferredFocus={initialFocus && index === 0}
          />
        )}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
        getItemLayout={(_, index) => ({ length: 176, offset: 176 * index, index })}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  title: {
    color: colors.text,
    fontSize: fontSize.section,
    fontWeight: '700',
    marginBottom: spacing.sm,
    marginLeft: spacing.md,
  },
  list: { paddingHorizontal: spacing.md },
});

export default memo(CarouselInner);
