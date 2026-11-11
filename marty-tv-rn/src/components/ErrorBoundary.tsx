/**
 * ErrorBoundary — captura qualquer erro de renderização JS e mostra na tela
 * (em vez de fechar o app mudo). É o "caixa-preta" do diagnóstico remoto:
 * se o crash for JS, a TV passa a exibir a mensagem exata.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, fontSize } from '../theme/theme';

interface State {
  error: Error | null;
  info: string | null;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    try {
      console.error('MARTYTV_CRASH', error, info);
    } catch {
      /* log pode falhar em release */
    }
    this.setState({ info: info && info.componentStack ? info.componentStack : null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Ocorreu um erro</Text>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.errorText} selectable>
            {String(this.state.error)}
          </Text>
          {this.state.info ? (
            <Text style={styles.stack} selectable>
              {this.state.info}
            </Text>
          ) : null}
        </ScrollView>
        <Text style={styles.hint}>
          Tire uma foto desta tela e envie — ela mostra exatamente o que quebrou.
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  icon: { fontSize: 48, marginBottom: spacing.sm },
  title: { color: colors.crimson, fontSize: 24, fontWeight: '800', marginBottom: spacing.md },
  scroll: { flexGrow: 0, maxHeight: 420, width: '100%' },
  scrollContent: { padding: spacing.md },
  errorText: {
    color: colors.text,
    fontSize: fontSize.body,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
  },
  stack: {
    color: colors.muted,
    fontSize: 11,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
  },
  hint: {
    color: colors.muted,
    fontSize: fontSize.caption,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
