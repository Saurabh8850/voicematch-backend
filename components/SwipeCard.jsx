import { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  PanResponder,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import VoicePlayer from "./VoicePlayer";
import colors from "../constants/colors";
import { getAge, getInitials, getInterests } from "../utils/user";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const CARD_WIDTH = SCREEN_WIDTH - 32;
export const CARD_HEIGHT = SCREEN_HEIGHT * 0.72;
const SWIPE_THRESHOLD = 120;

const STACK_BEHIND = {
  1: { scale: 0.95, translateY: 10 },
  2: { scale: 0.9, translateY: 20 },
};

export default function SwipeCard({
  user,
  isTop,
  stackIndex = 0,
  onSwipeLeft,
  onSwipeRight,
}) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [user?.id, pan]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        isTop && (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5),
      onPanResponderMove: (_, gesture) => {
        pan.setValue({ x: gesture.dx, y: gesture.dy * 0.15 });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          onSwipeRight?.();
          return;
        }
        if (gesture.dx < -SWIPE_THRESHOLD) {
          onSwipeLeft?.();
          return;
        }
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
          friction: 6,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
          friction: 6,
        }).start();
      },
    })
  ).current;

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-12deg", "0deg", "12deg"],
    extrapolate: "clamp",
  });

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = pan.x.interpolate({
    inputRange: [-100, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const displayName = user?.full_name || user?.name || "Unknown";
  const photoUrl = user?.profile_photo_urls?.[0];
  const age = getAge(user);
  const interests = getInterests(user);
  const distance = user?.distance_km;

  const behind = STACK_BEHIND[stackIndex] || STACK_BEHIND[2];

  const animatedStyle = isTop
    ? {
        transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
        zIndex: 30,
      }
    : {
        transform: [{ scale: behind.scale }, { translateY: behind.translateY }],
        zIndex: 30 - stackIndex,
      };

  const cardContent = (
    <Animated.View style={[styles.card, animatedStyle]}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
      ) : (
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.photo}>
          <Text style={styles.initials}>{getInitials(displayName)}</Text>
        </LinearGradient>
      )}

      <LinearGradient
        colors={[colors.transparent, "rgba(0,0,0,0.4)", "rgba(0,0,0,0.92)"]}
        style={styles.gradient}
      />

      {distance != null && (
        <View style={styles.distanceBadge}>
          <Ionicons name="location" size={12} color={colors.text} />
          <Text style={styles.distanceText}>{distance} km away</Text>
        </View>
      )}

      {user?.voice_intro_url ? (
        <TouchableOpacity style={styles.voiceButton} activeOpacity={0.85}>
          <Ionicons name="mic" size={20} color={colors.text} />
        </TouchableOpacity>
      ) : null}

      <View style={styles.info}>
        <Text style={styles.name}>
          {displayName}
          {age != null ? `, ${age}` : ""}
        </Text>
        <Text style={styles.location}>{user?.location_label || "Nearby"}</Text>
        <Text style={styles.bio} numberOfLines={2}>
          {user?.bio || "Say hi with a voice intro!"}
        </Text>
        <View style={styles.tagsRow}>
          {interests.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      {isTop && (
        <>
          <Animated.View style={[styles.likeStamp, { opacity: likeOpacity }]} pointerEvents="none">
            <Ionicons name="heart" size={32} color={colors.success} />
            <Text style={styles.likeStampText}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.nopeStamp, { opacity: nopeOpacity }]} pointerEvents="none">
            <Ionicons name="close" size={32} color={colors.primary} />
            <Text style={styles.nopeStampText}>NOPE</Text>
          </Animated.View>
        </>
      )}

      {isTop && user?.voice_intro_url && (
        <View style={styles.hiddenPlayer}>
          <VoicePlayer audioUrl={user.voice_intro_url} size="small" />
        </View>
      )}
    </Animated.View>
  );

  if (isTop) {
    return (
      <Animated.View
        {...panResponder.panHandlers}
        style={styles.slot}
        pointerEvents="box-none"
      >
        {cardContent}
      </Animated.View>
    );
  }

  return (
    <View style={styles.slot} pointerEvents="none">
      {cardContent}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT,
    alignItems: "center",
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    backgroundColor: colors.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  photo: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 72,
    fontWeight: "800",
    color: colors.text,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
  },
  distanceBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  distanceText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  voiceButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,68,88,0.75)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  hiddenPlayer: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  info: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 80,
  },
  name: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  location: {
    color: colors.text,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bio: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  tagText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  likeStamp: {
    position: "absolute",
    top: 48,
    left: 24,
    transform: [{ rotate: "-18deg" }],
    alignItems: "center",
    borderWidth: 4,
    borderColor: colors.success,
    borderRadius: 8,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  likeStampText: {
    color: colors.success,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
  },
  nopeStamp: {
    position: "absolute",
    top: 48,
    right: 24,
    transform: [{ rotate: "18deg" }],
    alignItems: "center",
    borderWidth: 4,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  nopeStampText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
  },
});
