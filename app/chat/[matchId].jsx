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
  // kind: 'sent' | 'delivered' | 'read'
  const color =
    kind === "read" ? "#2F7DFF" : kind === "sent" ? "#B0B0B0" : "#A9A9A9";

  // Using double-check icon for delivered/read
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
      {
        translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }),
      },
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

  return (
    <View style={styles.voiceBubbleOther}>
      <VoicePlayer audioUrl={audioUrl} size="small" />
    </View>
  );
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
