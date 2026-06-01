import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../constants/colors";
import * as api from "../../services/api";

const { width, height } = Dimensions.get("window");

export default function MatchProfileScreen() {
  const { matchId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const loadMatch = async () => {
    try {
      setLoading(true);
      const res = await api.getMatch(matchId);
      setMatch(res?.data?.match || res?.match);
    } catch (e) {
      console.log("Error loading match:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const otherUser = match?.otherUser;
  const photo = otherUser?.profile_photo_urls?.[0];
  const photos = otherUser?.profile_photo_urls || [];

  // Parse interests from bio
  const interests =
    otherUser?.bio?.split("|").map((s) => s.trim()).filter(Boolean) || [];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Main Photo - Full width */}
        <View style={styles.mainPhotoContainer}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.mainPhoto} />
          ) : (
            <LinearGradient
              colors={["#FF4458", "#FF6B7A"]}
              style={styles.mainPhoto}
            >
              <Text style={styles.photoInitial}>
                {(otherUser?.full_name || "U")[0].toUpperCase()}
              </Text>
            </LinearGradient>
          )}

          {/* Gradient overlay */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.4)"]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Action buttons row - overlapping photo */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.passActionBtn}>
            <Ionicons name="close" size={28} color="#FF4458" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.messageActionBtn}
            onPress={() => router.push(`/chat/${matchId}`)}
          >
            <LinearGradient
              colors={["#FF4458", "#FF2D55"]}
              style={styles.messageGradient}
            >
              <Ionicons name="heart" size={32} color="white" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.superActionBtn}>
            <Ionicons name="star" size={28} color="#9B59B6" />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.infoSection}>
          {/* Name + Age */}
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {otherUser?.full_name || "User"}, {otherUser?.age || ""}
            </Text>
            <TouchableOpacity onPress={() => router.push(`/chat/${matchId}`)}>
              <Ionicons
                name="paper-plane-outline"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Location */}
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Location</Text>
            <View style={styles.locationRow}>
              <Text style={styles.infoValue}>Nearby</Text>
              <View style={styles.distanceBadge}>
                <Ionicons name="location" size={12} color={colors.primary} />
                <Text style={styles.distanceText}>~1km</Text>
              </View>
            </View>
          </View>

          {/* About */}
          {otherUser?.bio && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>About</Text>
              <Text style={styles.bioText}>{otherUser.bio}</Text>
              {otherUser.bio.length > 100 && (
                <TouchableOpacity>
                  <Text style={styles.readMore}>Read more</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Interests</Text>
              <View style={styles.interestGrid}>
                {interests.map((interest, i) => (
                  <View
                    key={i}
                    style={[
                      styles.interestTag,
                      i < 2 && styles.interestTagSelected,
                    ]}
                  >
                    {i < 2 && (
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color={colors.primary}
                      />
                    )}
                    <Text
                      style={[
                        styles.interestText,
                        i < 2 && styles.interestTextSelected,
                      ]}
                    >
                      {interest}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Gallery */}
          {photos.length > 1 && (
            <View style={styles.infoCard}>
              <View style={styles.galleryHeader}>
                <Text style={styles.infoLabel}>Gallery</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.galleryGrid}>
                {photos.slice(1, 7).map((photoUri, i) => (
                  <Image
                    key={i}
                    source={{ uri: photoUri }}
                    style={styles.galleryPhoto}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA - Message Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.messageBtn}
          onPress={() => router.push(`/chat/${matchId}`)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#FF4458", "#FF2D55"]}
            style={styles.messageBtnGradient}
          >
            <Ionicons name="chatbubble" size={20} color="white" />
            <Text style={styles.messageBtnText}>Send Message</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

  mainPhotoContainer: { width, height: height * 0.55 },
  mainPhoto: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    alignItems: "center",
    justifyContent: "center",
  },
  photoInitial: { fontSize: 80, fontWeight: "bold", color: "white" },

  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    marginTop: -28,
    paddingHorizontal: 32,
    zIndex: 10,
  },
  passActionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  messageActionBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  messageGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  superActionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },

  infoSection: { padding: 20 },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  name: { fontSize: 26, fontWeight: "bold", color: colors.text },

  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoValue: { fontSize: 16, color: colors.text, fontWeight: "500" },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF0F3",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  distanceText: { fontSize: 13, color: colors.primary, fontWeight: "600" },

  bioText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  readMore: { color: colors.primary, fontWeight: "600", marginTop: 4 },

  interestGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  interestTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  interestTagSelected: {
    backgroundColor: "#FFF0F3",
    borderColor: colors.primary,
  },
  interestText: { fontSize: 14, color: colors.textSecondary },
  interestTextSelected: { color: colors.primary, fontWeight: "600" },

  galleryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAll: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  galleryPhoto: {
    width: (width - 80) / 3,
    height: (width - 80) / 3,
    borderRadius: 12,
  },

  bottomBar: {
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  messageBtn: {
    borderRadius: 30,
    overflow: "hidden",
  },
  messageBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  messageBtnText: { color: "white", fontSize: 17, fontWeight: "bold" },
});
