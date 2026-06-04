import { useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useMatchStore } from "../../store/matchStore";
import { useAuthStore } from "../../store/authStore";
import colors from "../../constants/colors";

export default function TabsLayout() {
  const loadMatches = useMatchStore((state) => state.loadMatches);
  const matches = useMatchStore((state) => state.matches);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    loadMatches().catch(() => {});
  }, [loadMatches]);

  const unreadCount = matches.filter(
    (match) =>
      match.lastMessage &&
      !match.lastMessage.is_read &&
      match.lastMessage.sender_id !== user?.id
  ).length;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: Platform.OS === "ios" ? 0 : 4,
        },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#FFE8EC",
          borderTopWidth: 1,
          height: Platform.OS === "android" ? 65 : 85,
          paddingBottom: Platform.OS === "android" ? 8 : 20,
          paddingTop: 8,
          elevation: 10,
          shadowColor: "#FF4458",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarIcon: ({ color, focused }) => {
          const icons = {
            index: focused ? "flame" : "flame-outline",
            matches: focused ? "heart" : "heart-outline",
            chat: focused ? "chatbubble" : "chatbubble-outline",
            voiceRoom: focused ? "mic" : "mic-outline",
            profile: focused ? "person" : "person-outline",
          };
          return (
            <Ionicons name={icons[route.name] || "ellipse"} size={24} color={color} />
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Discover" }} />
      <Tabs.Screen name="matches" options={{ title: "Matches" }} />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen name="voiceRoom" options={{ title: "Rooms" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
