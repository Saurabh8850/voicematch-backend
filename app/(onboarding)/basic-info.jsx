import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as api from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import OnboardingProgress from "../../components/OnboardingProgress";
import GradientButton from "../../components/GradientButton";
import BackHeader from "../../components/BackHeader";
import colors from "../../constants/colors";

const GENDERS = [
  { label: "Man 👨", value: "male" },
  { label: "Woman 👩", value: "female" },
  { label: "Non-binary 🌈", value: "non-binary" },
];

const INTERESTS = [
  { label: "Men", value: "male" },
  { label: "Women", value: "female" },
  { label: "Everyone", value: "everyone" },
];

export default function BasicInfoScreen() {
  const updateUser = useAuthStore((state) => state.updateUser);
  const [name, setName] = useState("");
  const [age, setAge] = useState(null);
  const [gender, setGender] = useState("");
  const [interestedIn, setInterestedIn] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert("Missing name", "Please enter your name.");
      return;
    }
    if (!age) {
      Alert.alert("Missing age", "Please select your age.");
      return;
    }
    if (!gender) {
      Alert.alert("Missing gender", "Please select your gender.");
      return;
    }
    if (!interestedIn) {
      Alert.alert("Missing preference", "Please select who you are interested in.");
      return;
    }

    setLoading(true);
    try {
      await api.updateProfile({ name: name.trim(), age, gender, bio: "" });
      await api.updatePreferences({
        minAge: 18,
        maxAge: 60,
        preferredGender: interestedIn,
        maxDistance: 50,
      });
      updateUser({ full_name: name.trim(), gender });
      router.push("/(onboarding)/photos");
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={colors.backgroundGradient} start={{x: 0, y: 0}} end={{x: 0, y: 1}} style={{flex: 1}}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
      <BackHeader title="" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <OnboardingProgress step={1} />

          <Text style={styles.title}>Tell us about you ✨</Text>
          <Text style={styles.subtitle}>This helps us find your perfect match</Text>

          <Text style={styles.label}>Your first name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your first name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>How old are you?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ageScroll}>
            {Array.from({ length: 43 }, (_, index) => 18 + index).map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.ageChip, age === value && styles.ageChipSelected]}
                onPress={() => setAge(value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.ageText, age === value && styles.ageTextSelected]}>
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>I am a...</Text>
          <View style={styles.pillRow}>
            {GENDERS.map((item) => {
              const selected = gender === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.pill, selected && styles.pillSelected]}
                  onPress={() => setGender(item.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Interested in...</Text>
          <View style={styles.pillRow}>
            {INTERESTS.map((item) => {
              const selected = interestedIn === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.pill, selected && styles.pillSelected]}
                  onPress={() => setInterestedIn(item.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <GradientButton
          title="Continue"
          onPress={handleContinue}
          loading={loading}
          style={styles.footerBtn}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    paddingBottom: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: '#1A1A2E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 10,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#FFE8EC',
  },
  ageScroll: {
    marginBottom: 4,
  },
  ageChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFE8EC',
  },
  ageChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ageText: {
    color: '#666666',
    fontWeight: "600",
    fontSize: 15,
  },
  ageTextSelected: {
    color: '#FFFFFF',
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFE8EC',
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    color: '#666666',
    fontWeight: "600",
    fontSize: 14,
  },
  pillTextSelected: {
    color: '#FFFFFF',
  },
  footerBtn: {
    marginBottom: 20,
  },
});
