import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeModules, NativeEventEmitter } from 'react-native';
import { COLORS, NEOM } from '../utils/theme';
import { formatMoney } from '../utils/currency';
import { useStore } from '../store/useStore';

const { width } = Dimensions.get('window');
const { FullScreenNotif } = NativeModules;

export default function PaymentBanner() {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState(null);
  const anim = useRef(new Animated.Value(-150)).current;
  const { addTransaction, finance } = useStore();

  useEffect(() => {
    if (!FullScreenNotif) return;
    const eventEmitter = new NativeEventEmitter(FullScreenNotif);
    const sub = eventEmitter.addListener('onPaymentNotification', (payload) => {
      setData(payload);
      show();
    });
    return () => sub.remove();
  }, []);

  const show = () => {
    setVisible(true);
    Animated.spring(anim, {
      toValue: 20,
      useNativeDriver: true,
      friction: 8,
    }).start();

    // Auto-hide after 15 seconds
    setTimeout(hide, 15000);
  };

  const hide = () => {
    Animated.timing(anim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  const onConfirm = async () => {
    if (!data) return;
    // Intentar encontrar una cuenta vinculada a Yape o BCP
    const yapeAcc = (finance?.accounts || []).find(a =>
      a.type === 'yape' || a.name.toLowerCase().includes('yape')
    );
    const bcpAcc = (finance?.accounts || []).find(a =>
      a.type === 'bcp' || a.name.toLowerCase().includes('bcp')
    );
    const accountId = yapeAcc?.id || bcpAcc?.id || finance?.accounts?.[0]?.id;

    await addTransaction({
      type: 'gasto',
      amount: data.amount,
      accountId,
      category: 'Otros',
      note: `Pago detectado: ${data.sender || 'Yape/Plin'}`,
      date: new Date().toISOString().split('T')[0]
    });
    hide();
  };

  if (!visible || !data) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: anim }] }]}>
      <View style={styles.content}>
        <View style={styles.iconBox}>
          <Ionicons name="cash" size={24} color={COLORS.purple} />
        </View>
        <View style={styles.textBox}>
          <Text style={styles.title}>Pago detectado</Text>
          <Text style={styles.desc}>
            <Text style={styles.bold}>{formatMoney(data.amount, 'PEN')}</Text> de {data.sender}
          </Text>
        </View>
        <TouchableOpacity style={styles.btn} onPress={onConfirm}>
          <Text style={styles.btnText}>Anotar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.close} onPress={hide}>
          <Ionicons name="close" size={20} color={COLORS.textDim} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    zIndex: 9999,
    backgroundColor: COLORS.bg2,
    borderRadius: 16,
    padding: 16,
    ...NEOM.shadow,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textBox: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  desc: {
    color: COLORS.textDim,
    fontSize: 13,
    marginTop: 2,
  },
  bold: {
    color: COLORS.purpleLight,
    fontWeight: 'bold',
  },
  btn: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  btnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  close: {
    padding: 4,
    marginLeft: 8,
  },
});
