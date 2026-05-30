import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ActiveNowRow from "../../components/ActiveNowRow";
import MessageListItem from "../../components/MessageListItem";
import { useMatchStore } from "../../store/matchStore";
import { useAuthStore } from "../../store/authStore";
import colors from "../../constants/colors";

export default function ChatListScreen() {
  const { matches, isLoading, loadMatches, unmatch } = useMatchStore();
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadMatches().catch(() => {});
  }, [loadMatches]);

  const sortedMatches = useMemo(
    () =>
      [...matches].sort(
        (a, b) =>
          new Date(b.lastMessage?.created_at || b.matched_at) -
          new Date(a.lastMessage?.created_at || a.matched_at)
      ),
    [matches]
  );

  const activeMatches = useMemo(() => sortedMatches.slice(0, 12), [sortedMatches]);

  const filteredMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return sortedMatches;
    }
    return sortedMatches.filter((match) =>
      match.otherUser?.full_name?.toLowerCase().includes(query)
    );
  }, [sortedMatches, search]);

  const onRefresh = useCallback(() => {
    loadMatches().catch(() => {});
  }, [loadMatches]);

  const handleUnmatch = async (matchId) => {
    try {
      await unmatch(matchId);
    } catch (error) {
      Alert.alert("Error", error.message || "Could not unmatch");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.title}>Messages</Text>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading && matches.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredMatches}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            activeMatches.length > 0 ? (
              <ActiveNowRow
                matches={activeMatches}
                currentUserId={user?.id}
                title="Active Now"
              />
            ) : null
          }
          renderItem={({ item }) => (
            <MessageListItem
              item={item}
              currentUserId={user?.id}
              avatarSize={56}
              onUnmatch={handleUnmatch}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="chatbubble-outline" size={48} color={colors.primary} />
              <Text style={styles.emptyText}>
                {search ? "No conversations found" : "No conversations yet. Match and say hi!"}
              </Text>
            </View>
          }
          contentContainerStyle={filteredMatches.length === 0 ? styles.emptyContainer : undefined}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
