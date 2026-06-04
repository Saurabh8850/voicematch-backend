import { View, Text, StyleSheet } from "react-native";
import colors from "../constants/colors";

export default function OnboardingProgress({ step, total = 3 }) {
  const pct = `${Math.round((step / total) * 100)}%`;

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: pct }]} />
      </View>
      <Text style={styles.label}>
        Step {step} of {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
  },
  track: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  fill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
  },
});
