import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { CATEGORIES, categoryColor } from '../utils/finance';

const BASE_GASTO = CATEGORIES.gasto;
const BASE_INGRESO = CATEGORIES.ingreso;

export default function SettingsScreen({ navigation }) {
  const store = useStore();
  const settings = store.settings || {};
  const customCats = settings.customGastoCategories || [];
  const customSubs = settings.customSubcategories || {};
  const customIncCats = settings.customIngresoCategories || [];
  const customIncSubs = settings.customIngresoSubcategories || {};
  const hiddenModules = settings.hiddenModules || [];

  const allCats = [...BASE_GASTO, ...customCats];

  const [addCatVisible, setAddCatVisible] = useState(false);
  const [addCatName, setAddCatName] = useState('');

  const [addIncCatVisible, setAddIncCatVisible] = useState(false);
  const [addIncCatName, setAddIncCatName] = useState('');

  const [addSubVisible, setAddSubVisible] = useState(false);
  const [addSubParent, setAddSubParent] = useState(null);
  const [addSubName, setAddSubName] = useState('');

  const [addIncSubVisible, setAddIncSubVisible] = useState(false);
  const [addIncSubParent, setAddIncSubParent] = useState(null);
  const [addIncSubName, setAddIncSubName] = useState('');

  const handleAddCategory = async () => {
    const name = addCatName.trim();
    if (!name) return;
    if (allCats.map(c => c.toLowerCase()).includes(name.toLowerCase())) {
      Alert.alert('Ya existe', 'Esta categoría ya está en la lista.');
      return;
    }
    await store.addGastoCategory(name.charAt(0).toUpperCase() + name.slice(1));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddCatName('');
    setAddCatVisible(false);
  };

  const handleDeleteCategory = (name) => {
    Alert.alert('Eliminar categoría', `¿Eliminar "${name}" y todas sus subcategorías?`, [
      { text: 'Cancelar' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await store.deleteGastoCategory(name);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      },
    ]);
  };

  const openAddSub = (parent) => {
    setAddSubParent(parent);
    setAddSubName('');
    setAddSubVisible(true);
  };

  const handleAddIncCategory = async () => {
    const name = addIncCatName.trim();
    if (!name) return;
    const all = [...BASE_INGRESO, ...customIncCats];
    if (all.map(c => c.toLowerCase()).includes(name.toLowerCase())) {
      Alert.alert('Ya existe', 'Esta categoría ya está en la lista.');
      return;
    }
    await store.addIngresoCategory(name.charAt(0).toUpperCase() + name.slice(1));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddIncCatName('');
    setAddIncCatVisible(false);
  };

  const handleDeleteIncCategory = (name) => {
    Alert.alert('Eliminar categoría', `¿Eliminar "${name}"?`, [
      { text: 'Cancelar' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await store.deleteIngresoCategory(name); } },
    ]);
  };

  const handleAddSub = async () => {
    const name = addSubName.trim();
    if (!name || !addSubParent) return;
    const existing = (customSubs[addSubParent] || []).map(s => s.toLowerCase());
    if (existing.includes(name.toLowerCase())) {
      Alert.alert('Ya existe', 'Esta subcategoría ya está en la lista.');
      return;
    }
    await store.addSubcategory(addSubParent, name.charAt(0).toUpperCase() + name.slice(1));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddSubName('');
    setAddSubVisible(false);
  };

  const handleDeleteSub = (parent, name) => {
    Alert.alert('Eliminar subcategoría', `¿Eliminar "${name}"?`, [
      { text: 'Cancelar' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await store.deleteSubcategory(parent, name);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
    ]);
  };

  const handleAddIncSub = async () => {
    const name = addIncSubName.trim();
    if (!name || !addIncSubParent) return;
    const existing = (customIncSubs[addIncSubParent] || []).map(s => s.toLowerCase());
    if (existing.includes(name.toLowerCase())) {
      Alert.alert('Ya existe', 'Esta subcategoría ya está en la lista.');
      return;
    }
    await store.addIngresoSubcategory(addIncSubParent, name.charAt(0).toUpperCase() + name.slice(1));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddIncSubName('');
    setAddIncSubVisible(false);
  };

  const handleDeleteIncSub = (parent, name) => {
    Alert.alert('Eliminar subcategoría', `¿Eliminar "${name}"?`, [
      { text: 'Cancelar' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await store.deleteIngresoSubcategory(parent, name); } },
    ]);
  };

  return (
    <View style={styles.bg}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ─── CATEGORÍAS DE GASTO ───────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="pricetag-outline" size={18} color={COLORS.purple} />
            </View>
            <Text style={styles.sectionTitle}>Categorías de gasto</Text>
            <TouchableOpacity onPress={() => { setAddCatName(''); setAddCatVisible(true); }} style={styles.addBtn}>
              <Ionicons name="add" size={20} color={COLORS.purpleLight} />
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            Toca <Ionicons name="chevron-forward" size={12} color={COLORS.textMuted} /> en una categoría para agregar subcategorías (ej. Transporte → Combustible, Taxi).
          </Text>

          {allCats.map((cat) => {
            const isBase = BASE_GASTO.includes(cat);
            const subs = customSubs[cat] || [];
            const color = categoryColor(cat);
            return (
              <View key={cat} style={styles.catBlock}>
                <View style={[styles.catRow]}>
                  <View style={[styles.catDot, { backgroundColor: color }]} />
                  <Text style={styles.catName}>{cat}</Text>
                  {subs.length > 0 && (
                    <View style={styles.subCount}>
                      <Text style={styles.subCountTxt}>{subs.length}</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => openAddSub(cat)} style={styles.catAction}>
                    <Ionicons name="add-circle-outline" size={22} color={COLORS.purpleLight} />
                  </TouchableOpacity>
                  {!isBase && (
                    <TouchableOpacity onPress={() => handleDeleteCategory(cat)} style={styles.catAction}>
                      <Ionicons name="trash-outline" size={20} color={COLORS.red} />
                    </TouchableOpacity>
                  )}
                </View>

                {subs.length > 0 && (
                  <View style={styles.subList}>
                    {subs.map((sub) => (
                      <View key={sub} style={styles.subRow}>
                        <View style={styles.subLine} />
                        <View style={[styles.subDot, { backgroundColor: color + '99' }]} />
                        <Text style={styles.subName}>{sub}</Text>
                        <TouchableOpacity onPress={() => handleDeleteSub(cat, sub)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ─── CATEGORÍAS DE INGRESO ────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: COLORS.greenDim }]}>
              <Ionicons name="arrow-down-circle-outline" size={18} color={COLORS.green} />
            </View>
            <Text style={styles.sectionTitle}>Categorías de ingreso</Text>
            <TouchableOpacity onPress={() => { setAddIncCatName(''); setAddIncCatVisible(true); }} style={[styles.addBtn, { backgroundColor: COLORS.greenDim }]}>
              <Ionicons name="add" size={20} color={COLORS.green} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            Agrega categorías y subcategorías para clasificar tus ingresos. Toca <Ionicons name="add-circle-outline" size={12} color={COLORS.textMuted} /> para agregar subcategorías (ej. Negocio → Taxi, Uber, Rappi).
          </Text>
          {[...BASE_INGRESO, ...customIncCats].map((cat) => {
            const isBase = BASE_INGRESO.includes(cat);
            const subs = customIncSubs[cat] || [];
            const color = categoryColor(cat);
            return (
              <View key={cat} style={styles.catBlock}>
                <View style={styles.catRow}>
                  <View style={[styles.catDot, { backgroundColor: color }]} />
                  <Text style={styles.catName}>{cat}</Text>
                  {subs.length > 0 && (
                    <View style={styles.subCount}>
                      <Text style={styles.subCountTxt}>{subs.length}</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => { setAddIncSubParent(cat); setAddIncSubName(''); setAddIncSubVisible(true); }} style={styles.catAction}>
                    <Ionicons name="add-circle-outline" size={22} color={COLORS.green} />
                  </TouchableOpacity>
                  {!isBase && (
                    <TouchableOpacity onPress={() => handleDeleteIncCategory(cat)} style={styles.catAction}>
                      <Ionicons name="trash-outline" size={20} color={COLORS.red} />
                    </TouchableOpacity>
                  )}
                </View>
                {subs.length > 0 && (
                  <View style={styles.subList}>
                    {subs.map((sub) => (
                      <View key={sub} style={styles.subRow}>
                        <View style={styles.subLine} />
                        <View style={[styles.subDot, { backgroundColor: color + '99' }]} />
                        <Text style={styles.subName}>{sub}</Text>
                        <TouchableOpacity onPress={() => handleDeleteIncSub(cat, sub)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ─── MÓDULOS VISIBLES ─────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: COLORS.bg3 }]}>
              <Ionicons name="eye-outline" size={18} color={COLORS.textSub} />
            </View>
            <Text style={styles.sectionTitle}>Módulos visibles</Text>
          </View>
          <Text style={styles.hint}>Elige qué secciones aparecen en la barra de navegación. Inicio y Perfil siempre están visibles.</Text>
          {[
            { name: 'Plan', icon: 'calendar-outline' },
            { name: 'Habitos', label: 'Hábitos', icon: 'refresh-circle-outline' },
            { name: 'Metas', icon: 'star-outline' },
            { name: 'Áreas', icon: 'git-branch-outline' },
            { name: 'Finanzas', icon: 'wallet-outline' },
            { name: 'IA', label: 'Asistente IA', icon: 'sparkles-outline' },
          ].map(({ name, label, icon }) => {
            const isHidden = hiddenModules.includes(name);
            return (
              <View key={name} style={styles.moduleRow}>
                <View style={[styles.sectionIconWrap, { backgroundColor: isHidden ? COLORS.bg3 : COLORS.purpleDim }]}>
                  <Ionicons name={icon} size={16} color={isHidden ? COLORS.textMuted : COLORS.purpleLight} />
                </View>
                <Text style={[styles.catName, { opacity: isHidden ? 0.5 : 1 }]}>{label || name}</Text>
                <Switch
                  value={!isHidden}
                  onValueChange={async (val) => {
                    const next = val
                      ? hiddenModules.filter(m => m !== name)
                      : [...hiddenModules, name];
                    await store.updateSettings({ hiddenModules: next });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  trackColor={{ false: COLORS.bg3, true: COLORS.purpleDim }}
                  thumbColor={!isHidden ? COLORS.purpleLight : COLORS.textMuted}
                />
              </View>
            );
          })}
        </View>

        {/* ─── SUGERENCIAS ──────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="bulb-outline" size={18} color={COLORS.amber} />
            </View>
            <Text style={styles.sectionTitle}>Ideas de subcategorías</Text>
          </View>
          {[
            { parent: 'Transporte', subs: ['Combustible', 'Taxi/Bici', 'Bus/Metro', 'Peaje', 'Estacionamiento'] },
            { parent: 'Servicios', subs: ['Agua', 'Luz', 'Internet', 'Gas', 'Cable/TV'] },
            { parent: 'Alimentación', subs: ['Supermercado', 'Restaurante', 'Delivery', 'Snacks'] },
            { parent: 'Entretenimiento', subs: ['Streaming', 'Cine', 'Juegos', 'Salidas'] },
            { parent: 'Salud', subs: ['Farmacia', 'Doctor', 'Gimnasio', 'Seguro'] },
          ].map(({ parent, subs }) => (
            <View key={parent} style={styles.suggestionCard}>
              <Text style={[styles.suggestionParent, { color: categoryColor(parent) }]}>{parent}</Text>
              <View style={styles.suggestionChips}>
                {subs.map(sub => {
                  const alreadyAdded = (customSubs[parent] || []).includes(sub);
                  return (
                    <TouchableOpacity
                      key={sub}
                      style={[styles.chip, alreadyAdded && styles.chipAdded]}
                      onPress={async () => {
                        if (alreadyAdded) return;
                        await store.addSubcategory(parent, sub);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      disabled={alreadyAdded}
                    >
                      {alreadyAdded
                        ? <Ionicons name="checkmark" size={12} color={COLORS.green} />
                        : <Ionicons name="add" size={12} color={COLORS.purpleLight} />}
                      <Text style={[styles.chipTxt, alreadyAdded && styles.chipTxtAdded]}>{sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── MODAL: nueva categoría ────────────────────── */}
      <Modal visible={addCatVisible} transparent animationType="slide" onRequestClose={() => setAddCatVisible(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setAddCatVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Nueva categoría</Text>
            <TextInput
              style={styles.sheetInput}
              value={addCatName}
              onChangeText={setAddCatName}
              placeholder="Ej: Mascotas, Viajes..."
              placeholderTextColor={COLORS.textMuted}
              autoFocus
              onSubmitEditing={handleAddCategory}
            />
            <View style={styles.sheetBtns}>
              <TouchableOpacity style={styles.sheetCancel} onPress={() => setAddCatVisible(false)}>
                <Text style={styles.sheetCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetConfirm} onPress={handleAddCategory}>
                <Text style={styles.sheetConfirmTxt}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── MODAL: nueva categoría de ingreso ──────────────── */}
      <Modal visible={addIncCatVisible} transparent animationType="slide" onRequestClose={() => setAddIncCatVisible(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setAddIncCatVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Nueva categoría de ingreso</Text>
            <TextInput
              style={styles.sheetInput}
              value={addIncCatName}
              onChangeText={setAddIncCatName}
              placeholder="Ej: Taxi, Arriendo, Comisiones..."
              placeholderTextColor={COLORS.textMuted}
              autoFocus
              onSubmitEditing={handleAddIncCategory}
            />
            <View style={styles.sheetBtns}>
              <TouchableOpacity style={styles.sheetCancel} onPress={() => setAddIncCatVisible(false)}>
                <Text style={styles.sheetCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetConfirm, { backgroundColor: COLORS.green }]} onPress={handleAddIncCategory}>
                <Text style={styles.sheetConfirmTxt}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── MODAL: nueva subcategoría (gasto) ──────────── */}
      <Modal visible={addSubVisible} transparent animationType="slide" onRequestClose={() => setAddSubVisible(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setAddSubVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Subcategoría en <Text style={{ color: addSubParent ? categoryColor(addSubParent) : COLORS.purpleLight }}>{addSubParent}</Text></Text>
            <TextInput
              style={styles.sheetInput}
              value={addSubName}
              onChangeText={setAddSubName}
              placeholder="Ej: Combustible, Taxi..."
              placeholderTextColor={COLORS.textMuted}
              autoFocus
              onSubmitEditing={handleAddSub}
            />
            <View style={styles.sheetBtns}>
              <TouchableOpacity style={styles.sheetCancel} onPress={() => setAddSubVisible(false)}>
                <Text style={styles.sheetCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetConfirm} onPress={handleAddSub}>
                <Text style={styles.sheetConfirmTxt}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── MODAL: nueva subcategoría (ingreso) ─────────── */}
      <Modal visible={addIncSubVisible} transparent animationType="slide" onRequestClose={() => setAddIncSubVisible(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setAddIncSubVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Subcategoría en <Text style={{ color: addIncSubParent ? categoryColor(addIncSubParent) : COLORS.green }}>{addIncSubParent}</Text></Text>
            <TextInput
              style={styles.sheetInput}
              value={addIncSubName}
              onChangeText={setAddIncSubName}
              placeholder="Ej: Uber, Rappi, Comisión..."
              placeholderTextColor={COLORS.textMuted}
              autoFocus
              onSubmitEditing={handleAddIncSub}
            />
            <View style={styles.sheetBtns}>
              <TouchableOpacity style={styles.sheetCancel} onPress={() => setAddIncSubVisible(false)}>
                <Text style={styles.sheetCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetConfirm, { backgroundColor: COLORS.green }]} onPress={handleAddIncSub}>
                <Text style={styles.sheetConfirmTxt}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.bg3, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  content: { padding: 16 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },
  addBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.purpleDim, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 12, color: COLORS.textMuted, marginBottom: 12, lineHeight: 18 },
  catBlock: { marginBottom: 4, backgroundColor: COLORS.card, borderRadius: 14, overflow: 'hidden', borderWidth: 0.5, borderColor: COLORS.cardBorder },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13 },
  catDot: { width: 12, height: 12, borderRadius: 6 },
  catName: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  subCount: { backgroundColor: COLORS.purpleDim, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  subCountTxt: { fontSize: 11, color: COLORS.purpleLight, fontWeight: '700' },
  catAction: { padding: 4 },
  subList: { borderTopWidth: 0.5, borderColor: COLORS.cardBorder, paddingVertical: 6 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8 },
  subLine: { width: 2, height: 16, backgroundColor: COLORS.cardBorder, borderRadius: 1, marginLeft: 4 },
  subDot: { width: 8, height: 8, borderRadius: 4 },
  subName: { flex: 1, fontSize: 14, color: COLORS.textSub },
  suggestionCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  suggestionParent: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  suggestionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.purpleDim, borderWidth: 0.5, borderColor: COLORS.purple + '55' },
  chipAdded: { backgroundColor: COLORS.greenDim || '#10B98122', borderColor: COLORS.green + '55' },
  chipTxt: { fontSize: 13, color: COLORS.purpleLight },
  chipTxtAdded: { color: COLORS.green },
  moduleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 4 },
  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, gap: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  sheetInput: { backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: COLORS.text, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  sheetBtns: { flexDirection: 'row', gap: 10 },
  sheetCancel: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: COLORS.card, alignItems: 'center' },
  sheetCancelTxt: { color: COLORS.textSub, fontSize: 15, fontWeight: '600' },
  sheetConfirm: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: COLORS.purple, alignItems: 'center' },
  sheetConfirmTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
