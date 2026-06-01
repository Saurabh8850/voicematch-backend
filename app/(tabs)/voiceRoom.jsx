import { useEffect } from "react";
import { router } from "expo-router";

export default function VoiceRoomTab() {
  useEffect(() => {
    router.replace("/voice-room");
  }, []);

  return null;
}
