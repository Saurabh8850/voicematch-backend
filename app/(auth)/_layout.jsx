import { Stack } from "expo-router";
import colors from "../../constants/colors";

const SCREEN_BG = colors.background;

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: SCREEN_BG },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="login" options={{ contentStyle: { backgroundColor: SCREEN_BG } }} />
      <Stack.Screen name="otp" options={{ contentStyle: { backgroundColor: SCREEN_BG } }} />
    </Stack>
  );
}
