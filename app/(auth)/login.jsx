import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { sendOtpViaFirebase } from "../../services/firebaseAuth";
import colors from "../../constants/colors";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('Login screen mounted');
  }, []);

  const handleSendOtp = async () => {
    console.log('Send OTP pressed', phone);
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 10) {
      Alert.alert("Invalid phone", "Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);
    try {
      await sendOtpViaFirebase(cleaned);
      router.push({ pathname: '/(auth)/otp', params: { phone } });
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.hero}>
          <Text style={styles.logo}>VoiceMatch</Text>
          <Text style={styles.tagline}>Find your voice, find your match</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.phoneRow}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefixText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="Mobile number"
              placeholderTextColor={colors.grayMuted}
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={(value) => setPhone(value.replace(/\D/g, ""))}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F0F0F',
    flex: 1,
  },
  flex: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  hero: {
    marginTop: "40%",
    alignItems: "center",
  },
  logo: {
    fontSize: 36,
    fontWeight: "800",
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#FFFFFF',
    fontStyle: "italic",
  },
  form: {
    gap: 16,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  prefixBox: {
    backgroundColor: colors.prefixBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  prefixText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: "600",
  },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: "center",
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
