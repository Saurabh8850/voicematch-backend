import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import VoicePlayer from "../../components/VoicePlayer";
import VoiceRecorder from "../../components/VoiceRecorder";
import IcebreakerModal from "../../components/IcebreakerModal";
import BackHeader from "../../components/BackHeader";
import { useChatStore } from "../../store/chatStore";
import { useMatchStore } from "../../store/matchStore";
import { useAuthStore } from "../../store/authStore";
import * as api from "../../services/api";
import { subscribeToMessages } from "../../services/realtime";
import colors from "../../constants/colors";
import { getInitials, isUserOnline, timeAgo } from "../../utils/user";

const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

function formatMessageTime(dateString) {
  if (!dateString) {
    return "";
  }
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function VoiceMessageBubble({ message, isOwn }) {
  const audioUrl = message.media_url || message.voice_url;
  const BubbleWrapper = isOwn ? LinearGradient : View;
  const bubbleProps = isOwn
    ? {
        colors: colors.gradientButton,
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
        style: styles.ownBubble,
      }
    : { style: styles.otherBubble };

  return (
    <BubbleWrapper {...bubbleProps}>
      <VoicePlayer audioUrl={audioUrl} size="small" />
      <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
        Voice message
      </Text>
    </BubbleWrapper>
  );
}

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  const { messages, isLoading, loadMessages, addMessage, sendMessage } = useChatStore();
  const updateLastMessage = useMatchStore((state) => state.updateLastMessage);

  const [match, setMatch] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [icebreakerVisible, setIcebreakerVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [reactionTarget, setReactionTarget] = useState(null);
  const [reactions, setReactions] = useState({});
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const matchMessages = messages[matchId] || [];
  const otherUser =
    match?.otherUser ||
    match?.users?.find((item) => item.id !== user?.id) ||
    match?.users?.[0];
  const otherOnline = isUserOnline(otherUser);
  const otherPhoto = otherUser?.profile_photo_urls?.[0];

  const scrollToLatest = () => {
    listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
  };

  useEffect(() => {
    if (!matchId) {
      return undefined;
    }

    const init = async () => {
      try {
        const matchResponse = await api.getMatch(matchId);
        const matchData = matchResponse.data?.match || null;
        setMatch(matchData);
        await loadMessages(matchId);
        await api.markRead(matchId);
        setTimeout(() => inputRef.current?.focus(), 350);
      } catch (error) {
        Alert.alert("Error", error.message || "Failed to load chat");
      }
    };

    init();

    const unsubscribe = subscribeToMessages(matchId, (message) => {
      addMessage(matchId, message);
      updateLastMessage(matchId, message);
      if (message.sender_id !== user?.id) {
        api.markRead(matchId).catch(() => {});
      }
      setTimeout(scrollToLatest, 50);
    });

    return () => {
      unsubscribe();
    };
  }, [matchId, loadMessages, addMessage, updateLastMessage, user?.id]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) {
      return;
    }

    setSending(true);
    try {
      const message = await sendMessage(matchId, content);
      if (message) {
        updateLastMessage(matchId, message);
      }
      setInput("");
      setTimeout(scrollToLatest, 100);
    } catch (error) {
      Alert.alert("Send failed", error.message || "Could not send message");
    } finally {
      setSending(false);
    }
  };

  const handleVoiceComplete = async (uri) => {
    setUploadingVoice(true);
    try {
      const formData = new FormData();
      formData.append("voice", {
        uri,
        name: `voice-${Date.now()}.m4a`,
        type: "audio/m4a",
      });
      const response = await api.sendVoiceMessage(matchId, formData);
      const message = response.data?.message;
      if (message) {
        addMessage(matchId, message);
        updateLastMessage(matchId, message);
      }
    } catch (error) {
      Alert.alert("Upload failed", error.message || "Could not send voice message");
    } finally {
      setUploadingVoice(false);
    }
  };

  const handleCall = async () => {
    if (!otherUser?.id) {
      return;
    }
    try {
      const response = await api.initiateCall(otherUser.id);
      const data = response.data;
      router.push({
        pathname: `/call/${data.callId}`,
        params: {
          channel: data.channel,
          token: data.callerToken,
          otherUser: JSON.stringify(otherUser),
        },
      });
    } catch (error) {
      Alert.alert("Call failed", error.message || "Could not start call");
    }
  };

  const applyReaction = (emoji) => {
    if (!reactionTarget) {
      return;
    }
    setReactions((prev) => ({ ...prev, [reactionTarget.id]: emoji }));
    setReactionTarget(null);
  };

  const renderMessage = ({ item }) => {
    const isOwn = item.sender_id === user?.id;
    const isVoice = item.message_type === "voice";
    const reaction = reactions[item.id];

    return (
      <Pressable
        onLongPress={() => setReactionTarget(item)}
        delayLongPress={280}
        style={[styles.messageRow, isOwn ? styles.ownRow : styles.otherRow]}
      >
        {!isOwn &&
          (otherPhoto ? (
            <Image source={{ uri: otherPhoto }} style={styles.msgAvatar} />
          ) : (
            <View style={[styles.msgAvatar, styles.msgAvatarPlaceholder]}>
              <Text style={styles.msgAvatarInitials}>{getInitials(otherUser?.full_name)}</Text>
            </View>
          ))}

        <View style={styles.bubbleCol}>
          {isVoice ? (
            <VoiceMessageBubble message={item} isOwn={isOwn} />
          ) : isOwn ? (
            <LinearGradient
              colors={colors.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ownBubble}
            >
              <Text style={[styles.messageText, styles.ownText]}>{item.content}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.otherBubble}>
              <Text style={[styles.messageText, styles.otherText]}>{item.content}</Text>
            </View>
          )}
          {reaction ? <Text style={styles.reactionBadge}>{reaction}</Text> : null}
          <Text style={styles.timestamp}>{formatMessageTime(item.created_at)}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <BackHeader 
        title={otherUser?.full_name || 'Chat'} 
        rightComponent={
          <TouchableOpacity onPress={handleCall}>
            <Ionicons name="call-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {isLoading && matchMessages.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={matchMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToLatest}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Start the conversation!</Text>
            </View>
          }
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={styles.inputBar}>
          <TouchableOpacity onPress={() => setIcebreakerVisible(true)} style={styles.iconButton} activeOpacity={0.8}>
            <Text style={styles.sparkle}>✨</Text>
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            autoFocus
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />

          <Pressable
            onPressIn={() => setIsRecording(true)}
            onPressOut={() => setIsRecording(false)}
            style={styles.iconButton}
          >
            {uploadingVoice ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Ionicons name="mic" size={22} color={colors.textSecondary} />
            )}
          </Pressable>

          <TouchableOpacity onPress={handleSend} disabled={sending} activeOpacity={0.8}>
            <LinearGradient colors={colors.gradientButton} style={styles.sendButton}>
              <Ionicons name="arrow-up" size={20} color={colors.text} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <VoiceRecorder
        isRecording={isRecording}
        onRecordingChange={setIsRecording}
        onRecordComplete={handleVoiceComplete}
      />

      <IcebreakerModal
        visible={icebreakerVisible}
        matchId={matchId}
        onSelect={(suggestion) => setInput(suggestion)}
        onClose={() => setIcebreakerVisible(false)}
      />

      <Modal transparent visible={Boolean(reactionTarget)} animationType="fade">
        <Pressable style={styles.reactionOverlay} onPress={() => setReactionTarget(null)}>
          <View style={styles.reactionBar}>
            {REACTIONS.map((emoji) => (
              <TouchableOpacity key={emoji} onPress={() => applyReaction(emoji)}>
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE8EC',
    backgroundColor: '#FFFFFF',
  },
  headerButton: {
    padding: 8,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 4,
  },
  headerAvatarPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarInitials: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  headerCenter: {
    flex: 1,
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: '#1A1A2E',
  },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.online,
  },
  onlineText: {
    fontSize: 12,
    color: colors.online,
    fontWeight: "600",
  },
  sparkle: {
    fontSize: 20,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    color: '#666666',
    fontSize: 15,
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  messageRow: {
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  ownRow: {
    justifyContent: "flex-end",
  },
  otherRow: {
    justifyContent: "flex-start",
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  msgAvatarPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  msgAvatarInitials: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  bubbleCol: {
    maxWidth: "78%",
  },
  ownBubble: {
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  otherBubble: {
    backgroundColor: '#FFF0F3',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownText: {
    color: colors.text,
  },
  otherText: {
    color: '#1A1A2E',
  },
  timestamp: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  reactionBadge: {
    fontSize: 16,
    marginTop: 2,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#FFE8EC',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#1A1A2E',
    backgroundColor: '#FFF5F7',
    borderWidth: 1,
    borderColor: '#FFE8EC',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  reactionOverlay: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: "center",
    alignItems: "center",
  },
  reactionBar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionEmoji: {
    fontSize: 28,
    paddingHorizontal: 4,
  },
});
