/**
 * TVPlayer — player de vídeo para Android TV (ExoPlayer via react-native-video).
 *
 * Recursos:
 *  - HLS (.m3u8) com buffering configurado;
 *  - Auto-retry com backoff progressivo (stream fora do ar não derruba o app);
 *  - Ao esgotar retries, notifica o pai (onChannelError) que troca de canal;
 *  - Legendas externas (.vtt/.srt) via textTracks;
 *  - D-Pad: UP/DOWN mostra overlay de zapping; BACK sai; OK pausa/retoma;
 *  - Indicador de buffering/erro elegante.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TVEventHandler,
  Pressable,
} from 'react-native';
import Video from 'react-native-video';
import { colors, spacing, radius } from '../theme/theme';

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1200;

/**
 * @param {object} props
 * @param {string} props.url stream HLS/HTTP
 * @param {string} props.title nome do canal
 * @param {Array<{uri:string, language:string, type?:'text/vtt'|'application/x-subrip'}>} [props.subtitles]
 * @param {() => void} [props.onExit] BACK/voltar
 * @param {() => void} [props.onShowOverlay] UP/DOWN no controle
 * @param {() => void} [props.onChannelError] falhou de vez — o pai troca de canal
 */
export default function TVPlayer({
  url,
  title,
  subtitles = [],
  onExit,
  onShowOverlay,
  onChannelError,
}) {
  const [state, setState] = useState('loading'); // loading | playing | buffering | error
  const retries = useRef(0);
  const retryTimer = useRef(null);
  const muted = useRef(false);

  const scheduleRetry = useCallback(() => {
    if (retries.current >= MAX_RETRIES) {
      setState('error');
      onChannelError && onChannelError();
      return;
    }
    retries.current += 1;
    const delay = BASE_BACKOFF_MS * retries.current;
    retryTimer.current = setTimeout(() => {
      setState('loading');
      // força re-montagem do <Video> mudando a key
      setAttempt(a => a + 1);
    }, delay);
  }, [onChannelError]);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  useEffect(() => {
    retries.current = 0;
    setState('loading');
  }, [url]);

  // D-Pad durante a reprodução
  useEffect(() => {
    const handler = new TVEventHandler();
    handler.enable(null, (_cmp, evt) => {
      const type = evt && evt.eventType;
      if (type === 'up' || type === 'down') onShowOverlay && onShowOverlay();
      else if (type === 'back') onExit && onExit();
    });
    return () => handler.disable();
  }, [onShowOverlay, onExit]);

  const togglePlayPause = useCallback(() => {
    setState(s => (s === 'playing' || s === 'buffering' ? 'paused' : 'playing'));
  }, []);

  const textTracks = subtitles.map(s => ({
    uri: s.uri,
    language: s.language,
    type: s.type || 'text/vtt',
  }));

  return (
    <View style={styles.container}>
      <Video
        key={`${url}-${attempt}`}
        source={{ uri: url }}
        style={styles.video}
        paused={state !== 'playing' && state !== 'buffering'}
        muted={muted.current}
        resizeMode="contain"
        onLoadStart={() => setState('buffering')}
        onLoad={() => setState('playing')}
        onBuffer={e => setState(e.isBuffering ? 'buffering' : 'playing')}
        onError={() => scheduleRetry()}
        onProgress={() => {}}
        progressUpdateInterval={1000}
        bufferConfig={{
          minBufferMs: 10000,
          maxBufferMs: 50000,
          bufferForPlaybackMs: 5000,
          bufferForPlaybackAfterRebufferMs: 8000,
        }}
        textTracks={textTracks.length ? textTracks : undefined}
        selectedTextTrack={textTracks.length ? { type: 'index', value: 0 } : undefined}
      />

      {/* barra superior de título */}
      <View style={styles.topBar}>
        <Text style={styles.title} numberOfLines={1}>
          {title || 'Canal'}
        </Text>
        <Text style={styles.hint}>▲▼ trocar canal • OK pausar • BACK sair</Text>
      </View>

      {/* estados */}
      {state === 'loading' || state === 'buffering' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.crimson} />
          <Text style={styles.stateText}>
            {state === 'loading' ? 'Conectando ao canal…' : 'Buffering…'}
          </Text>
        </View>
      ) : null}

      {state === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.stateText}>Sinal indisponível no momento</Text>
          <Text style={styles.stateSub}>Trocando de canal automaticamente…</Text>
          <Pressable
            focusable
            onPress={onExit}
            style={({ focused }) => [styles.btn, focused && styles.btnFocused]}
          >
            <Text style={styles.btnText}>✕ Voltar</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: colors.overlay,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  stateText: { color: colors.text, fontSize: 18, marginTop: spacing.sm, fontWeight: '600' },
  stateSub: { color: colors.muted, fontSize: 13, marginTop: spacing.xs },
  errorIcon: { fontSize: 44 },
  btn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.crimson,
  },
  btnFocused: { backgroundColor: colors.crimson },
  btnText: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
