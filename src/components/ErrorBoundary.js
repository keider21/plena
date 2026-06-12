import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { reportCrash } from '../utils/crashReporter';
import { COLORS } from '../utils/theme';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Lo guardamos en AsyncStorage para que CrashScreen lo levante
    reportCrash(new Error(error?.message + '\n\nComponent stack:\n' + (info?.componentStack || '')), true);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.bg}>
          <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Algo se rompió al renderizar</Text>
            <Text style={styles.sub}>La app capturó el error y se lo mandó al reporte. Reabrí la app y vas a ver el detalle.</Text>
            <View style={styles.card}>
              <Text style={styles.code}>{String(this.state.error?.message || this.state.error)}</Text>
            </View>
            <TouchableOpacity onPress={() => this.setState({ error: null })} style={styles.btn}>
              <Text style={styles.btnText}>Reintentar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 24, paddingTop: 80 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  sub: { color: COLORS.textSub, fontSize: 13, marginTop: 8, lineHeight: 20 },
  card: { backgroundColor: COLORS.bg2, borderRadius: 12, padding: 14, marginTop: 16 },
  code: { color: COLORS.text, fontFamily: 'monospace', fontSize: 12 },
  btn: { backgroundColor: COLORS.purple, borderRadius: 12, padding: 14, marginTop: 16, alignItems: 'center' },
  btnText: { color: COLORS.text, fontWeight: '700' },
});
