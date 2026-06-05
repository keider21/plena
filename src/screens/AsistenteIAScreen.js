import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

const EXAMPLES = [
  'Agrega un gasto de S/100 en mi tarjeta BCP para pañales',
  'Programa una cita médica mañana a las 4 PM',
  'Transfiere S/50 de Yape a efectivo',
];

const WELCOME = {
  from: 'ia',
  text: 'Hola 👋 Soy tu asistente. Pronto podrás pedirme cosas como registrar gastos, programar citas o transferir dinero, y yo lo haré por ti. Por ahora estoy en construcción 🛠️',
};

export default function AsistenteIAScreen() {
  const [messages, setMessages] = useState([WELCOME]);
  const [text, setText] = useState('');
  const scrollRef = useRef(null);

  const send = (msg) => {
    const t = (msg ?? text).trim();
    if (!t) return;
    setMessages((m) => [
      ...m,
      { from: 'user', text: t },
      { from: 'ia', text: 'Entendí tu mensaje. Aún estoy aprendiendo a ejecutar acciones dentro de la app — esa parte llega en una próxima versión. 🚧' },
    ]);
    setText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const voice = () => Alert.alert('Voz en desarrollo', 'El dictado por voz necesita un módulo nativo. Lo activaremos con un development build más adelante.');

  return (
    <View style={styles.bg}>
      <LinearGradient colors={['#1A0A3E', '#0D0D1A']} style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}><Ionicons name="sparkles" size={20} color="#fff" /></View>
          <View>
            <Text style={styles.heroTitle}>Asistente IA</Text>
            <Text style={styles.heroSub}>Tu copiloto dentro de Vida Plena</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.chat} showsVerticalScrollIndicator={false}>
          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.from === 'user' ? styles.bubbleUser : styles.bubbleIA]}>
              <Text style={[styles.bubbleText, m.from === 'user' && { color: '#fff' }]}>{m.text}</Text>
            </View>
          ))}

          {messages.length <= 1 && (
            <View style={styles.examples}>
              <Text style={styles.examplesTitle}>Prueba con:</Text>
              {EXAMPLES.map((ex) => (
                <TouchableOpacity key={ex} style={styles.exChip} onPress={() => setText(ex)}>
                  <Ionicons name="arrow-up-circle-outline" size={16} color={COLORS.purpleLight} />
                  <Text style={styles.exText}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.micBtn} onPress={voice}><Ionicons name="mic-outline" size={22} color={COLORS.purpleLight} /></TouchableOpacity>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={COLORS.textMuted}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => send()}><Ionicons name="send" size={18} color="#fff" /></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  hero: { padding: 20, paddingTop: 54, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  heroSub: { fontSize: 12, color: COLORS.purpleLight, marginTop: 2 },
  chat: { padding: 16, gap: 10, paddingBottom: 20 },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 12 },
  bubbleIA: { backgroundColor: COLORS.card, alignSelf: 'flex-start', borderWidth: 0.5, borderColor: COLORS.cardBorder },
  bubbleUser: { backgroundColor: COLORS.purple, alignSelf: 'flex-end' },
  bubbleText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  examples: { marginTop: 16, gap: 8 },
  examplesTitle: { fontSize: 12, color: COLORS.textSub, marginBottom: 2 },
  exChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.bg2, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  exText: { flex: 1, fontSize: 13, color: COLORS.textSub },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.bg2, borderTopWidth: 0.5, borderTopColor: COLORS.cardBorder },
  micBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.cardBorder },
  input: { flex: 1, maxHeight: 110, backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: COLORS.text, fontSize: 15, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  sendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
});
