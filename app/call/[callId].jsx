import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CallScreen from "../../components/CallScreen";

export default function CallRouteScreen() {
  const { callId, channel, token, otherUser } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  let parsedOtherUser = null;
  try {
    parsedOtherUser = otherUser ? JSON.parse(String(otherUser)) : null;
  } catch (_error) {
    parsedOtherUser = null;
  }

  return (
    <CallScreen
      callId={callId}
      channel={channel}
      token={token}
      otherUser={parsedOtherUser}
      style={{
        flex: 1,
        paddingBottom: insets.bottom,
      }}
    />
  );
}
