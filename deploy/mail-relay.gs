/**
 * SK CDN 신청서 메일 중계 (Google Apps Script)
 *
 * 서버가 SMTP를 쓸 수 없는 곳(예: Render 무료 요금제)에서
 * 이 스크립트를 소유한 Gmail 계정으로 신청서 메일을 대신 보냅니다.
 *
 * 설정 방법
 * 1. script.google.com 에서 새 프로젝트를 만들고 이 파일 내용을 통째로 붙여넣습니다.
 * 2. 아래 SECRET 값을 아무도 모르는 긴 문자열로 바꿉니다.
 *    (Render 환경 변수 MAIL_WEBHOOK_SECRET 에 같은 값을 넣습니다)
 * 3. 배포 → 새 배포 → 유형: 웹 앱
 *    - 다음 사용자 인증 정보로 실행: 나
 *    - 액세스 권한이 있는 사용자: 모든 사용자
 * 4. 나온 웹 앱 URL(https://script.google.com/macros/s/.../exec)을
 *    Render 환경 변수 MAIL_WEBHOOK_URL 에 넣습니다.
 *
 * 보내는 사람은 이 스크립트를 만든 Gmail 계정이 됩니다.
 * 일반 Gmail 계정은 하루 약 100명에게 보낼 수 있습니다.
 */

const SECRET = "여기를-긴-비밀-문자열로-바꾸세요";

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (!SECRET || SECRET.indexOf("여기를") === 0 || d.secret !== SECRET) return out({ ok: false, error: "unauthorized" });
    if (!d.to || !d.subject || !d.text) return out({ ok: false, error: "missing fields" });
    const opts = {};
    if (d.name) opts.name = String(d.name).slice(0, 100);
    if (d.replyTo) opts.replyTo = String(d.replyTo);
    MailApp.sendEmail(String(d.to), String(d.subject).slice(0, 250), String(d.text), opts);
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err && err.message || err) });
  }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 처음 한 번 실행해서 메일 발송 권한을 승인하는 용도 (편집기에서 이 함수를 선택하고 실행) */
function testSend() {
  MailApp.sendEmail(Session.getActiveUser().getEmail(), "메일 중계 테스트", "Apps Script 메일 중계가 정상 동작합니다.");
}
