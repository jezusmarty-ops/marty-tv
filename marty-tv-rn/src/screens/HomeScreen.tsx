/**
 * Tela inicial — Hero em autoplay + trilhas por categoria.
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, fontSize } from '../theme/theme';
import HeroBanner from '../components/HeroBanner';
import Carousel from '../components/Carousel';
import ErrorScreen from '../components/ErrorScreen';
import { useTvStore } from '../store/useTvStore';

export default function HomeScreen() {
  const status = useTvStore(s => s.status);
  const sections = useTvStore(s => s.sections);
  const channels = useTvStore(s => s.channels);
  const warnings = useTvStore(s => s.warnings);
  const playChannel = useTvStore(s => s.playChannel);
  const loadCatalog = useTvStore(s => s.loadCatalog);

  // hero: primeiro canal de uma seção de filmes (autoplay silencioso)
  const hero = useMemo(() => {
    const movies = sections.find(s => /film|movie|cinema/i.test(s.title));
    const list = movies && movies.data.length ? movies.data : channels;
    return list.length ? list[0] : null;
  }, [sections, channels]);

  if (status === 'loading' && channels.length === 0) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingBrand}>
          Marty<Text style={styles.loadingAccent}>TV</Text>
        </Text>
        <ActivityIndicator size="large" color={colors.crimson} />
        <Text style={styles.loadingText}>Carregando canais…</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <ErrorScreen
        warnings={warnings}
        onRetry={loadCatalog}
        title="Sem conexão com as fontes"
        message="Não consegui baixar as listas de canais. Verifique a internet da TV e tente de novo."
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <HeroBanner channel={hero} onPress={playChannel} />
        {sections.map((section, i) => (
          <Carousel
            key={section.key}
            title={section.title}
            data={section.data}
            onPressChannel={playChannel}
            initialFocus={i === 0}
          />
        ))}
        {warnings.length > 0 && (
          <Text style={styles.warnNote}>
            Algunas fuentes no respondieron — mostrando el catálogo interno.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 24, paddingBottom: 60 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  loadingBrand: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '800',
    marginBottom: spacing.lg,
  },
  loadingAccent: { color: colors.crimson },
  loadingText: {
    color: colors.muted,
    fontSize: fontSize.body,
    marginTop: spacing.md,
  },
  warnNote: {
    color: colors.muted,
    fontSize: 12,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
});
