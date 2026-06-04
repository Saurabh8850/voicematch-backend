import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../constants/colors";

// Audio will work in development build
let useAudioPlayer = null;
let useAudioPlayerStatus = null;
let setAudioModeAsync = null;
let audioModuleReady = false;

try {
  const expoAudio = require("expo-audio");
  useAudioPlayer = expoAudio.useAudioPlayer;
  useAudioPlayerStatus = expoAudio.useAudioPlayerStatus;
  setAudioModeAsync = expoAudio.setAudioModeAsync;
  audioModuleReady = true;
} catch (_error) {
  audioModuleReady = false;
}

function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function WaveBars({ isPlaying, size }) {
  const bars = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    let animations = [];
    if (isPlaying) {
      animations = bars.map((bar, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(bar, {
              toValue: 1,
              duration: 300 + index * 50,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(bar, {
              toValue: 0.3,
              duration: 300 + index * 50,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        )
      );
      animations.forEach((anim) => anim.start());
    } else {
      bars.forEach((bar) => bar.setValue(0.3));
    }
    return () => animations.forEach((anim) => anim.stop());
  }, [isPlaying, bars]);

  const barHeight = size === "large" ? 28 : 18;

  return (
    <View style={styles.barsRow}>
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              height: barHeight,
              transform: [{ scaleY: bar }],
            },
          ]}
        />
      ))}
    </View>
  );
}

function VoicePlayerMock({ audioUrl, size = "small" }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const iconSize = size === "large" ? 28 : 20;
  const buttonSize = size === "large" ? 56 : 40;

  return (
    <View style={[styles.container, size === "large" && styles.containerLarge]}>
      <TouchableOpacity
        style={[
          styles.playButton,
          { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 },
        ]}
        onPress={() => setIsPlaying((prev) => !prev)}
        disabled={!audioUrl}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={iconSize}
          color={colors.primary}
        />
      </TouchableOpacity>
      <WaveBars isPlaying={isPlaying} size={size} />
      <Text style={[styles.duration, size === "large" && styles.durationLarge]}>
        {formatDuration(0)}
      </Text>
    </View>
  );
}

function VoicePlayerExpo({ audioUrl, size = "small" }) {
  const player = useAudioPlayer(audioUrl ? { uri: audioUrl } : null);
  const status = useAudioPlayerStatus(player);
  const [isLoading, setIsLoading] = useState(false);

  const iconSize = size === "large" ? 28 : 20;
  const buttonSize = size === "large" ? 56 : 40;
  const isPlaying = status?.playing ?? false;
  const durationSec = status?.duration ?? 0;
  const currentSec = status?.currentTime ?? 0;

  const togglePlayback = async () => {
    if (!audioUrl || !player) {
      return;
    }

    try {
      setIsLoading(true);
      if (setAudioModeAsync) {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
        });
      }

      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    } catch (_error) {
      // UI-only fallback
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, size === "large" && styles.containerLarge]}>
      <TouchableOpacity
        style={[
          styles.playButton,
          { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 },
        ]}
        onPress={togglePlayback}
        disabled={!audioUrl || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={iconSize}
            color={colors.primary}
          />
        )}
      </TouchableOpacity>
      <WaveBars isPlaying={isPlaying} size={size} />
      <Text style={[styles.duration, size === "large" && styles.durationLarge]}>
        {formatDuration(isPlaying ? currentSec : durationSec)}
      </Text>
    </View>
  );
}

export default function VoicePlayer(props) {
  if (audioModuleReady && useAudioPlayer && useAudioPlayerStatus) {
    return <VoicePlayerExpo {...props} />;
  }
  return <VoicePlayerMock {...props} />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  containerLarge: {
    gap: 12,
  },
  playButton: {
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  bar: {
    width: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  duration: {
    fontSize: 12,
    color: colors.gray,
    minWidth: 36,
  },
  durationLarge: {
    fontSize: 14,
  },
});
