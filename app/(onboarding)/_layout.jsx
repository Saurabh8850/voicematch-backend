import { Stack } from "expo-router";
import colors from "../../constants/colors";

const SCREEN_BG = colors.background;

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: SCREEN_BG },
      }}
    >
      <Stack.Screen name="basic-info" />
      <Stack.Screen name="photos" />
      <Stack.Screen name="voice-intro" />
    </Stack>
  );
}
