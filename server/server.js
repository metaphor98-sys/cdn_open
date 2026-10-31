require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
const { clean, validate, summary, subject } = require("./form");
const { answer } = require("./chat");

const env = process.env;
const PORT = Number(env.PORT || 3000);
const CHAT_MODE = env.CHAT_MODE === "llm" && env.ANTHROPIC_API_KEY ? "llm" : "faq";
const DAILY_LIMIT = Number(env.CHAT_DAILY_LIMIT || 500);

// 메일 발송 방식
// - MAIL_WEBHOOK_URL 이 있으면: Google Apps Script 웹앱(deploy/mail-relay.gs)으로 HTTPS 요청 → Gmail이 발송
//   (Render 무료 요금제처럼 SMTP 포트가 막힌 곳에서 사용)
// - 없으면: SMTP 로 직접 발송
const USE_WEBHOOK = !!env.MAIL_WEBHOOK_URL;
const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT || 587),
  secure: env.SMTP_SECURE === "true",
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  // 연결이 안 될 때 오래 기다리지 않도록 (기본값은 2분)
  connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
});

// "SK CDN 신청 <a@b.com>" 에서 표시 이름만 꺼냄
const FROM_NAME = (String(env.MAIL_FROM || "").match(/^\s*"?([^"<]+?)"?\s*</) || [])[1] || "";

async function sendMail({ to, replyTo, subject: subj, text }) {
  if (!USE_WEBHOOK) return mailer.sendMail({ from: env.MAIL_FROM, to, replyTo, subject: subj, text });
  const r = await fetch(env.MAIL_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secret: env.MAIL_WEBHOOK_SECRET || "", to, replyTo, subject: subj, text, name: FROM_NAME }),
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error("메일 중계 실패: " + (j.error || "HTTP " + r.status));
}

// --check : 설정만 점검하고 종료 (npm run check)
if (process.argv.includes("--check")) {
  console.log("챗봇 모드:", CHAT_MODE, CHAT_MODE === "faq" && env.CHAT_MODE === "llm" ? "(ANTHROPIC_API_KEY가 없어 faq로 동작)" : "");
  console.log("신청서 받는 주소:", env.MAIL_TO || "(MAIL_TO 미설정)");
  if (USE_WEBHOOK) { console.log("메일 발송: Apps Script 중계 사용"); process.exit(0); }
  mailer.verify().then(() => { console.log("SMTP 연결: 성공"); process.exit(0); })
    .catch((e) => { console.error("SMTP 연결: 실패 -", e.message); process.exit(1); });
  return;
}

const app = express();
if (env.TRUST_PROXY) app.set("trust proxy", Number(env.TRUST_PROXY) || env.TRUST_PROXY);
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:"],
      "connect-src": ["'self'"],
      "form-action": ["'self'", "mailto:"],
    },
  },
}));
app.use(express.json({ limit: "64kb" }));

// 요청 제한
const chatLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: Number(env.CHAT_PER_IP_10MIN || 20), standardHeaders: true, legacyHeaders: false,
  message: { error: "질문이 많아 잠시 쉬어야 합니다. 몇 분 뒤에 다시 물어봐 주세요." } });
const submitLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
  message: { ok: false, error: "짧은 시간에 제출이 너무 많습니다. 잠시 후 다시 시도해 주세요." } });

// 하루 AI 질문 수 (메모리에만 보관, 서버 재시작 시 초기화)
let day = new Date().toISOString().slice(0, 10), used = 0;
function takeQuota() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; used = 0; }
  if (used >= DAILY_LIMIT) return false;
  used++; return true;
}

app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get("/api/config", (_req, res) => res.json({ chatMode: CHAT_MODE }));

app.post("/api/chat", chatLimiter, async (req, res) => {
  const question = String(req.body?.question || "").trim().slice(0, 1000);
  if (!question) return res.status(400).json({ error: "질문을 입력해 주세요." });
  if (CHAT_MODE !== "llm") return res.status(503).json({ error: "AI 상담이 꺼져 있습니다. 자주 묻는 질문을 이용해 주세요." });
  if (!takeQuota()) return res.status(503).json({ error: "오늘 AI 상담 가능 횟수를 모두 사용했습니다. 자주 묻는 질문을 이용하시거나 담당자에게 직접 문의해 주세요." });
  const form = clean(req.body?.form);
  const missing = validate(form);
  try {
    const out = await answer({ question, history: req.body?.history, form, missing }, {
      apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL || "claude-haiku-5-5", maxTokens: Number(env.CHAT_MAX_TOKENS || 700),
    });
    // 개인정보 보호: 질문·답변 내용은 기록하지 않고 사용량만 남깁니다.
    console.log(`[chat] in=${out.usage.input_tokens} out=${out.usage.output_tokens} today=${used}/${DAILY_LIMIT}`);
    res.json({ text: out.text, fills: out.fills, docs: out.docs });
  } catch (e) {
    console.error("[chat] 실패:", e.status || "", e.message);
    res.status(502).json({ error: "답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요." });
  }
});

app.post("/api/submit", submitLimiter, async (req, res) => {
  if (req.body?.website) return res.json({ ok: true }); // 스팸 봇이 채우는 숨은 칸
  const s = clean(req.body?.form);
  const errors = validate(s);
  if (errors.length) return res.status(400).json({ ok: false, error: "다음 항목을 확인해 주세요: " + errors.join(", ") });
  const text = summary(s);
  const subj = subject(s);
  try {
    await sendMail({ to: env.MAIL_TO, replyTo: s.s_email, subject: subj, text });
    if (env.SEND_CUSTOMER_COPY !== "false") {
      await sendMail({ to: s.s_email, subject: "[접수 확인] " + subj,
        text: "SK CDN 테스트 개통 신청이 접수되었습니다. 담당 엔지니어가 검토 후 연락드립니다.\n\n" + text })
        .catch((e) => console.error("[submit] 고객 사본 발송 실패:", e.message));
    }
    console.log("[submit] 발송 완료"); // 신청 내용은 기록하지 않음
    res.json({ ok: true });
  } catch (e) {
    console.error("[submit] 발송 실패:", e.message);
    res.status(502).json({ ok: false, error: "메일 서버 오류로 발송하지 못했습니다." });
  }
});

app.use(express.static(path.join(__dirname, "..", "public"), { maxAge: "1h", index: "index.html" }));

app.listen(PORT, () => console.log(`SK CDN 신청 페이지 실행 중: http://localhost:${PORT} (챗봇 모드: ${CHAT_MODE})`));
