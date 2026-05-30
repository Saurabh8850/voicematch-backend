import { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../constants/colors";
import { getInitials } from "../utils/user";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AVATAR_SIZE = 120;

export default function MatchAnimation({
  visible,
  currentUser,
  matchedUser,
  onMessage,
  onKeepSwiping,
}) {
  const leftAnim = useRef(new Animated.Value(-SCREEN_WIDTH)).current;
  const rightAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      leftAnim.setValue(-SCREEN_WIDTH);
      rightAnim.setValue(SCREEN_WIDTH);
      heartScale.setValue(0);
      heartOpacity.setValue(0);
      contentOpacity.setValue(0);
      return;
    }

    Animated.sequence([
      Animated.parallel([
        Animated.spring(leftAnim, {
          toValue: -AVATAR_SIZE / 2 - 8,
          useNativeDriver: true,
          friction: 7,
          tension: 50,
        }),
        Animated.spring(rightAnim, {
          toValue: AVATAR_SIZE / 2 + 8,
          useNativeDriver: true,
          friction: 7,
          tension: 50,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(heartScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 4,
        }),
        Animated.timing(heartOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.loop(
        Animated.sequence([
          Animated.timing(heartScale, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(heartScale, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, [visible, leftAnim, rightAnim, heartScale, heartOpacity, contentOpacity]);

  const currentPhoto = currentUser?.profile_photo_urls?.[0];
  const matchedPhoto = matchedUser?.profile_photo_urls?.[0];
  const matchedName = matchedUser?.full_name || matchedUser?.name || "your match";

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={{ opacity: contentOpacity, alignItems: "center", width: "100%" }}>
          <Text style={styles.title}>It&apos;s a Match! 💕</Text>

          <View style={styles.photosStage}>
            <Animated.View style={[styles.avatarWrap, { transform: [{ translateX: leftAnim }] }]}>
              {currentPhoto ? (
                <Image source={{ uri: currentPhoto }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.initials}>{getInitials(currentUser?.full_name)}</Text>
                </View>
              )}
            </Animated.View>

            <Animated.View
              style={[
                styles.heartWrap,
                {
                  opacity: heartOpacity,
                  transform: [{ scale: heartScale }],
                },
              ]}
            >
              <Ionicons name="heart" size={44} color={colors.primary} />
            </Animated.View>

            <Animated.View style={[styles.avatarWrap, { transform: [{ translateX: rightAnim }] }]}>
              {matchedPhoto ? (
                <Image source={{ uri: matchedPhoto }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.initials}>{getInitials(matchedName)}</Text>
                </View>
              )}
            </Animated.View>
          </View>

          <Text style={styles.subtitle}>You and {matchedName} liked each other</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryButton} onPress={onMessage} activeOpacity={0.9}>
              <Text style={styles.primaryButtonText}>Send Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={onKeepSwiping} activeOpacity={0.9}>
              <Text style={styles.secondaryButtonText}>Keep Swiping</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    color: colors.gold,
    marginBottom: 36,
    textAlign: "center",
    textShadowColor: "rgba(255,215,0,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  photosStage: {
    width: SCREEN_WIDTH - 48,
    height: AVATAR_SIZE + 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  avatarWrap: {
    position: "absolute",
    zIndex: 2,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
    borderColor: colors.text,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.text,
  },
  heartWrap: {
    position: "absolute",
    zIndex: 3,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  subtitle: {
    color: colors.text,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 36,
    paddingHorizontal: 16,
  },
  actions: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    width: "100%",
  },
  primaryButtonText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    width: "100%",
    backgroundColor: "transparent",
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
});
