/**
 * Gerenciador de foco espacial para Android TV (D-Pad).
 *
 * Sem dependências externas: registra refs de elementos focáveis e, ao
 * receber eventos de seta do controle remoto, calcula o "vizinho mais
 * próximo" (por distância geométrica) e move o foco — exatamente como
 * funciona a Leanback UI nativa.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  TVEventHandler,
  View,
  type ViewProps,
  type LayoutChangeEvent,
} from 'react-native';

interface FocusNode {
  id: string;
  ref: React.RefObject<View>;
  layout: { x: number; y: number; w: number; h: number } | null;
}

const registry = new Map<string, FocusNode>();
let lastFocusedId: string | null = null;

/** Direções suportadas */
type Direction = 'up' | 'down' | 'left' | 'right';

function register(node: FocusNode) {
  registry.set(node.id, node);
}
function unregister(id: string) {
  registry.delete(id);
  if (lastFocusedId === id) lastFocusedId = null;
}

function distance(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  dir: Direction,
): number {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  const dx = bx - ax;
  const dy = by - ay;
  // elemento precisa estar na direção do movimento
  if (dir === 'right' && dx <= 0) return Infinity;
  if (dir === 'left' && dx >= 0) return Infinity;
  if (dir === 'down' && dy <= 0) return Infinity;
  if (dir === 'up' && dy >= 0) return Infinity;
  const primary = dir === 'left' || dir === 'right' ? Math.abs(dx) : Math.abs(dy);
  const secondary = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
  return primary + secondary * 0.75;
}

async function moveFocus(dir: Direction) {
  const current = lastFocusedId ? registry.get(lastFocusedId) : null;
  const nodes = Array.from(registry.values()).filter(n => n.ref.current != null);
  if (nodes.length === 0) return;

  if (!current || !current.layout) {
    // sem foco ativo: foca o primeiro elemento registrado
    nodes[0].ref.current?.requestTVFocus();
    return;
  }

  // garante layouts medidos (measureInWindow é async)
  await Promise.all(
    nodes
      .filter(n => !n.layout)
      .map(
        n =>
          new Promise<void>(resolve => {
            n.ref.current?.measureInWindow((x, y, w, h) => {
              n.layout = { x, y, w, h };
              resolve();
            });
            // fallback caso a medida falhe
            setTimeout(resolve, 120);
          }),
      ),
  );

  let best: FocusNode | null = null;
  let bestDist = Infinity;
  for (const n of nodes) {
    if (n.id === current.id || !n.layout) continue;
    const d = distance(current.layout, n.layout, dir);
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }
  if (best && bestDist < Infinity) {
    best.ref.current?.requestTVFocus();
  }
}

interface FocusApi {
  ref: React.RefObject<View>;
  focusable: true;
  onFocus: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
  hasTVPreferredFocus?: boolean;
  focusProps: ViewProps & { ref: React.RefObject<View> };
}

/**
 * Hook: registra o componente no mapa de foco espacial.
 * @param id identificador único do foco
 * @param opts.hasTVPreferredFocus foca este elemento ao montar
 */
export function useFocusable(id: string, opts: { hasTVPreferredFocus?: boolean } = {}): FocusApi {
  const ref = useRef<View>(null);

  useEffect(() => {
    const node: FocusNode = { id, ref, layout: null };
    register(node);
    if (opts.hasTVPreferredFocus) {
      // espera o layout antes de pedir foco
      const t = setTimeout(() => ref.current?.requestTVFocus(), 50);
      return () => {
        clearTimeout(t);
        unregister(id);
      };
    }
    return () => unregister(id);
  }, [id, opts.hasTVPreferredFocus]);

  const onFocus = useCallback(() => {
    lastFocusedId = id;
  }, [id]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const node = registry.get(id);
    if (!node) return;
    const { x, y, width, height } = e.nativeEvent.layout;
    node.layout = { x, y, w: width, h: height };
  }, [id]);

  return { ref, focusable: true, onFocus, onLayout, hasTVPreferredFocus: opts.hasTVPreferredFocus };
}

/**
 * Provider raiz: instala o TVEventHandler que traduz setas do D-Pad em
 * movimentos de foco espacial. Botão voltar (BACK) é repassado por callback.
 */
const FocusContext = createContext<{ move: (d: Direction) => void }>({ move: () => {} });

export function FocusProvider({
  children,
  onBack,
  onMenu,
}: {
  children: React.ReactNode;
  onBack?: () => void;
  onMenu?: () => void;
}) {
  const [ready, setReady] = useState(false);
  const backRef = useRef(onBack);
  const menuRef = useRef(onMenu);
  backRef.current = onBack;
  menuRef.current = onMenu;

  useEffect(() => {
    const handler = new TVEventHandler();
    handler.enable(null, (_cmp, evt) => {
      switch (evt && evt.eventType) {
        case 'up':
          moveFocus('up');
          break;
        case 'down':
          moveFocus('down');
          break;
        case 'left':
          moveFocus('left');
          break;
        case 'right':
          moveFocus('right');
          break;
        case 'back':
          backRef.current?.();
          break;
        case 'menu':
          menuRef.current?.();
          break;
        default:
          break;
      }
    });
    setReady(true);
    return () => {
      handler.disable();
    };
  }, []);

  return <FocusContext.Provider value={{ move: moveFocus }}>{children}</FocusContext.Provider>;
}

export function useFocusDirection() {
  return useContext(FocusContext);
}
