import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const TABLE_URL = `${SUPABASE_URL}/rest/v1/workshop_lunch_orders`;
const LOGIN_CONFIG_URL = `${SUPABASE_URL}/rest/v1/workshop_organizer_login?id=eq.1&select=salt,email_hash`;
const MEALS = new Set(["原味飯糰", "海苔香鬆", "泡菜飯糰", "鮪魚飯糰", "烤肉飯糰", "辣豬肉飯糰"]);
const ROSTER = new Set(["怡雯", "永哲", "佩湘", "思瑩", "恩慈", "育如", "玉帆"]);
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ouou710810-tech.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Vary": "Origin",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function maskName(name: string) {
  const chars = [...name.trim()];
  if (chars.length < 2) return chars[0] ? `${chars[0]}O` : "訪客";
  return `${chars[0]}O${chars.slice(2).join("")}`;
}

async function readOrders() {
  const response = await fetch(`${TABLE_URL}?select=id,person_key,name,meal,created_at&order=created_at.desc`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!response.ok) throw new Error("Unable to read orders");
  return await response.json();
}

async function isOrganizerEmail(email: string) {
  const response = await fetch(LOGIN_CONFIG_URL, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!response.ok) throw new Error("Unable to read organizer configuration");
  const [config] = await response.json();
  if (!config) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(config.salt + email.trim().toLowerCase()));
  const candidate = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  if (candidate.length !== config.email_hash.length) return false;
  let difference = 0;
  for (let i = 0; i < candidate.length; i++) difference |= candidate.charCodeAt(i) ^ config.email_hash.charCodeAt(i);
  return difference === 0;
}

async function isOrganizer(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === ANON_KEY || token.startsWith("sb_publishable_")) return false;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return false;
  const user = await response.json();
  return isOrganizerEmail(String(user.email || ""));
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const action = new URL(request.url).searchParams.get("action");

  try {
    if (request.method === "GET" && action === "public") {
      const orders = await readOrders();
      return json(orders.map((order: { name: string; meal: string; created_at: string }) => ({
        name: maskName(order.name), meal: order.meal, created_at: order.created_at,
      })));
    }

    if (request.method === "GET" && action === "organizer") {
      if (!await isOrganizer(request)) return json({ error: "需要主辦人帳號登入。" }, 401);
      const orders = await readOrders();
      return json(orders);
    }

    if (request.method === "POST" && action === "send-login") {
      const input = await request.json();
      const email = String(input.email || "").trim().toLowerCase();
      if (!email || email.length > 254 || !await isOrganizerEmail(email)) return json({ error: "無法寄送登入連結，請確認主辦人信箱。" }, 403);
      const auth = createClient(SUPABASE_URL, ANON_KEY, { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false } });
      const { error } = await auth.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: "https://ouou710810-tech.github.io/workshop-lunch-1151028/admin/",
        },
      });
      if (error) return json({ error: "目前無法寄送登入連結，請稍後重試或檢查 Supabase Auth 設定。" }, 502);
      return json({ ok: true });
    }

    if (request.method === "POST" && action === "submit") {
      const input = await request.json();
      const name = String(input.name || "").trim();
      const meal = String(input.meal || "");
      if (!name || [...name].length > 30 || !MEALS.has(meal)) return json({ error: "請確認姓名與餐點選項。" }, 400);

      let personKey: string;
      if (ROSTER.has(name)) {
        personKey = `roster:${name}`;
      } else {
        const onsiteId = String(input.onsiteId || "");
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(onsiteId)) {
          return json({ error: "現場報名識別資料不正確，請重新整理頁面再送出。" }, 400);
        }
        personKey = `onsite:${onsiteId}`;
      }

      const response = await fetch(`${TABLE_URL}?on_conflict=person_key`, {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({ person_key: personKey, name, meal, created_at: new Date().toISOString() }),
      });
      if (!response.ok) return json({ error: "訂單暫時無法儲存，請稍後重試。" }, 502);
      return json({ ok: true, name: maskName(name), meal });
    }

    return json({ error: "找不到這項服務。" }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: "服務暫時忙碌，請稍後重試。" }, 500);
  }
});
