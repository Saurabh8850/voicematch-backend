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
  1: { scale: 0.95, translateY: 8, opacity: 0.7 },
  2: { scale: 0.9, translateY: 16, opacity: 0.4 },
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
        opacity: 1,
      }
    : {
        transform: [{ scale: behind.scale }, { translateY: behind.translateY }],
        zIndex: 30 - stackIndex,
        opacity: behind.opacity,
      };

  const cardContent = (
    <Animated.View style={[styles.card, animatedStyle]}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
      ) : (
        <LinearGradient colors={colors.gradientPrimary} style={styles.photo}>
          <Text style={styles.initials}>{getInitials(displayName)}</Text>
        </LinearGradient>
      )}

      <LinearGradient colors={colors.gradientCard} style={styles.gradient} />

      {user?.voice_intro_url ? (
        <TouchableOpacity style={styles.voiceButton} activeOpacity={0.85}>
          <Ionicons name="mic" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}

      <Text style={styles.name}>
        {displayName}
        {age != null ? `, ${age}` : ""}
      </Text>
      <Text style={styles.location}>
        📍 {distance != null ? `${distance} km away` : user?.location_label || "Nearby"}
      </Text>
      <Text style={styles.bio} numberOfLines={2}>
        {user?.bio || "Say hi with a voice intro!"}
      </Text>
      <View style={styles.tagsRow}>
        {interests.slice(0, 4).map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      {isTop && (
        <>
          <Animated.View style={[styles.likeOverlay, { opacity: likeOpacity }]} pointerEvents="none">
            <LinearGradient
              colors={["rgba(76,175,80,0.6)", "transparent"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.likeStampText}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.nopeOverlay, { opacity: nopeOpacity }]} pointerEvents="none">
            <LinearGradient
              colors={["transparent", "rgba(255,68,88,0.6)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
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
      <Animated.View {...panResponder.panHandlers} style={styles.slot} pointerEvents="box-none">
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
    borderRadius: 24,
    backgroundColor: colors.card,
    overflow: "hidden",
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
    height: "50%",
  },
  voiceButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: "center",
    justifyContent: "center",
  },
  hiddenPlayer: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: "800",
    position: 'absolute',
    bottom: 100,
    left: 20,
  },
  location: {
    color: '#FFFFFF',
    fontSize: 14,
    position: 'absolute',
    bottom: 78,
    left: 20,
  },
  bio: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    position: 'absolute',
    bottom: 56,
    left: 20,
    right: 20,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: "600",
  },
  likeOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingLeft: 24,
  },
  likeStampText: {
    color: '#4CAF50',
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 4,
    transform: [{ rotate: "-15deg" }],
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  nopeOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 24,
  },
  nopeStampText: {
    color: '#FF4458',
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 4,
    transform: [{ rotate: "15deg" }],
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
