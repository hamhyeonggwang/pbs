# 🧠 ICF-LM — 임상 언어 ICF 자동 분류 시스템

> **강원대학교 생명윤리위원회 승인 연구** | ICF 기반 sLLM 개발 (파일럿)  
> 연구책임자: 함형광 (강원대학교 작업치료학과 일반대학원 석사과정)

---

## 📁 프로젝트 구조

```
icf-lm/
├── public/
│   └── index.html          # 웹앱 (단일 파일)
├── api/
│   ├── log.js              # Vercel Serverless — 분류결과 → GAS 중계
│   └── health.js           # Vercel Serverless — 헬스체크
├── vercel.json             # Vercel 배포 설정
├── .env.example            # 환경변수 예시
├── .gitignore
├── gas-setup.js            # Google Apps Script 코드 (별도 배포)
└── README.md
```

---

## 🚀 배포 방법

### Step 1 — GitHub 저장소 생성

```bash
# 로컬에서
git init
git add .
git commit -m "feat: ICF-LM 초기 배포"

# GitHub에서 새 저장소 생성 후
git remote add origin https://github.com/YOUR_USERNAME/icf-lm.git
git branch -M main
git push -u origin main
```

### Step 2 — Vercel 연결

1. [vercel.com](https://vercel.com) 로그인
2. **Add New Project** → GitHub 저장소 선택
3. Framework Preset: **Other**
4. Output Directory: `public`
5. **Environment Variables** 추가:

| 변수명 | 값 |
|--------|-----|
| `GAS_WEBHOOK_URL` | Google Apps Script 배포 URL |

6. **Deploy** 클릭

### Step 3 — Google Apps Script 설정

1. [Google Sheets](https://sheets.google.com) 새 파일 생성
2. **확장 프로그램 → Apps Script** 열기
3. `gas-setup.js` 코드 전체 붙여넣기
4. **배포 → 새 배포 → 웹 앱** 선택
   - 실행 계정: **나**
   - 액세스 권한: **모든 사용자** (또는 조직 내)
5. 배포 URL 복사 → Vercel 환경변수 `GAS_WEBHOOK_URL`에 입력

### Step 4 — 재배포

환경변수 변경 후 Vercel Dashboard에서 **Redeploy** 클릭

---

## 🔄 업데이트 방법

```bash
# 코드 수정 후
git add .
git commit -m "fix: 설명 수정"
git push origin main
# → Vercel이 자동으로 재배포
```

---

## 📊 스프레드시트 저장 구조

분류가 실행될 때마다 아래 데이터가 Google Sheets에 자동 기록됩니다.

| 열 | 내용 |
|----|------|
| 저장일시 | 분류 실행 시각 |
| 세션ID | 고유 세션 식별자 |
| 입력 임상 언어 | 분류에 사용된 텍스트 |
| 분류 코드 1~4순위 | ICF 코드 |
| 분류 신뢰도 | 0~1 |
| 모델 버전 | ICF-sLLM-v0.1 |
| 연구자 | 로그인 사용자 |
| 피드백 | 전문가 승인 여부 |

---

## 🔗 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/health` | 서비스 상태 및 GAS 설정 여부 확인 |
| `POST` | `/api/log` | 분류 결과 스프레드시트 저장 |

### POST /api/log 요청 형식

```json
{
  "timestamp": "2025-09-15T10:30:00.000Z",
  "session_id": "S1726393800000",
  "input_text": "환아는 양손 협응이 저하되어...",
  "codes": ["d440", "d445", "b760", "b770"],
  "confidence": 0.91,
  "model": "ICF-sLLM-v0.1",
  "researcher": "함형광",
  "feedback": null
}
```

---

## 🔒 보안 및 IRB 준수

- 환경변수는 `.gitignore`에 포함되어 GitHub에 노출되지 않음
- 입력 데이터는 서버(`/api/log`) 경유 → GAS → Google Sheets 저장
- 개인 식별 정보 비입력 원칙 (웹앱 내 안내 표시)
- 연구 참여 안내 모달 — 최초 접속 시 동의 확인

---

## 📞 문의

- 연구책임자: 함형광 (`radiant_ham@purmehospital.org`)
- IRB: 강원대학교 생명윤리위원회 ☎ 033-250-7905
