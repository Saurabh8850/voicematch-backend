import { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet, Platform, BackHandler } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import colors from "../constants/colors";

const SCREEN_BG = colors.background;

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

    const backAction = () => {
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      return false;
    };
    
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );
    
    return () => backHandler.remove();
  }, []);

  if (checking) {
    return (
      <GestureHandlerRootView style={styles.flex}>
        <SafeAreaProvider>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: SCREEN_BG },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/otp" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)/basic-info" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)/photos" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)/voice-intro" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen 
            name="chat/[matchId]" 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="voice-room/index" 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="voice-room/call" 
            options={{ headerShown: false }} 
          />
          <Stack.Screen
            name="match-profile/[matchId]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="premium"
            options={{ headerShown: false }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SCREEN_BG,
  },
});
