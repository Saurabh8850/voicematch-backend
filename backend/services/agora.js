const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

function generateAgoraToken(channelName, uid) {
  const appID = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appID || !appCertificate) {
    console.warn("[agora] AGORA_APP_ID or AGORA_APP_CERTIFICATE missing — using dev placeholder token");
    return `dev_token_${channelName}_${uid}`;
  }

  try {
    const role = RtcRole.PUBLISHER;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTimestamp + 3600;

    return RtcTokenBuilder.buildTokenWithUid(
      appID,
      appCertificate,
      channelName,
      Number(uid),
      role,
      privilegeExpireTime
    );
  } catch (error) {
    console.error("[agora] Token generation failed:", error.message);
    return `dev_token_${channelName}_${uid}`;
  }
}

module.exports = { generateAgoraToken };
