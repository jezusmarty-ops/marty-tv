/**
 * Tela inicial — Hero em autoplay + trilhas por categoria.
 */
import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme/theme';
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
          <ErrorScreen
            title="Algumas fontes falharam"
            warnings={warnings}
            onRetry={loadCatalog}
            onBack={() => {}}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 24, paddingBottom: 60 },
});
