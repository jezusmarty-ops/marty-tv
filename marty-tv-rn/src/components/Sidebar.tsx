/**
 * Sidebar esquerda ocultável, navegável por D-Pad.
 * Itens: Início, TV Aberta, Filmes, Documentários, Esportes, Favoritos.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize } from '../theme/theme';
import { useFocusable } from '../navigation/focusManager';
import { useTvStore } from '../store/useTvStore';

const MENU = [
  { key: 'home', label: 'Início', icon: '🏠' },
  { key: 'section:TV Aberta', label: 'TV Aberta', icon: '📡' },
  { key: 'section:Filmes', label: 'Filmes', icon: '🎬' },
  { key: 'section:Documentários', label: 'Documentários', icon: '📚' },
  { key: 'section:Esportes', label: 'Esportes', icon: '⚽' },
  { key: 'favorites', label: 'Favoritos', icon: '⭐' },
];

function SidebarItem({
  label,
  icon,
  active,
  onPress,
  hasTVPreferredFocus,
}: {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
}) {
  const { ref, onFocus } = useFocusable(`menu-${label}`, { hasTVPreferredFocus });
  const [focused, setFocused] = React.useState(false);
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
        styles.item,
        focused && styles.itemFocused,
        active && !focused && styles.itemActive,
      ]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

export default function Sidebar() {
  const sidebarOpen = useTvStore(s => s.sidebarOpen);
  const screen = useTvStore(s => s.screen);
  const setScreen = useTvStore(s => s.setScreen);
  const openSection = useTvStore(s => s.openSection);
  const toggleSidebar = useTvStore(s => s.toggleSidebar);

  if (!sidebarOpen) return null;

  const handlePress = (key: string) => {
    toggleSidebar(false);
    if (key === 'home') setScreen('home');
    else if (key === 'favorites') setScreen('favorites');
    else openSection(key.replace('section:', ''));
  };

  const isActive = (key: string) => {
    if (key === 'home') return screen === 'home';
    if (key === 'favorites') return screen === 'favorites';
    return screen === 'category';
  };

  return (
    <View style={styles.sidebar}>
      <Text style={styles.brand}>
        Marty<Text style={styles.brandAccent}>TV</Text>
      </Text>
      {MENU.map((item, i) => (
        <SidebarItem
          key={item.key}
          label={item.label}
          icon={item.icon}
          active={isActive(item.key)}
          hasTVPreferredFocus={i === 0}
          onPress={() => handlePress(item.key)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 260,
    backgroundColor: colors.surface,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    zIndex: 50,
    elevation: 12,
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  brand: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  brandAccent: { color: colors.crimson },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemFocused: { borderColor: colors.crimson, backgroundColor: colors.cardFocus },
  itemActive: { backgroundColor: colors.card },
  icon: { fontSize: 20, marginRight: spacing.sm },
  label: { color: colors.text, fontSize: fontSize.card, fontWeight: '600' },
});
