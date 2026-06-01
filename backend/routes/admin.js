const express = require("express");
const supabase = require("../db/supabase");

const router = express.Router();

function adminAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  if (auth !== "Bearer admin_voicematch_2024") {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  return next();
}

router.use(adminAuth);

router.get("/stats", async (req, res, next) => {
  try {
    const [{ count: totalUsers }, { count: totalMatches }, { data: revenueData }, { count: activeToday }] =
      await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("matches").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("amount"),
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .gte("last_active", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

    const totalRevenue = (revenueData || []).reduce((sum, row) => sum + Number(row.amount || 0), 0) / 100;
    return res.json({
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        activeToday: activeToday || 0,
        totalMatches: totalMatches || 0,
        totalRevenue,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const search = String(req.query.search || "").trim();
    const pageSize = 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from("users").select("*", { count: "exact" });
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: users, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({
      success: true,
      data: {
        users: users || [],
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/users/:id/ban", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: user } = await supabase.from("users").select("id, is_banned").eq("id", id).maybeSingle();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const newState = !Boolean(user.is_banned);
    const { error } = await supabase.from("users").update({ is_banned: newState }).eq("id", id);
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    return res.json({ success: true, message: newState ? "User banned" : "User unbanned" });
  } catch (error) {
    return next(error);
  }
});

router.get("/reports", async (req, res, next) => {
  try {
    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const userIds = new Set();
    for (const report of reports || []) {
      userIds.add(report.reporter_id);
      userIds.add(report.reported_id);
    }
    const { data: users } = await supabase.from("users").select("id, full_name, phone").in("id", [...userIds]);
    const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));

    const enriched = (reports || []).map((r) => ({
      ...r,
      reporter: userMap[r.reporter_id] || null,
      reportedUser: userMap[r.reported_id] || null,
    }));

    return res.json({ success: true, data: { reports: enriched } });
  } catch (error) {
    return next(error);
  }
});

router.put("/reports/:id/resolve", async (req, res, next) => {
  try {
    const { error } = await supabase
      .from("reports")
      .update({ status: "resolved", reviewed_at: new Date().toISOString() })
      .eq("id", req.params.id);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
