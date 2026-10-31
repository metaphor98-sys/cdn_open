[SK CDN 서비스 참고 정보]
출처: SKB CDN 서비스 소개(2024.04, SKB DC사업팀), CDN 제안서, 상품소개 자료, CDN 테스트 개통 요청서. 자료 사이에 수치가 다르면 가장 최근 자료인 2024.04 서비스 소개 기준으로 답하고, 정확한 최신 수치는 담당자 확인이 필요하다고 덧붙인다.

1. CDN 개념과 서비스 종류
- CDN은 콘텐츠를 사용자 가까운 서버에 미리 옮겨 두어 대용량 콘텐츠의 전송 속도와 안정성을 높이는 서비스.
- 다운로드 서비스: 대용량 파일 배포(게임 다운로드, 펌웨어 업그레이드, e-book, 금융사 보안 모듈, 백신 배포 등).
- Cache 서비스: 웹 페이지 로딩 속도 향상(트래픽 많은 포털 광고, 온라인 기사, 쇼핑몰 상품 이미지 등).
- VoD Streaming: 방송사 다시보기, OTT VoD, 이러닝 동영상.
- Live Streaming: 방송사 실시간 방송, 스포츠 중계, 단체·기업 행사 중계.
- Global Streaming: 국내외 실시간 영상 전송.

2. 인프라
- 자체 DC 중심, 총 약 2Tbps 처리 용량, Cache 서버 약 1,300여 대.
- Origin 노드: Storage(10PB), Upload, Packetizer, Transcoding. 서초·분당 이원화.
- Edge 노드: Image Cache, Download, Pseudo Streaming, HTTP Live Streaming. 7개 DC에 분산 배치(이전 자료에는 서초·분당·일산·동작·가산 등으로 표기). SK브로드밴드, KT, LG U+ 국내 IDC 3사에 분산.
- 자체 Edge 노드는 국내에만 있음. 해외 Edge가 필요하면 Global CDN 업체와 제휴해 제공.
- 구조: 고객 Origin(Master/Backup) → HTTP Pull, Failover → Relay → Edge의 2Tier(Multi Tier 가능).
- 플랫폼: NGINX 기반 자체 Cache 솔루션 + Kubernetes 기반 Container Orchestration. 트래픽 폭주 시 손쉬운 확장, Auto Provisioning, 웹콘솔·API로 배포·관리 상황 확인.

3. 주요 기능
- HTTP(S): Progressive Download, HLS/DASH/CMAF, HTTPS 지원. HTTP/2 지원(요구 시).
- 고객 도메인을 서비스 도메인으로 설정, 고객 인증서를 통한 SSL 지원, SNI 기반 인증.
- 원본 경로 지정(Origin Path), Gzip(Accept-Encoding에 따라 압축), Referrer 허용/차단(없을 때 동작도 설정), IP·User-Agent 기반 크롤링 차단, Rate-limit 서비스 제한, Signed URL(AWS CloudFront 호환, Signed key 자동 Tag), 통계·로그(필요 시 Raw log), 통계·Purge·모니터링 API.
- NGINX 특징: 비동기 Event-Driven, 동일 URL 동시 요청 시 1세션만 오리진 요청(request lock), DDoS 시 IP·URL별 폭주 제어, TTL 만료 시 오리진 상태만 검사(Revalidate), 오리진 장애 시에도 캐시된 콘텐츠 제공(Stale).
- 지능형 Cache Disk: 디스크 장애 시에도 다른 디스크로 분산해 서비스 유지. Cache Config 자동 배포, Web UX로 설정·모니터링.

4. 캐시 관리(Cache-Control)
- 기본은 Origin 서버의 Cache-Control 헤더(max-age, Expires 등) 우선 적용.
- Origin과 상관없이 제어: Origin Cache-Control 삭제 후 정책 추가 가능.
- Custom: 확장자별 TTL, 특정 URL Cache-Control. Default TTL: Status Code별 TTL(예: 200 600s, 301 300s).
- Response Header 추가/삭제, CORS(Access-Control-Allow-Origin 추가), XFF 헤더로 Client IP를 오리진에 전달.
- Cache Control 설정은 Admin Portal에서 API로만 가능(고객 User Portal에서 직접 설정하는 기능은 향후 지원 예정이었음). 따라서 캐시 정책 변경은 담당 엔지니어에게 요청.

5. Purge(캐시 무효화)
- User Portal과 User API로 디렉토리 또는 파일 단위 Purge. 비동기 처리, 상태 조회 가능, 최대 수 분 이내 적용. Soft purge(TTL만 조절하는 빠른 퍼지).
- 사용자별 Purge API 키 발급·재발급·삭제(유출 시 재발급), Purge API는 JWT token으로 권한 제어.
- 다중 Purge: URL 목록을 한 번에, 동시 최대 50개.
- Purge 이력: 시간, 수행자, 대상, 접속 IP, 결과 조회.

6. 영상·이미지 부가 서비스
- Transcoding: 웹/FTP/HTTP API 업로드 → Preset/Task/Template 규칙에 따라 자동 변환 → 지정 Storage(당사 Object Storage, 외부·고객 Storage) → CDN 자동 배포. CRF 지원, 썸네일·Grid 썸네일 추출, 이미지 오버레이, Rule(예: mp4면 1080p/720p/480p, H.265면 변환 안 함), Job 우선순위, 결과 Callback, Simple CMS, RESTful API, 기본 HTML5 Player.
- Live: 고객이 송출한 RTMP 영상을 다중 프로파일로 실시간 변환해 HLS로 배포. DVR 녹화로 Time machine, Live Clipping(구간 지정해 즉시 VoD 생성). Signed URL로 허가된 사용자만 재생.
- Dynamic Packetizing: HLS, DASH, CMAF(저지연)로 실시간 변환, Live·VoD, Signed URL 보안.
- DIMS 이미지 변환: 전송 시점에 On the fly 변환. Relay에서 처리 후 Edge가 결과를 캐시(중복 호출 시 트래픽 비용만 과금), 오류 시 원본 전송. 사용법: /crop/100x200+20+30, /thumbnail/40x30, /resize/200x200, /img.jpg/dims/format/png, /img.jpg/dims/quality/25/, /a.jpg/dims/composite/water1/, 반전·대칭·밝기 이펙트.

7. HTTPS·모바일
- HTTP 1.1 기반 SSL, SKB 도메인 또는 고객 도메인 SSL, HTTP/2.
- Mobile Zero-rating: SK/KT/LG 모바일 IP용 Mobile Zone을 별도 운영(단독 구성). 구성정보(IP, 포트) 사전 제공, 확장 시 최소 4주 전 통보. 서버 분리 시 별도 비용 청구.

8. 보안
- 콘텐츠 보안: DRM(Pre/On the fly, iOS·Android), 미디어 보안 Player(열람 기간·횟수·기기 수 제어, 화면 캡처 제어, 사용 내역 관리).
- URL 인증: 암호화된 1회성 URL, 토큰 방식 인증키, 만료시간·사용횟수 제어, 고객 웹서버에 별도 Keygen 불필요.
- DDoS 클린존: 백본 보호 및 서비스 보호용 1Tbps급(이전 자료 320G 기준 표기 있음). 대용량은 블랙홀, 이하는 싱크홀·악성 패킷 필터링. 백본 보호 차원 이외의 상시 공격 방어는 별도 요금 부과.
- Secured Cache Zone: 클린존으로 막지 못한 공격에 대해 오리진 보호용 우회·완화.

9. 안정성·관제·통계
- 노드·네트워크 장비·링크·서버 다중화. GSLB가 30초마다 Health Check, 미응답 서버는 1분 내 제외. Storage 동기화로 원본 장애 시 백업 스토리지로 즉시 우회. 24x365 무중단 목표.
- 관제: 24x365 NW·인프라 관제(DDoS 탐지, 백본, 서버 상태), 서비스 모니터링. 프리미엄 관제(영상 멈춤, 소리 없음, Black Screen 감지, 프로토콜별 재생·버퍼링, 게시지점 모니터링). AI 기반 Anomaly Detection(트래픽 이상 탐지, 증설 시기 예측, 해외 IP 증가 감시).
- 통계(User Portal·API): 트래픽(사용량, 전송량, UV, RPS)은 실시간(5분 갱신, 최대 10분 지연), 실시간 통계 최소 10초 단위로 도메인·서버·국가·ISP별 확인. 콘텐츠(히트수, 전송량, Status code별), 사용자(지역·국가별), 클라이언트(OS, 브라우저, referrer)는 익일 제공.

10. 레퍼런스
- 대형: WAVVE(OTT VoD), EBS(교육방송 전체), JTBC·MBN(사이트 내 Live, VoD), 동부화재(사내방송), SK stoa(VoD).
- 기타: 11번가·이마트(이미지 캐시), 안랩(V3 배포 일부), 디시인사이드(이미지), 웅진씽크빅·KG에듀원·에듀스파(이러닝 VoD), 매경닷컴(Live, VoD), SKT/P(에이닷, Tworld 등) 등.
- EBS 온라인 클래스: 코로나19 온라인 개강 때 주말 긴급 증설(200G → 2Tbps급), 동시접속 최대 80만, 최대 1.2Tbps 처리.
- CDN 도입 효과: 웹사이트 트래픽 몰림 해소, 별도 스트리밍 서버 불필요, 전반적 속도 개선, Cloud Storage 제공, 동영상 부가서비스(Signed URL, 미디어 보안, HTML5 Player, Transcoding, Live/Clipping).

11. 테스트 개통 질의서 관련
- 테스트 기간 연장이나 100Mbps 이상 트래픽은 반드시 사전 협의. 기본 포트 80. 오리진 콘텐츠 갱신 확인 주기 기본 7일.
- 도메인을 여러 개(예: i.image.foobar.com, m.image.foobar.com, e.image.foobar.com)로 나누면 브라우저 동시 연결이 늘어 체감 속도가 올라감.
- '웹 서버 도메인'은 CDN을 적용할 고객 서비스 도메인, '웹 서버 IP'는 CDN이 원본을 가져올 오리진 IP.
- 'Common 확장자'는 일반 정적 파일(jpg, jpeg, png, gif, css, js, ico, svg, woff 등). 그 외(webp, avif, apk, mp4, zip 등)는 3)에 기재. 4)에는 동적 페이지(php, jsp, asp)나 API 경로처럼 캐시하면 안 되는 것.
- 샘플 URI는 CDN 적용 후 정상 동작을 확인할 실제 파일 주소 1~3개.
- 테스트 항목: 이미지·CSS·JS 등 웹 리소스는 캐시, 설치파일·패치·대용량 파일은 다운로드, 영상(HLS, MP4)은 스트리밍.

12. 자료에 없는 것
- 요금표, 할인, 약정, SLA 수치·보상 기준, 정확한 개통 소요 일정은 자료에 없음. 단정하지 말고 담당자 안내.
