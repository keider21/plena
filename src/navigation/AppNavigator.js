import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

import DashboardScreen from '../screens/DashboardScreen';
import PlanningScreen from '../screens/PlanningScreen';
import PlanningWizard from '../screens/PlanningWizard';
import CalendarScreen from '../screens/CalendarScreen';
import HabitosScreen from '../screens/HabitosScreen';
import MetasScreen from '../screens/MetasScreen';
import AreasScreen from '../screens/AreasScreen';
import AsistenteIAScreen from '../screens/AsistenteIAScreen';
import GoalAssistant from '../screens/GoalAssistant';
import GoalDetail from '../screens/GoalDetail';
import FinanzasScreen from '../screens/FinanzasScreen';
import CardCalendar from '../screens/CardCalendar';
import MentalidadScreen from '../screens/MentalidadScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TAB_ITEMS = [
  { name: 'Inicio', component: DashboardScreen, icon: 'home-outline', iconActive: 'home' },
  { name: 'Plan', component: PlanningScreen, icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'Habitos', component: HabitosScreen, icon: 'refresh-circle-outline', iconActive: 'refresh-circle' },
  { name: 'Metas', component: MetasScreen, icon: 'star-outline', iconActive: 'star' },
  { name: 'Áreas', component: AreasScreen, icon: 'git-branch-outline', iconActive: 'git-branch' },
  { name: 'Finanzas', component: FinanzasScreen, icon: 'wallet-outline', iconActive: 'wallet' },
  { name: 'IA', component: AsistenteIAScreen, icon: 'sparkles-outline', iconActive: 'sparkles' },
];

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.purpleLight,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, focused, size }) => {
          const item = TAB_ITEMS.find(t => t.name === route.name);
          return (
            <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
              <Ionicons
                name={focused ? item.iconActive : item.icon}
                size={focused ? 22 : 20}
                color={color}
              />
            </View>
          );
        },
      })}
    >
      {TAB_ITEMS.map(item => (
        <Tab.Screen key={item.name} name={item.name} component={item.component} />
      ))}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="PlanningWizard" component={PlanningWizard} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="GoalAssistant" component={GoalAssistant} />
      <Stack.Screen name="GoalDetail" component={GoalDetail} />
      <Stack.Screen name="CardCalendar" component={CardCalendar} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.bg2,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.cardBorder,
    paddingBottom: 6,
    paddingTop: 6,
    height: 62,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  tabIconWrap: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabIconActive: {
    backgroundColor: COLORS.purpleDim,
  },
});
