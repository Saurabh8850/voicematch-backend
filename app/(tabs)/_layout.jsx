import { useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
