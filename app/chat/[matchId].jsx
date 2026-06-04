import { useEffect, useMemo, useRef, useState } from "react";
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
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import VoicePlayer from "../../components/VoicePlayer";
import VoiceRecorder from "../../components/VoiceRecorder";
import IcebreakerModal from "../../components/IcebreakerModal";

import { useChatStore } from "../../store/chatStore";
import { useMatchStore } from "../../store/matchStore";
import { useAuthStore } from "../../store/authStore";

import * as api from "../../services/api";
import { subscribeToMessages } from "../../services/realtime";

import colors from "../../constants/colors";
import { getInitials, isUserOnline } from "../../utils/user";

const REACTIONS = ["❤️", "😂", "😮", "😢", "👍"];

function formatMessageTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dayKey(dateString) {
  if (!dateString) return "unknown";
  const d = new Date(dateString);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function isSameDay(a, b) {
  return dayKey(a) === dayKey(b);
}

function Tick({ kind }) {
  const color =
    kind === "read" ? "#2F7DFF" : kind === "sent" ? "#B0B0B0" : "#A9A9A9";

  const name =
    kind === "sent" ? "checkmark" : kind === "delivered" ? "double-check" : "double-check";

  return (
    <Ionicons
      name={name}
      size={16}
      color={color}
      style={{ marginLeft: 6, transform: [{ translateY: 1 }] }}
    />
  );
}

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = loop(dot1, 0);
    const a2 = loop(dot2, 120);
    const a3 = loop(dot3, 240);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    };
  }, [dot1, dot2, dot3]);

  const makeStyle = (v) => ({
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
    transform: [
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
    ],
  });

  return (
    <View style={styles.typingWrap}>
      <Animated.View style={[styles.typingDot, makeStyle(dot1)]} />
      <Animated.View style={[styles.typingDot, makeStyle(dot2)]} />
      <Animated.View style={[styles.typingDot, makeStyle(dot3)]} />
    </View>
  );
}

function EmojiPicker({ onPick, onClose }) {
  return (
    <Modal transparent visible animationType="fade">
      <Pressable style={styles.reactionOverlay} onPress={onClose}>
        <View style={styles.emojiPicker}>
          {REACTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => onPick(emoji)}
              activeOpacity={0.9}
              style={styles.emojiBtn}
            >
              <Text style={styles.emojiTxt}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

function VoiceBubble({ message, isOwn }) {
  const audioUrl = message.media_url || message.voice_url;

  if (isOwn) {
    return (
      <LinearGradient
        colors={["#FF4458", "#FF6B7A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.voiceBubbleOwn}
      >
        <VoicePlayer audioUrl={audioUrl} size="small" />
      </LinearGradient>
    );
  }

  return <View style={styles.voiceBubbleOther}><VoicePlayer audioUrl={audioUrl} size="small" /></View>;
}

function WaveBars({ active }) {
  const b1 = useRef(new Animated.Value(0.35)).current;
  const b2 = useRef(new Animated.Value(0.35)).current;
  const b3 = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (!active) {
      b1.setValue(0.35);
      b2.setValue(0.35);
      b3.setValue(0.35);
      return;
    }

    const anim = Animated.loop(
      Animated.stagger(
        120,
        [
          Animated.timing(b1, {
            toValue: 1,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(b2, {
            toValue: 1,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(b3, {
            toValue: 1,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]
      )
    );

    anim.start();
    return () => anim.stop();
  }, [active, b1, b2, b3]);

  const bar = (v, idx) => ({
    height: v.interpolate({ inputRange: [0.35, 1], outputRange: [6, 16] }),
    width: 4,
    borderRadius: 6,
    backgroundColor: idx === 1 ? "#FF4A59" : "#FF6B7A",
    opacity: 0.95,
  });

  return (
    <View style={styles.waveWrap} pointerEvents="none">
      <Animated.View style={bar(b1, 0)} />
      <Animated.View style={bar(b2, 1)} />
      <Animated.View style={bar(b3, 2)} />
    </View>
  );
}

function dateSeparatorLabel(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
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

  const [otherTyping, setOtherTyping] = useState(false);

  const inputRef = useRef(null);
  const listRef = useRef(null);

  const matchMessages = messages[matchId] || [];

  const otherUser =
    match?.otherUser ||
    match?.users?.find((item) => item.id !== user?.id) ||
    match?.users?.[0];

  const otherOnline = isUserOnline(otherUser);
  const otherPhoto = otherUser?.profile_photo_urls?.[0];

  const scrollToLatest = () => listRef.current?.scrollToOffset?.({ offset: 0, animated: true });

  useEffect(() => {
    if (!matchId) return undefined;

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

    return () => unsubscribe();
  }, [matchId, loadMessages, addMessage, updateLastMessage, user?.id]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      const message = await sendMessage(matchId, content);
      if (message) updateLastMessage(matchId, message);

      setInput("");
      setTimeout(scrollToLatest, 100);

      setOtherTyping(true);
      setTimeout(() => setOtherTyping(false), 2000);
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

      setTimeout(scrollToLatest, 100);

      setOtherTyping(true);
      setTimeout(() => setOtherTyping(false), 2000);
    } catch (error) {
      Alert.alert("Upload failed", error.message || "Could not send voice message");
    } finally {
      setUploadingVoice(false);
    }
  };

  const handleCall = async () => {
    if (!otherUser?.id) return;
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
    if (!reactionTarget) return;
    setReactions((prev) => ({ ...prev, [reactionTarget.id]: emoji }));
    setReactionTarget(null);
  };

  const ownTickKind = (m) => {
    return m.is_read ? "read" : "delivered";
  };

  const items = useMemo(() => {
    const out = [];
    for (let i = 0; i < matchMessages.length; i++) {
      const m = matchMessages[i];
      const prevOlder = i + 1 < matchMessages.length ? matchMessages[i + 1] : null;

      if (!prevOlder || !isSameDay(m.created_at, prevOlder.created_at)) {
        out.push({
          type: "separator",
          id: `sep-${dayKey(m.created_at)}`,
          date: m.created_at,
        });
      }

      out.push({ type: "message", id: m.id, message: m, index: i });
    }
    return out;
  }, [matchMessages]);

  const renderSeparator = ({ date }) => (
    <View style={styles.sepRow} pointerEvents="none">
      <View style={styles.sepPill}>
        <Text style={styles.sepText}>{dateSeparatorLabel(date)}</Text>
      </View>
    </View>
  );

  const renderMessageRow = ({ item, listIndex }) => {
    const m = item.message;
    const isOwn = m.sender_id === user?.id;
    const isVoice = m.message_type === "voice";
    const reaction = reactions[m.id];

    const prevOlderItem = listIndex + 1 < items.length ? items[listIndex + 1] : null;
    const prevMsg = prevOlderItem?.type === "message" ? prevOlderItem.message : null;
    const sameSender = prevMsg ? prevMsg.sender_id === m.sender_id : false;

    const avatarVisible = !isOwn && !sameSender;

    return (
      <Pressable
        onLongPress={() => setReactionTarget(m)}
        delayLongPress={280}
        style={[
          styles.msgRow,
          isOwn ? styles.msgRowOwn : styles.msgRowOther,
          { marginTop: sameSender ? 0 : 20 },
        ]}
      >
        {avatarVisible ? (
          otherPhoto ? (
            <Image source={{ uri: otherPhoto }} style={styles.msgAvatar} />
          ) : (
            <View style={[styles.msgAvatar, styles.msgAvatarPlaceholder]}>
              <Text style={styles.msgAvatarInitials}>{getInitials(otherUser?.full_name)}</Text>
            </View>
          )
        ) : (
          <View style={{ width: 28, height: 28 }} />
        )}

        <View style={styles.bubbleCol}>
          {isVoice ? (
            <VoiceBubble message={m} isOwn={isOwn} />
          ) : isOwn ? (
            <LinearGradient
              colors={["#FF4458", "#FF6B7A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ownBubble}
            >
              <Text style={styles.ownText}>{m.content}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.otherBubble}>
              <Text style={styles.otherText}>{m.content}</Text>
            </View>
          )}

          {reaction ? <Text style={styles.reactionBelow}>{reaction}</Text> : null}

          <View style={[styles.metaRow, isOwn && styles.metaRowOwn]}>
            <Text style={[styles.timestamp, isOwn ? styles.timestampOwn : null]}>
              {formatMessageTime(m.created_at)}
            </Text>
            {isOwn ? <Tick kind={ownTickKind(m)} /> : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <View style={styles.bg} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 2 }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
          style={styles.hBack}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={26} color="#1A1A2E" />
        </TouchableOpacity>

        <View style={styles.hLeft}>
          {otherPhoto ? (
            <Image source={{ uri: otherPhoto }} style={styles.hAvatar} />
          ) : (
            <View style={[styles.hAvatar, styles.hAvatarPlaceholder]}>
              <Text style={styles.hAvatarInitials}>{getInitials(otherUser?.full_name)}</Text>
            </View>
          )}

          <View style={styles.hTitleCol}>
            <Text style={styles.hName} numberOfLines={1}>
              {otherUser?.full_name || "Chat"}
            </Text>

            <View style={styles.hOnlineRow}>
              <View style={[styles.hOnlineDot, { opacity: otherOnline ? 1 : 0.25 }]} />
              <Text style={styles.hActiveText}>Active now</Text>
            </View>
          </View>
        </View>

        <View style={styles.hRight}>
          <TouchableOpacity onPress={handleCall} style={styles.hIconBtn} activeOpacity={0.8}>
            <Ionicons name="call-outline" size={22} color="#FF4458" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Alert.alert("Video", "Video call UI not implemented")}
            style={styles.hIconBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="videocam-outline" size={22} color="#1A1A2E" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && matchMessages.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(it) => it.id}
          inverted
          renderItem={({ item, index }) => {
            if (item.type === "separator") return renderSeparator(item);
            return renderMessageRow({ item, listIndex: index });
          }}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToLatest}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Start the conversation!</Text>
            </View>
          }
        />
      )}

      {/* Typing indicator */}
      {otherTyping ? (
        <View style={styles.typingOverlay} pointerEvents="none">
          <View style={styles.typingBubble}>
            <TypingDots />
          </View>
        </View>
      ) : null}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
        <View style={[styles.inputBar, { paddingBottom: 6 }]}>
          <TouchableOpacity onPress={() => setIcebreakerVisible(true)} style={styles.emojiBtnOuter} activeOpacity={0.85}>
            <Text style={styles.emojiBtnTxt}>😊</Text>
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor="#9A9A9A"
            value={input}
            onChangeText={setInput}
            multiline
            autoFocus
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />

          {input.trim().length === 0 ? (
            <View style={styles.rightIcons}>
              <Pressable
                onPressIn={() => setIsRecording(true)}
                onPressOut={() => setIsRecording(false)}
                style={styles.micBtn}
              >
                {uploadingVoice ? (
                  <ActivityIndicator color="#FF4458" size="small" />
                ) : (
                  <>
                    <Ionicons name="mic" size={20} color="#1A1A2E" />
                    <WaveBars active={isRecording} />
                  </>
                )}
              </Pressable>

              <TouchableOpacity
                onPress={() => Alert.alert("Camera", "Camera UI not implemented")}
                style={styles.miniIconBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={20} color="#1A1A2E" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleSend} disabled={sending} activeOpacity={0.9} style={styles.sendBtnWrap}>
              <LinearGradient colors={["#FF4458", "#FF6B7A"]} style={styles.sendBtn}>
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          )}
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

      {reactionTarget ? (
        <EmojiPicker onPick={applyReaction} onClose={() => setReactionTarget(null)} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  bg: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFFFFF" },

  header: {
    height: 60,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 10,
  },

  hBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F3F3",
  },

  hLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, marginLeft: 6 },
  hAvatar: { width: 40, height: 40, borderRadius: 20 },
  hAvatarPlaceholder: { backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  hAvatarInitials: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },

  hTitleCol: { flex: 1 },
  hName: { fontSize: 16, fontWeight: "800", color: "#1A1A2E", marginTop: 1 },
  hOnlineRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  hOnlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2ECC71" },
  hActiveText: { fontSize: 12, color: "#2ECC71", fontWeight: "700" },

  hRight: { flexDirection: "row", gap: 12, alignItems: "center" },
  hIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { color: "#666666", fontSize: 15 },

  messagesList: { paddingHorizontal: 14, paddingVertical: 16, paddingBottom: 14 },

  sepRow: { marginVertical: 10, alignItems: "center", justifyContent: "center" },
  sepPill: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFEFEF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sepText: { fontSize: 12, color: "#7C7C7C", fontWeight: "700" },

  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 12 },
  msgRowOwn: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },

  msgAvatar: { width: 28, height: 28, borderRadius: 14 },
  msgAvatarPlaceholder: { backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  msgAvatarInitials: { fontSize: 10, fontWeight: "700", color: colors.textSecondary },

  bubbleCol: { maxWidth: "72%" },

  ownBubble: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ownText: { color: "#FFFFFF", fontSize: 15, lineHeight: 20 },

  otherBubble: {
    backgroundColor: "#F0F0F0",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  otherText: { color: "#1A1A2E", fontSize: 15, lineHeight: 20 },

  voiceBubbleOwn: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  voiceBubbleOther: {
    backgroundColor: "#F0F0F0",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  reactionBelow: { marginTop: 6, fontSize: 16, alignSelf: "flex-start" },

  metaRow: { marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "flex-start" },
  metaRowOwn: { justifyContent: "flex-end" },

  timestamp: { fontSize: 11, color: "#999999" },
  timestampOwn: { color: "rgba(255,255,255,0.7)" },

  inputBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },

  emojiBtnOuter: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emojiBtnTxt: { fontSize: 20 },

  input: {
    flex: 1,
    minHeight: 42,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F5F5F5",
    color: "#1A1A2E",
    fontSize: 15,
  },

  rightIcons: { flexDirection: "row", alignItems: "center", gap: 8 },

  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },

  miniIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },

  sendBtnWrap: { width: 44, height: 44, borderRadius: 22 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },

  reactionOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 110,
  },

  emojiPicker: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#EFEFEF",
  },
  emojiBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emojiTxt: { fontSize: 26 },

  typingOverlay: {
    position: "absolute",
    bottom: 74,
    left: 0,
    right: 0,
    alignItems: "flex-start",
    paddingHorizontal: 18,
    zIndex: 20,
  },
  typingBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  typingWrap: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  typingDot: { width: 7, height: 7, borderRadius: 10, backgroundColor: "#C9C9C9" },

  waveWrap: { flexDirection: "row", gap: 4, marginLeft: 6 },
});
