import { useLocalSearchParams } from "expo-router";
import CallScreen from "../../components/CallScreen";

export default function CallRouteScreen() {
  const { callId, channel, token, otherUser } = useLocalSearchParams();

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
    />
  );
}
