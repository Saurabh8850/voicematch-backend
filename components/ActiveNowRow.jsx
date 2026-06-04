import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { router } from "expo-router";
import colors from "../constants/colors";
import { getInitials } from "../utils/user";

export default function ActiveNowRow({ matches, currentUserId, title = "Active Now" }) {
  if (!matches.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {matches.map((item) => {
          const otherUser = item.otherUser;
          const photo = otherUser?.profile_photo_urls?.[0];
          const unread =
            item.lastMessage &&
            !item.lastMessage.is_read &&
            item.lastMessage.sender_id !== currentUserId;

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.story}
              onPress={() => router.push(`/chat/${item.id}`)}
            >
              <View style={[styles.ring, unread && styles.ringUnread]}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.placeholder]}>
                    <Text style={styles.initials}>{getInitials(otherUser?.full_name)}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {(otherUser?.full_name || "User").split(" ")[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 14,
  },
  story: {
    alignItems: "center",
    width: 72,
  },
  ring: {
    padding: 3,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.border,
  },
  ringUnread: {
    borderColor: colors.primary,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  placeholder: {
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 18,
  },
  name: {
    marginTop: 6,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "center",
    width: 72,
  },
});
