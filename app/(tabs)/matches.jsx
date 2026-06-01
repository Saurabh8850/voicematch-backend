import React, { useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMatchStore } from "../../store/matchStore";
import { useAuthStore } from "../../store/authStore";
import colors from "../../constants/colors";
import * as api from "../../services/api";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const { matches, loadMatches } = useMatchStore();
  const { user } = useAuthStore(); // kept for parity with existing stores (unused)

  useFocusEffect(
    useCallback(() => {
      loadMatches().catch(() => {});
    }, [loadMatches])
  );

  const handleLike = async (matchId) => {
    router.push(`/chat/${matchId}`);
  };

  const handlePass = async (matchId) => {
    await api.unmatch(matchId);
    loadMatches().catch(() => {});
  };

  const handleOpenProfile = (match) => {
    router.push(`/match-profile/${match.id}`);
  };

  const renderMatch = useCallback(
    ({ item }) => {
      const otherUser = item.otherUser;
      const photo = otherUser?.profile_photo_urls?.[0];

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleOpenProfile(item)}
          activeOpacity={0.9}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={styles.cardPhoto} />
          ) : (
            <LinearGradient
              colors={["#FF4458", "#FF6B7A"]}
              style={styles.cardPhoto}
            >
              <Text style={styles.cardInitial}>
                {(otherUser?.full_name || "U")[0].toUpperCase()}
              </Text>
            </LinearGradient>
          )}

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            style={styles.cardGradient}
          />

          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>
              {otherUser?.full_name?.split(" ")[0] || "User"}, {otherUser?.age || ""}
            </Text>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.passBtn} onPress={() => handlePass(item.id)}>
              <Ionicons name="close" size={18} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.likeBtn} onPress={() => handleLike(item.id)}>
              <Ionicons name="heart" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [loadMatches]
  );

  const today = useMemo(() => new Date().toDateString(), []);
  const todayMatches = useMemo(
    () =>
      matches.filter(
        (m) => new Date(m.matchedAt || m.matched_at).toDateString() === today
      ),
    [matches, today]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Matches</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{matches.length}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        This is a list of people who liked you and your matches.
      </Text>

      {matches.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={64} color={colors.primary} />
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySubtitle}>Keep swiping to find your match!</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() =>
            todayMatches.length > 0 ? (
              <Text style={styles.dateLabel}>Today</Text>
            ) : null
          }
          renderItem={renderMatch}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  title: { fontSize: 28, fontWeight: "bold", color: colors.text },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: { color: "white", fontWeight: "bold", fontSize: 14 },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 12,
  },
  grid: { paddingHorizontal: 16, paddingBottom: 100 },
  row: { justifyContent: "space-between", marginBottom: 16 },

  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.card,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardPhoto: {
    width: "100%",
    height: "100%",
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInitial: { fontSize: 48, fontWeight: "bold", color: "white" },
  cardGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
  cardInfo: {
    position: "absolute",
    bottom: 48,
    left: 12,
    right: 12,
  },
  cardName: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  cardActions: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  passBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  likeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyTitle: { fontSize: 22, fontWeight: "bold", color: colors.text },
  emptySubtitle: { fontSize: 15, color: colors.textSecondary },
});
