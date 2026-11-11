/**
 * Estado global (Zustand) — canais, seções, navegação e favoritos.
 * Persistência de favoritos via AsyncStorage (sobrevive a restart do app).
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOURCES, OFFICIAL_DOMAINS } from '../config/sources';
import { parseM3U, buildSections } from '../utils/m3uParser';
import { fetchTextWithRetry, downloadTextWithRNFS } from '../utils/fetcher';

export interface Channel {
  id: string;
  name: string;
  logo: string | null;
  group: string;
  language: string | null;
  url: string;
  sourceId: string;
}

export interface Section {
  key: string;
  title: string;
  data: Channel[];
}

export type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

interface TvState {
  status: CatalogStatus;
  channels: Channel[];
  sections: Section[];
  warnings: string[]; // fontes que falharam (para tela de erro elegante)
  sidebarOpen: boolean;
  screen: 'home' | 'category' | 'favorites' | 'player';
  activeSection: string | null;
  selectedChannel: Channel | null;
  favorites: string[]; // ids de canais
  loadCatalog: () => Promise<void>;
  setScreen: (s: TvState['screen']) => void;
  openSection: (key: string) => void;
  playChannel: (ch: Channel) => void;
  closePlayer: () => void;
  toggleSidebar: (open?: boolean) => void;
  toggleFavorite: (id: string) => void;
}

export const useTvStore = create<TvState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      channels: [],
      sections: [],
      warnings: [],
      sidebarOpen: false,
      screen: 'home',
      activeSection: null,
      selectedChannel: null,
      favorites: [],

      loadCatalog: async () => {
        if (get().status === 'loading') return;
        set({ status: 'loading', warnings: [] });

        const all: Channel[] = [];
        const warnings: string[] = [];

        // busca sequencial por fonte: uma fonte morta NUNCA derruba as outras
        for (const source of SOURCES) {
          try {
            const text = await fetchTextWithRetry(source.url, { retries: 2, timeoutMs: 20000 });
            const parsed = parseM3U(text, {
              sourceId: source.id,
              language: source.language ?? 'all',
              allowlist: OFFICIAL_DOMAINS,
              fallbackGroup: source.fallbackGroup,
              maxChannels: 4000,
            });
            all.push(...parsed);
          } catch (e) {
            // 2ª tentativa via react-native-fs (pode atravessar proxies que o fetch não)
            try {
              const text = await downloadTextWithRNFS(source.url);
              const parsed = parseM3U(text, {
                sourceId: source.id,
                language: source.language ?? 'all',
                allowlist: OFFICIAL_DOMAINS,
                fallbackGroup: source.fallbackGroup,
                maxChannels: 4000,
              });
              all.push(...parsed);
            } catch (e2) {
              warnings.push(`${source.id}: ${(e2 as Error).message}`);
            }
          }
        }

        if (all.length === 0) {
          set({
            status: 'error',
            warnings: warnings.length ? warnings : ['Nenhuma fonte retornou conteúdo.'],
          });
          return;
        }

        set({
          status: 'ready',
          channels: all,
          sections: buildSections(all, 1),
          warnings,
        });
      },

      setScreen: screen => set({ screen }),

      openSection: key => set({ activeSection: key, screen: 'category' }),

      playChannel: ch => set({ selectedChannel: ch, screen: 'player' }),

      closePlayer: () => set({ selectedChannel: null, screen: 'home' }),

      toggleSidebar: open => set(s => ({ sidebarOpen: open ?? !s.sidebarOpen })),

      toggleFavorite: id =>
        set(s => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter(f => f !== id)
            : [id, ...s.favorites],
        })),
    }),
    {
      name: 'martytv-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ favorites: state.favorites }),
    },
  ),
);

/** Seção de canais favoritados (derivada, não persistida) */
export function favoritesSection(channels: Channel[], favIds: string[]): Section {
  const data = channels.filter(c => favIds.includes(c.id));
  return { key: 'favoritos', title: 'Favoritos', data };
}
