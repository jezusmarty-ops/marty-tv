/**
 * Tela de erro elegante — o app nunca crasha por fonte fora do ar:
 * mostra o que falhou e oferece re-tentar ou seguir com o catálogo.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius, fontSize } from '../theme/theme';
import { useFocusable } from '../navigation/focusManager';

interface Props {
  title?: string;
  message?: string;
  warnings?: string[];
  onRetry: () => void;
  onBack?: () => void;
}

export default function ErrorScreen({
  title = 'Não foi possível carregar tudo',
  message = 'Algumas fontes estão fora do ar. O que já foi carregado continua disponível.',
  warnings = [],
  onRetry,
  onBack,
}: Props) {
  const retry = useFocusable('err-retry', { hasTVPreferredFocus: true });
  const back = useFocusable('err-back');

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📡</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {warnings.length > 0 && (
        <View style={styles.warnBox}>
          {warnings.slice(0, 5).map(w => (
            <Text key={w} style={styles.warnLine} numberOfLines={1}>
              • {w}
            </Text>
          ))}
        </View>
      )}
      <Pressable
        ref={retry.ref}
        focusable
        onFocus={retry.onFocus}
        onPress={onRetry}
        style={({ focused }) => [styles.btn, styles.btnPrimary, focused && styles.btnFocused]}
      >
        <Text style={styles.btnText}>🔄 Tentar novamente</Text>
      </Pressable>
      {onBack && (
        <Pressable
          ref={back.ref}
          focusable
          onFocus={back.onFocus}
          onPress={onBack}
          style={({ focused }) => [styles.btn, focused && styles.btnFocused]}
        >
          <Text style={styles.btnText}>Continuar assim mesmo</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
  icon: { fontSize: 56, marginBottom: spacing.md },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    color: colors.muted,
    fontSize: fontSize.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 640,
  },
  warnBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    maxWidth: 640,
    alignSelf: 'stretch',
    marginHorizontal: spacing.lg,
  },
  warnLine: { color: colors.muted, fontSize: 12, marginVertical: 2 },
  btn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
  },
  btnPrimary: { borderColor: colors.crimson },
  btnFocused: { backgroundColor: colors.crimson, borderColor: colors.crimson },
  btnText: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
