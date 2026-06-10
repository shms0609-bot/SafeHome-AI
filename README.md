# 🛡️ 집야 (Zipya) - AI 임대차 분쟁 예방 시스템

<p align="center">
  <img src="[프론트엔드 메인화면 캡처 이미지 URL을 여기에 넣으세요]" alt="집야 메인 화면" width="800">
</p>

> **"계약하려는 집, 진짜 안전할까?"** <br>
> 복잡한 대법원 등기부등본을 실시간으로 연동하고, LLM 기반의 AI가 3초 만에 권리 분석 리포트를 제공하여 청년 및 1인 가구의 안전한 전세 계약을 돕는 서비스입니다.

<br>

## ✨ 핵심 기능 (Key Features)

* **실시간 대법원 등기 연동:** CODEF API를 활용하여 주소 입력 한 번으로 대법원 인터넷등기소의 원본 등기부등본 및 아파트 시세 데이터를 즉시 파싱합니다.
* **AI 권리 분석 리포트:** Google Gemini 2.5 Flash 모델이 대한민국 부동산 법령 및 판례를 바탕으로 등기부의 위험 요소를 분석하여 직관적인 3단계 신호등 등급(🟢안전 / 🟡주의 / 🔴위험) 리포트를 제공합니다.
* **사용자 친화적 UI:** 법률 서비스의 신뢰감을 주는 다크 모드 기반의 모던 웹/모바일 UI를 제공합니다.

<br>

## 🛠 기술 스택 (Tech Stack)

### Frontend
* **Framework:** React / Next.js
* **Styling:** Tailwind CSS / Styled-components
* **Deployment:** Vercel

### Backend
* **Framework:** FastAPI (Python)
* **Database:** PostgreSQL (SQLAlchemy ORM)
* **Deployment:** Render

### External APIs
* **Real Estate Data:** CODEF API
* **AI Engine:** Google Gemini API

<br>

## 🚀 아키텍처 (Architecture)

*(여기에 시스템 구조도 이미지를 넣으시면 좋습니다. `![아키텍처](이미지링크)` 형태로 삽입하세요.)*

<br>

## ⚙️ 로컬 실행 방법 (Getting Started)

프로젝트를 로컬 환경에서 실행하기 위한 방법입니다.

### 1. 환경 변수 설정 (.env)
백엔드 루트 디렉토리에 `.env` 파일을 생성하고 아래의 키 값을 입력해야 합니다.

```env
# Database
DATABASE_URL=postgresql://user:password@localhost/dbname

# CODEF API (대법원 및 시세 연동)
CODEF_CLIENT_ID=your_client_id
CODEF_CLIENT_SECRET=your_client_secret
CODEF_PUBLIC_KEY=your_public_key

# Gemini API
GEMINI_API_KEYS=your_gemini_api_key
