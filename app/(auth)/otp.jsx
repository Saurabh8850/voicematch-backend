import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as api from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import colors from "../../constants/colors";

export default function OtpScreen() {
  const { phone } = useLocalSearchParams();
  const login = useAuthStore((state) => state.login);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (value, index) => {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = cleaned;
    setDigits(nextDigits);

    if (cleaned && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (event, index) => {
    if (event.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.sendOtp(String(phone));
      setCountdown(60);
      setDigits(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
      Alert.alert("OTP Sent", "A new OTP has been sent to your phone.");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    const otp = digits.join("");
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.verifyOtp(String(phone), otp);
      const { token, isNewUser, user } = response.data;
      await login(token, user);

      const pendingPush = await AsyncStorage.getItem("voicematch_pending_push_token");
      if (pendingPush) {
        try {
          await api.updateFcmToken(pendingPush);
          await AsyncStorage.removeItem("voicematch_pending_push_token");
        } catch (_error) {
          // non-blocking
        }
      }

      if (isNewUser) {
        router.replace("/(onboarding)/basic-info");
      } else {
        router.replace("/(tabs)");
      }
    } catch (error) {
      Alert.alert("Verification failed", error.message || "Could not verify OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Code sent to +91 {phone}. Check backend console in dev.</Text>

      <View style={styles.otpRow}>
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputsRef.current[index] = ref;
            }}
            style={styles.otpBox}
            value={digit}
            onChangeText={(value) => handleChange(value, index)}
            onKeyPress={(event) => handleKeyPress(event, index)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
          />
        ))}
      </View>

      {countdown > 0 ? (
        <Text style={styles.timerText}>Resend OTP in {countdown}s</Text>
      ) : (
        <TouchableOpacity onPress={handleResend} disabled={resending}>
          <Text style={styles.resendText}>{resending ? "Sending..." : "Resend OTP"}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>Verify</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 32,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  otpBox: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    fontSize: 22,
    fontWeight: "700",
    color: '#FFFFFF',
    backgroundColor: '#1A1A1A',
  },
  timerText: {
    textAlign: "center",
    color: '#FFFFFF',
    marginBottom: 24,
  },
  resendText: {
    textAlign: "center",
    color: '#FFFFFF',
    fontWeight: "600",
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: "700",
  },
});
