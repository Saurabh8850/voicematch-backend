import { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet, Platform } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import colors from "../constants/colors";

function setupLocalNotifications() {
  try {
    const Notifications = require("expo-notifications");

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance?.MAX ?? 5,
        vibrationPattern: [0, 250, 250, 250],
      }).catch(() => {});
    }

    // Push token registration only in real builds (not Expo Go)
    if (Device.isDevice && Constants.appOwnership !== "expo") {
      // Reserved for production push setup — intentionally empty for now
    }
  } catch (error) {
    console.warn("[notifications] local setup skipped:", error?.message || error);
  }
}

export default function RootLayout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setupLocalNotifications();
    AsyncStorage.getItem("voicematch_token").finally(() => {
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <GestureHandlerRootView style={styles.flex}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F0F0F' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[matchId]" />
        <Stack.Screen name="call/[callId]" />
        <Stack.Screen name="premium" />
        <Stack.Screen name="voice-room" />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#0F0F0F',
  },
});
