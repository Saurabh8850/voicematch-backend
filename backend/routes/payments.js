const crypto = require("crypto");
const express = require("express");
const { randomUUID } = require("crypto");
const Razorpay = require("razorpay");
const authMiddleware = require("../middleware/authMiddleware");
const supabase = require("../db/supabase");

const router = express.Router();
router.use(authMiddleware);

const PLAN_PRICES = {
  monthly: 9900,    // ₹99 in paise
  quarterly: 29900, // ₹299 in paise
  yearly: 59900,    // ₹599 in paise
};

function getPlanDurationDays(plan) {
  if (plan === "monthly") return 30;
  if (plan === "quarterly") return 90;
  return 365;
}

let razorpayInstance = null;
function getRazorpay() {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
    });
  }
  return razorpayInstance;
}

router.post("/create-order", async (req, res, next) => {
  try {
    const { plan } = req.body;
    const amount = PLAN_PRICES[plan];
    if (!amount) {
      return res.status(400).json({ success: false, message: "Invalid plan" });
    }

    const order = await getRazorpay().orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${randomUUID().slice(0, 12)}`,
    });

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    const amount = PLAN_PRICES[plan];
    if (!amount) {
      return res.status(400).json({ success: false, message: "Invalid plan" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment" });
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + getPlanDurationDays(plan) * 24 * 60 * 60 * 1000);

    const { error: subError } = await supabase.from("subscriptions").insert({
      user_id: req.user.id,
      plan_name: plan,
      provider: "razorpay",
      provider_subscription_id: razorpay_order_id,
      provider_payment_id: razorpay_payment_id,
      amount,
      currency: "INR",
      status: "active",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    });

    if (subError) {
      return res.status(500).json({ success: false, message: subError.message });
    }

    await supabase.from("users").update({ 
      is_premium: true,
      premium_expires_at: endsAt.toISOString()
    }).eq("id", req.user.id);
    
    return res.json({ success: true, message: "Subscription activated" });
  } catch (error) {
    return next(error);
  }
});

router.get("/status", async (req, res, next) => {
  try {
    const now = new Date();
    const isPremium = req.user.is_premium && 
      req.user.premium_expires_at && 
      new Date(req.user.premium_expires_at) > now;

    return res.json({
      success: true,
      data: {
        isPremium,
        expiresAt: req.user.premium_expires_at,
        dailyLikesUsed: req.user.daily_swipes_used || 0,
        dailyLikesLimit: isPremium ? 999 : 10,
        dailyLikesRemaining: isPremium ? 999 : Math.max(0, 10 - (req.user.daily_swipes_used || 0)),
        superLikesUsed: req.user.super_likes_used || 0,
        superLikesLimit: isPremium ? 5 : 2,
        superLikesRemaining: isPremium ? 5 : Math.max(0, 2 - (req.user.super_likes_used || 0)),
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
