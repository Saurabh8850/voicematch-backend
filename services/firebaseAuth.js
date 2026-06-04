import { CONFIG } from "../constants/config";

export async function sendOtpViaFirebase(phoneNumber) {
  const response = await fetch(`${CONFIG.API_BASE_URL}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: phoneNumber }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to send OTP");
  }
  return data;
}

export async function verifyOtpCode(phone, otp, deviceToken) {
  const response = await fetch(`${CONFIG.API_BASE_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp, deviceToken }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Invalid OTP");
  }
  return data;
}
