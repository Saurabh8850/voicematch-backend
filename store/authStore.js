import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      isLoading: false,

      login: async (token, user) => {
        await AsyncStorage.setItem("voicematch_token", token);
        set({ token, user, isLoggedIn: true, isLoading: false });
      },

      logout: async () => {
        await AsyncStorage.multiRemove([
          "voicematch_token",
          "voicematch-auth-store",
          "voicematch_notification_prefs",
        ]);
        set({ user: null, token: null, isLoggedIn: false, isLoading: false });
        router.replace("/(auth)/login");
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : state.user,
        })),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "voicematch-auth-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);
