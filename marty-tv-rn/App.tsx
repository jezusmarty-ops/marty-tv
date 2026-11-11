/**
 * Marty TV — App.tsx
 * Root: provider de foco espacial + boot do catálogo + navegação por telas.
 *
 * Comportamento do D-Pad:
 *  - MENU: abre/fecha a sidebar
 *  - BACK: fecha overlay > sidebar > player > sai da categoria
 */
import React, { useEffect } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { FocusProvider } from './src/navigation/focusManager';
import { useTvStore } from './src/store/useTvStore';
import Sidebar from './src/components/Sidebar';
import HomeScreen from './src/screens/HomeScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import { colors } from './src/theme/theme';

function Root() {
  const screen = useTvStore(s => s.screen);
  const status = useTvStore(s => s.status);
  const loadCatalog = useTvStore(s => s.loadCatalog);
  const toggleSidebar = useTvStore(s => s.toggleSidebar);
  const setScreen = useTvStore(s => s.setScreen);
  const closePlayer = useTvStore(s => s.closePlayer);

  // boot: busca automática das listas M3U na inicialização
  useEffect(() => {
    if (status === 'idle') loadCatalog();
  }, [status, loadCatalog]);

  const handleBack = () => {
    if (screen === 'player') closePlayer();
    else if (screen === 'category' || screen === 'favorites') setScreen('home');
  };

  const handleMenu = () => toggleSidebar();

  return (
    <FocusProvider onBack={handleBack} onMenu={handleMenu}>
      <View style={styles.root}>
        <StatusBar hidden />
        {screen === 'home' && <HomeScreen />}
        {screen === 'category' && <CategoryScreen />}
        {screen === 'favorites' && <FavoritesScreen />}
        {screen === 'player' && <PlayerScreen />}
        <Sidebar />
      </View>
    </FocusProvider>
  );
}

export default function App() {
  return <Root />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
