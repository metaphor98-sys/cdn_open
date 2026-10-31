# SK CDN 테스트 개통 신청 페이지 (자체 서버용)

신청서 + 상담 챗봇 + 자료 내려받기를 회사 서버에서 실행하는 패키지입니다.
자세한 설명은 별도 배포 가이드 문서를 참고하세요.

## 빠른 시작
```bash
cd cdn-portal
cp .env.example .env      # SMTP, 받는 주소, 챗봇 모드 입력
npm install --omit=dev
npm run check             # SMTP 연결 점검
npm start                 # http://localhost:3000
```

## 폴더
- `public/index.html` 신청서·챗봇 화면
- `public/docs/` 내려받기용 PDF
- `server/server.js` 웹서버, `/api/submit`(메일 발송), `/api/chat`(챗봇)
- `server/config.js` 담당자 연락처, 자료 목록
- `server/knowledge.md` 챗봇이 참고하는 서비스 정보
- `server/rules.md` 챗봇 답변 규칙
- `deploy/mail-relay.gs` SMTP를 못 쓰는 곳(Render 무료 등)용 Gmail 메일 중계 스크립트
- `deploy/` Nginx, systemd 예시 / `Dockerfile` / `ecosystem.config.js`(pm2)

## 챗봇 모드
- `CHAT_MODE=faq` 외부 AI 비용 없음 (자주 묻는 질문으로 답변)
- `CHAT_MODE=llm` 회사 Anthropic API 키로 답변 (방문자의 Claude 계정 사용 안 함)
