import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import SwipeCard, { CARD_HEIGHT } from "../../components/SwipeCard";
import MatchAnimation from "../../components/MatchAnimation";
import { useSwipeStore } from "../../store/swipeStore";
import { useMatchStore } from "../../store/matchStore";
import { useAuthStore } from "../../store/authStore";
import colors from "../../constants/colors";

export default function Discover() {
  const { feedUsers, isLoading, loadFeed, swipeAction } = useSwipeStore();
  const loadMatches = useMatchStore((state) => state.loadMatches);
  const addMatch = useMatchStore((state) => state.addMatch);
  const user = useAuthStore((state) => state.user);
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  const [matchId, setMatchId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadFeed().catch((error) => {
      Alert.alert("Error", error.message || "Failed to load feed");
    });
  }, [loadFeed]);

  const handleSwipe = async (direction) => {
    const currentUser = feedUsers[0];
    if (!currentUser || actionLoading) {
      return;
    }

    setActionLoading(true);
    try {
      const result = await swipeAction(currentUser.id, direction);

      if (result?.matched) {
        setMatchedUser(currentUser);
        setMatchId(result.matchId);
        setShowMatchAnimation(true);

        addMatch({
          id: result.matchId,
          matchedAt: new Date().toISOString(),
          otherUser: currentUser,
          lastMessage: null,
        });
        loadMatches().catch(() => {});
      }
    } catch (error) {
      Alert.alert("Swipe failed", error.message || "Could not complete swipe");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = () => {
    const id = matchId;
    setShowMatchAnimation(false);
    if (id) {
      router.push(`/chat/${id}`);
    }
  };

  const handleKeepSwiping = () => {
    setShowMatchAnimation(false);
    setMatchedUser(null);
  };

  const visibleUsers = feedUsers.slice(0, 3);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <Text style={styles.logo}>VoiceMatch</Text>
        <View style={styles.topIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/(tabs)/profile")}>
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardArea}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : visibleUsers.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="people-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No more profiles</Text>
            <Text style={styles.emptySub}>Check back later for new voices</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={() => loadFeed()}>
              <Ionicons name="refresh" size={18} color={colors.text} />
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardStack}>
            {visibleUsers
              .slice()
              .reverse()
              .map((feedUser, index, array) => {
                const isTop = index === array.length - 1;
                const stackIndex = array.length - 1 - index;
                return (
                  <SwipeCard
                    key={feedUser.id}
                    user={feedUser}
                    isTop={isTop}
                    stackIndex={stackIndex}
                    onSwipeLeft={() => handleSwipe("pass")}
                    onSwipeRight={() => handleSwipe("like")}
                  />
                );
              })}
          </View>
        )}
      </View>

      {visibleUsers.length > 0 && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.passBtn}
            onPress={() => handleSwipe("pass")}
            disabled={actionLoading}
          >
            <Ionicons name="close" size={30} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.starBtn}
            onPress={() => handleSwipe("superlike")}
            disabled={actionLoading}
          >
            <Ionicons name="star" size={28} color={colors.gold} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.likeBtn}
            onPress={() => handleSwipe("like")}
            disabled={actionLoading}
          >
            <Ionicons name="heart" size={32} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.voiceRoomFab} onPress={() => router.push("/voice-room")}>
        <Ionicons name="mic" size={20} color={colors.text} />
        <Text style={styles.voiceRoomText}>Voice Room</Text>
      </TouchableOpacity>

      <MatchAnimation
        visible={showMatchAnimation}
        currentUser={user}
        matchedUser={matchedUser}
        onMessage={handleSendMessage}
        onKeepSwiping={handleKeepSwiping}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  logo: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: -0.5,
  },
  topIcons: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    padding: 6,
  },
  cardArea: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 8,
  },
  cardStack: {
    position: "relative",
    height: CARD_HEIGHT,
    marginHorizontal: 16,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 20,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshText: {
    color: colors.text,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingBottom: 100,
    paddingTop: 16,
    marginTop: "auto",
  },
  passBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  starBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  likeBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  voiceRoomFab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  voiceRoomText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
});
