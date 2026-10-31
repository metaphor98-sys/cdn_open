const { FORM_KEYS } = require("./config");

const BOOL = new Set(["t_download", "t_cache", "t_stream", "port_80", "port_443"]);
const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const rePhone = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;
const reIP = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const reDomain = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const lines = (s) => String(s || "").split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);

// 알려진 항목만 남기고 길이를 제한합니다. 제어문자는 제거합니다.
function clean(input) {
  const out = {};
  const src = input && typeof input === "object" ? input : {};
  for (const k of FORM_KEYS) {
    const v = src[k];
    if (BOOL.has(k)) out[k] = v === true;
    else out[k] = String(v ?? "").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim().slice(0, k === "memo" || k === "domains" || k === "ssl_domains" ? 2000 : 300);
  }
  return out;
}

function validate(s) {
  const errors = [];
  if (!s.company) errors.push("회사명");
  if (!s.s_name) errors.push("서비스 담당자 성명");
  if (!rePhone.test(s.s_phone)) errors.push("서비스 담당자 휴대폰");
  if (!reEmail.test(s.s_email)) errors.push("서비스 담당자 이메일");
  if (!(s.t_download || s.t_cache || s.t_stream)) errors.push("테스트 항목");
  if (!s.t_start || !s.t_end || s.t_end < s.t_start) errors.push("테스트 기간");
  const d = lines(s.domains);
  if (!d.length || !d.every((x) => reDomain.test(x))) errors.push("웹 서버 도메인");
  const ip = lines(s.origin_ip);
  if (!ip.length || !ip.every((x) => reIP.test(x))) errors.push("웹 서버 IP");
  return errors;
}

// 기존 질의서와 같은 순서의 요약문 (메일 본문)
function summary(s) {
  const v = (x) => (x ? String(x) : "-");
  const items = [s.t_download && "다운로드", s.t_cache && "캐시", s.t_stream && "스트리밍"].filter(Boolean).join(", ") || "-";
  const ports = [s.port_80 && "80", s.port_443 && "443", ...lines(s.port_other)].filter(Boolean).join(", ") || "80";
  const over = +s.peak_mbps > 100 || +s.t_traffic > 100;
  return [
    "[SK CDN 테스트 개통 요청서]",
    "■ 고객 정보 및 테스트 정보",
    "1. 회사명 : " + v(s.company),
    "2. 계약 담당자 : " + ([s.c_name, s.c_phone, s.c_email].filter(Boolean).join(" / ") || "-"),
    "   서비스 담당자 : " + [s.s_name, s.s_phone, s.s_email].filter(Boolean).join(" / "),
    "3. 테스트 항목 : " + items,
    "4. 테스트 기간 : " + v(s.t_start) + " ~ " + v(s.t_end),
    "5. 테스트 가능 트래픽 : " + (s.t_traffic ? s.t_traffic + " Mbps" : "-"),
    "",
    "■ 서비스 관련 정보 (SK CDN Cache)",
    "1) 웹 서버 도메인 : " + (lines(s.domains).join(", ") || "-"),
    "   웹 서버 IP : " + (lines(s.origin_ip).join(", ") || "-"),
    "2) Port : " + ports,
    "3) 추가 캐싱 확장자 : " + v(s.cache_ext),
    "4) 캐싱 제외 파일 : " + v(s.nocache_ext),
    "5) 오리진 갱신 확인 주기 : " + (s.refresh_days ? s.refresh_days + (s.refresh_unit || "일") : "7일(기본)"),
    "6) SSL 사용여부 : " + v(s.ssl) + (s.ssl === "사용" ? "  / SSL 도메인 : " + (lines(s.ssl_domains).join(", ") || "-") : ""),
    "7) 샘플 URI : " + v(s.sample_uri),
    "8) 예상 트래픽 : 평균 " + (s.avg_mbps || "-") + " Mbps / 최고 " + (s.peak_mbps || "-") + " Mbps" + (over ? "  ※ 100Mbps 초과, 사전 협의 필요" : ""),
    "기타 요청 : " + v(s.memo),
  ].join("\n");
}

function subject(s) {
  return ("[SK CDN 테스트 개통 요청] " + s.company + " / " + (lines(s.domains)[0] || "")).replace(/[\r\n]+/g, " ").slice(0, 200);
}

module.exports = { clean, validate, summary, subject, lines };
