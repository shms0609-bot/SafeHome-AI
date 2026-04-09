from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv

# 1. 환경 변수 로드 (.env 파일에 저장된 API 키를 읽어옵니다)
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# 2. 제미나이 클라이언트 설정
# .env 파일에 GEMINI_API_KEY가 정상적으로 등록되어 있어야 합니다.
client = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI()

# 3. CORS 설정
# 팀원들의 로컬 환경(5173번 포트)에서도 접속할 수 있도록 허용합니다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "SafeHome AI Server is Running"}

@app.post("/analyze")
async def analyze_contract(file: UploadFile = File(...)):
    try:
        # 파일 데이터 읽기
        contents = await file.read()
        
        # 4. 이미지 데이터 포장 (Gemini 2.5 규격)
        image_part = types.Part.from_bytes(
            data=contents,
            mime_type=file.content_type
        )

        # 5. 법률 분석 프롬프트 설정
        prompt = """
        너는 대한민국 최고의 부동산 법률 전문가이자 전세사기 예방 전문가야.
        첨부된 임대차 계약서 이미지를 정밀 분석해서 다음 항목을 상세하게 리포트해줘:

        1. 계약 핵심 요약: 임대인/임차인 정보, 보증금 액수, 계약 기간.
        2. 주요 특약 사항: 현재 계약에서 주의 깊게 봐야 할 특약 내용.
        3. 위험 요소 분석: 근저당 설정, 독소 조항, 임차인에게 불리한 조건 유무.
        4. 전문가 조언: 계약 진행 전 반드시 확인해야 할 체크리스트.

        마크다운(Markdown) 형식을 사용하여 가독성 좋게 작성하고, 
        사회초년생이 이해하기 쉬운 친절하고 신뢰감 있는 말투를 사용해줘.
        """

        # 6. AI 분석 요청
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt, image_part]
        )

        return {"analysis": response.text}

    except Exception as e:
        print(f"서버 에러 발생: {e}")
        return {"error": "분석 중 오류가 발생했습니다.", "details": str(e)}