/**
 * Gerenciador de foco espacial para Android TV / TV Box (D-Pad).
 *
 * BLINDADO para Android AOSP (como Aquario):
 *  - O módulo TVEventHandler é carregado em tempo de execução (require tardio)
 *    e protegido por try/catch — em builds onde ele não existe, o app NÃO crasheia;
 *  - Cada chamada de foco é protegida (requestTVFocus pode não existir);
 *  - Se não houver TVEventHandler, o app segue com a navegação nativa do Android
 *    (setas movem entre views focáveis) e com o toque/OK funcionando.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { View, type ViewProps, type LayoutChangeEvent } from 'react-native';

interface FocusNode {
  id: string;
  ref: React.RefObject<View>;
  layout: { x: number; y: number; w: number; h: number } | null;
}

const registry = new Map<string, FocusNode>();
let lastFocusedId: string | null = null;

type Direction = 'up' | 'down' | 'left' | 'right';

/** Pede foco de forma segura (não existe em todos os builds/hardwares) */
function safeRequestFocus(node?: FocusNode | null) {
  try {
    const el = node && node.ref.current;
    if (el && typeof (el as any).requestTVFocus === 'function') {
      (el as any).requestTVFocus();
    }
  } catch {
    /* sem suporte a foco programático: ignora */
  }
}

/** Carrega o TVEventHandler com proteção total */
function getTVEventHandlerClass(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rn = require('react-native');
    const candidates = [rn.TVEventHandler, rn.default && rn.default.TVEventHandler];
    for (const T of candidates) {
      if (typeof T === 'function') return T;
    }
    return null;
  } catch {
    return null;
  }
}

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
    safeRequestFocus(nodes[0]);
    return;
  }

  await Promise.all(
    nodes
      .filter(n => !n.layout)
      .map(
        n =>
          new Promise<void>(resolve => {
            try {
              n.ref.current?.measureInWindow((x, y, w, h) => {
                n.layout = { x, y, w, h };
                resolve();
              });
            } catch {
              resolve();
            }
            setTimeout(resolve, 120);
          }),
      ),
  );

  let best: FocusNode | null = null;
  let bestDist = Infinity;
  for (const n of nodes) {
    if (n.id === current.id || !n.layout || !current.layout) continue;
    const d = distance(current.layout, n.layout, dir);
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }
  if (best && bestDist < Infinity) {
    safeRequestFocus(best);
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

export function useFocusable(id: string, opts: { hasTVPreferredFocus?: boolean } = {}): FocusApi {
  const ref = useRef<View>(null);

  useEffect(() => {
    const node: FocusNode = { id, ref, layout: null };
    register(node);
    if (opts.hasTVPreferredFocus) {
      const t = setTimeout(() => safeRequestFocus(node), 60);
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
  const backRef = useRef(onBack);
  const menuRef = useRef(onMenu);
  backRef.current = onBack;
  menuRef.current = onMenu;

  useEffect(() => {
    let handler: any = null;
    const T = getTVEventHandlerClass();
    if (!T) {
      // Sem suporte a eventos de TV (ex.: box AOSP): segue sem crash.
      return;
    }
    try {
      handler = new T();
      handler.enable(null, (_cmp: any, evt: any) => {
        const type = evt && evt.eventType;
        switch (type) {
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
            backRef.current && backRef.current();
            break;
          case 'menu':
            menuRef.current && menuRef.current();
            break;
          default:
            break;
        }
      });
    } catch {
      try {
        if (handler && typeof handler.disable === 'function') handler.disable();
      } catch {
        /* ignora */
      }
      handler = null;
    }
    return () => {
      try {
        if (handler && typeof handler.disable === 'function') handler.disable();
      } catch {
        /* ignora */
      }
    };
  }, []);

  return (
    <FocusContext.Provider value={{ move: moveFocus }}>{children}</FocusContext.Provider>
  );
}

export function useFocusDirection() {
  return useContext(FocusContext);
}
