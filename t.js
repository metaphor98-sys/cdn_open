const env={MAIL_WEBHOOK_URL:"http://127.0.0.1:4001/exec",MAIL_WEBHOOK_SECRET:"s3",MAIL_FROM:"SK CDN 질의서 <a@gmail.com>"};
const FROM_NAME = (String(env.MAIL_FROM || "").match(/^\s*"?([^"<]+?)"?\s*</) || [])[1] || "";
async function sendMail({ to, replyTo, subject: subj, text }) {
  const r = await fetch(env.MAIL_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secret: env.MAIL_WEBHOOK_SECRET || "", to, replyTo, subject: subj, text, name: FROM_NAME }), redirect: "follow", signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error("메일 중계 실패: " + (j.error || "HTTP " + r.status));
}
sendMail({to:"t@x.com",subject:"[신청] 테스트",text:"본문"}).then(()=>console.log("SEND OK")).catch(e=>console.log("ERR",e.message));
