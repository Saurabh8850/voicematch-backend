import { useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MessageListItem from "../../components/MessageListItem";
import { useMatchStore } from "../../store/matchStore";
import { useAuthStore } from "../../store/authStore";
import colors from "../../constants/colors";
import { getInitials } from "../../utils/user";

export default function MatchesScreen() {
  const { matches, isLoading, loadMatches, unmatch } = useMatchStore();
  const user = useAuthStore((state) => state.user);

  useFocusEffect(
    useCallback(() => {
      loadMatches().catch(() => {});
    }, [loadMatches])
  );

  const newMatches = useMemo(
    () =>
      matches
        .filter((m) => !m.lastMessage)
        .sort(
          (a, b) =>
            new Date(b.matchedAt || b.matched_at) - new Date(a.matchedAt || a.matched_at)
        )
        .slice(0, 12),
    [matches]
  );

  const messageMatches = useMemo(
    () =>
      [...matches]
        .filter((m) => m.lastMessage)
        .sort(
          (a, b) =>
            new Date(b.lastMessage?.created_at || b.matchedAt || b.matched_at) -
            new Date(a.lastMessage?.created_at || a.matchedAt || a.matched_at)
        ),
    [matches]
  );

  const allMatchesSorted = useMemo(
    () =>
      [...matches].sort(
        (a, b) =>
          new Date(b.lastMessage?.created_at || b.matchedAt || b.matched_at) -
          new Date(a.lastMessage?.created_at || a.matchedAt || a.matched_at)
      ),
    [matches]
  );

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

  const renderNewMatch = (item) => {
    const otherUser = item.otherUser;
    const photo = otherUser?.profile_photo_urls?.[0];

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.newMatch}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <View style={styles.newMatchRing}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.newMatchAvatar} />
          ) : (
            <View style={[styles.newMatchAvatar, styles.newMatchPlaceholder]}>
              <Text style={styles.newMatchInitials}>{getInitials(otherUser?.full_name)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.newMatchName} numberOfLines={1}>
          {(otherUser?.full_name || "Match").split(" ")[0]}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.title}>Matches</Text>

      {isLoading && matches.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={messageMatches.length > 0 ? messageMatches : allMatchesSorted}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <>
              {newMatches.length > 0 && (
                <View style={styles.newSection}>
                  <Text style={styles.sectionTitle}>New Matches</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {newMatches.map(renderNewMatch)}
                  </ScrollView>
                </View>
              )}
              <Text style={styles.sectionTitle}>Messages</Text>
            </>
          }
          renderItem={({ item }) => (
            <MessageListItem
              item={item}
              currentUserId={user?.id}
              avatarSize={50}
              onUnmatch={handleUnmatch}
            />
          )}
          ListEmptyComponent={
            matches.length === 0 ? (
              <View style={styles.center}>
                <Ionicons name="heart-outline" size={48} color={colors.primary} />
                <Text style={styles.emptyText}>No matches yet — keep swiping!</Text>
              </View>
            ) : (
              <View style={styles.center}>
                <Text style={styles.emptySub}>Your new matches are above. Start a conversation!</Text>
              </View>
            )
          }
          contentContainerStyle={matches.length === 0 ? styles.emptyContainer : undefined}
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
  newSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 4,
  },
  newMatch: {
    alignItems: "center",
    marginLeft: 20,
    width: 76,
  },
  newMatchRing: {
    padding: 3,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  newMatchAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  newMatchPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  newMatchInitials: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 20,
  },
  newMatchName: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    width: 76,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
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
  emptySub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
});
