// 화면과 챗봇이 함께 쓰는 설정. 담당자·자료가 바뀌면 이 파일만 고치면 됩니다.
module.exports = {
  CONTACTS: [
    "- 기술담당 최준철 매니저: chchch3@sk.com / 010-9356-6478",
    "- 기술담당 마춘희 매니저: bux@sk.com / 010-4538-8415",
    "- 사업담당 이명제 매니저: mlee@sk.com / 010-8663-7560",
  ].join("\n"),
  // public/docs 폴더의 PDF와 id가 화면(public/index.html의 DOCS)과 같아야 합니다.
  DOCS: [
    { id: "service-intro-2024", desc: "최신 2024.04 서비스 소개" },
    { id: "product-intro", desc: "회사 소개·재무 포함 상품소개 전체본" },
    { id: "proposal-standard", desc: "표준 제안서" },
  ],
  FORM_KEYS: ["company","c_name","c_phone","c_email","s_name","s_phone","s_email","t_download","t_cache","t_stream","t_start","t_end","t_traffic",
    "domains","origin_ip","port_80","port_443","port_other","cache_ext","nocache_ext","refresh_days","refresh_unit","ssl","ssl_domains","sample_uri","avg_mbps","peak_mbps","memo"],
};
