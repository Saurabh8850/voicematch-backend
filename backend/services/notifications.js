const admin = require("firebase-admin");

let firebaseReady = false;

function getFirebasePrivateKey() {
  return (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

function initFirebase() {
  if (firebaseReady || admin.apps.length > 0) {
    firebaseReady = true;
    return true;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getFirebasePrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "[notifications] Firebase credentials missing — push notifications disabled"
    );
    return false;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    firebaseReady = true;
    console.log("[notifications] Firebase Admin initialized");
    return true;
  } catch (error) {
    console.error("[notifications] Firebase init failed:", error.message);
    return false;
  }
}

async function sendPushNotification(fcmToken, title, body, data = {}) {
  try {
    if (!fcmToken) {
      return null;
    }

    if (!initFirebase()) {
      return null;
    }

    return await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [String(key), String(value)])
      ),
    });
  } catch (error) {
    console.error("Failed to send push notification:", error.message);
    return null;
  }
}

module.exports = { sendPushNotification, admin, initFirebase };
