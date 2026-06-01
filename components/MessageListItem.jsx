import { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Alert,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import colors from "../constants/colors";
import { getInitials, isUserOnline, timeAgo } from "../utils/user";

export default function MessageListItem({
  item,
  currentUserId,
  avatarSize = 56,
  onUnmatch,
}) {
  const swipeRef = useRef(null);

  const otherUser = item.otherUser;
  const photo = otherUser?.profile_photo_urls?.[0];
  const unread =
    item.lastMessage &&
    !item.lastMessage.is_read &&
    item.lastMessage.sender_id !== currentUserId;
  const unreadCount = unread ? 1 : 0;
  const online = isUserOnline(otherUser);

  const msgType = item.lastMessage?.message_type || item.lastMessage?.type;
  const preview =
    item.lastMessage?.content ||
    (msgType === "voice" ? "🎙️ Voice message" : "Say hello 👋");

  const handleUnmatch = () => {
    swipeRef.current?.close();
    Alert.alert("Unmatch", `Remove ${otherUser?.full_name || "this match"}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unmatch",
        style: "destructive",
        onPress: () => onUnmatch?.(item.id),
      },
    ]);
  };

  const renderRightActions = (_progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: "clamp",
    });
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={handleUnmatch} activeOpacity={0.8}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash" size={22} color={colors.text} />
          <Text style={styles.deleteText}>Unmatch</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.8}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <View style={styles.avatarWrap}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={[
                styles.avatar,
                { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
              ]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarPlaceholder,
                { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
              ]}
            >
              <Text style={styles.initials}>{getInitials(otherUser?.full_name)}</Text>
            </View>
          )}
          {online && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.middle}>
          <Text style={styles.name}>{otherUser?.full_name || "Match"}</Text>
          <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
            {preview}
          </Text>
        </View>

        <View style={styles.right}>
          <Text style={styles.time}>
            {timeAgo(item.lastMessage?.created_at || item.matched_at)}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 80,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
  },
  avatarWrap: {
    marginRight: 14,
  },
  avatar: {
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarPlaceholder: {
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 18,
  },
  onlineDot: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.background,
  },
  middle: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  preview: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  previewUnread: {
    color: colors.text,
    fontWeight: "600",
  },
  right: {
    alignItems: "flex-end",
    minWidth: 40,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  deleteAction: {
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    width: 90,
  },
  deleteText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
});
