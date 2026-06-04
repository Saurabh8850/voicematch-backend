import { CONFIG } from "../constants/config";

let AgoraModule = null;
let agoraLoadAttempted = false;

function loadAgoraModule() {
  if (agoraLoadAttempted) {
    return AgoraModule;
  }
  agoraLoadAttempted = true;
  try {
    AgoraModule = require("react-native-agora");
    return AgoraModule;
  } catch (_error) {
    AgoraModule = null;
    return null;
  }
}

export function isAgoraAvailable() {
  return Boolean(loadAgoraModule()?.default || loadAgoraModule()?.RtcEngine);
}

export async function createAgoraEngine() {
  const mod = loadAgoraModule();
  if (!mod) {
    return null;
  }

  const RtcEngine = mod.default || mod.RtcEngine;
  if (!RtcEngine?.create) {
    return null;
  }

  const engine = RtcEngine.create(CONFIG.AGORA_APP_ID);
  return { engine, mod };
}

export function getChannelProfileTypes(mod) {
  return {
    ChannelProfileType: mod.ChannelProfileType || { ChannelProfileCommunication: 0 },
    ClientRoleType: mod.ClientRoleType || { ClientRoleBroadcaster: 1 },
  };
}

export async function joinVoiceChannel({ channel, token, uid }) {
  const result = await createAgoraEngine();
  if (!result) {
    return { engine: null, joined: false, reason: "expo_go_fallback" };
  }

  const { engine, mod } = result;
  const { ChannelProfileType, ClientRoleType } = getChannelProfileTypes(mod);

  await engine.enableAudio();
  await engine.setChannelProfile(
    ChannelProfileType.ChannelProfileCommunication ?? ChannelProfileType.ChannelProfileCommunication
  );
  await engine.setClientRole(ClientRoleType.ClientRoleBroadcaster ?? 1);
  await engine.enableAudioVolumeIndication(200, 3, true);
  await engine.joinChannel(token, channel, null, Number(uid) || 0);

  return { engine, joined: true, reason: null };
}

export async function leaveAndDestroyEngine(engine) {
  if (!engine) {
    return;
  }
  try {
    await engine.leaveChannel();
  } catch (_error) {
    // ignore
  }
  try {
    engine.destroy?.();
  } catch (_error) {
    // ignore
  }
}
