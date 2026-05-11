from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.genai import Client, types
import os
import requests
import base64
import urllib.parse
import json
from dotenv import load_dotenv

from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5

# 1. .env 파일에서 환경 변수(API 키 등)를 안전하게 불러옵니다.
load_dotenv()

app = FastAPI()

# CORS 설정 (프론트엔드와 통신 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. 하드코딩된 키 대신 os.getenv를 사용하여 안전하게 키를 가져옵니다.
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    print(f"✅ 성공: API KEY 로드 완료 ({api_key[:10]}...)")
else:
    print("❌ 에러: GEMINI_API_KEY가 .env 파일에 없습니다.")

# 제미나이 클라이언트 초기화
gemini_client = Client(api_key=api_key) if api_key else None


class CodefService:
    def __init__(self):
        self.client_id = os.getenv("CODEF_CLIENT_ID")
        self.client_secret = os.getenv("CODEF_CLIENT_SECRET")
        self.public_key = os.getenv("CODEF_PUBLIC_KEY", "") 
        self.base_url = "https://development.codef.io/v1" 

    def encrypt_rsa(self, text: str) -> str:
        if not self.public_key:
            print("⚠️ 에러: .env 파일에 CODEF_PUBLIC_KEY가 없습니다.")
            return ""
        try:
            key_der = base64.b64decode(self.public_key)
            key_pub = RSA.import_key(key_der)
            cipher = PKCS1_v1_5.new(key_pub)
            encrypted = cipher.encrypt(text.encode('utf-8'))
            return base64.b64encode(encrypted).decode('utf-8')
        except Exception as e:
            print(f"❌ RSA 암호화 실패: {str(e)}")
            return ""

    def get_access_token(self):
        try:
            auth_str = f"{self.client_id}:{self.client_secret}"
            b64_auth = base64.b64encode(auth_str.encode()).decode()
            url = "https://oauth.codef.io/oauth/token"
            headers = {"Authorization": f"Basic {b64_auth}", "Content-Type": "application/x-www-form-urlencoded"}
            data = {"grant_type": "client_credentials"}
            response = requests.post(url, headers=headers, data=data)
            return response.json().get("access_token")
        except Exception as e:
            print(f"❌ CODEF 토큰 발급 에러: {str(e)}")
            return None

    def get_real_estate_register(self, params: dict):
        token = self.get_access_token()
        if not token: 
            return {"error": "CODEF API 토큰 발급 실패. .env 파일을 확인하세요."}
        
        real_phone = os.getenv("REAL_ESTATE_PHONE", "01000000000")
        raw_password = os.getenv("REAL_ESTATE_PASSWORD", "1234")
        
        if len(raw_password) != 4 or not raw_password.isdigit():
            print(f"⚠️ 경고: 설정된 비밀번호가 4자리 숫자가 아닙니다. 기본값 1234로 대체합니다.")
            raw_password = "1234"
            
        encrypted_password = self.encrypt_rsa(raw_password)
        
        url = f"{self.base_url}/kr/public/ck/real-estate-register/status" 
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        payload = {
            "organization": "0002",
            "phoneNo": real_phone, 
            "password": encrypted_password, 
            "inquiryType": params.get("inquiryType", "3"),
            "realtyType": params.get("realtyType", "1"),
            "jointMortgageJeonseYN": "1",
            "tradingYN": "1",
            "issueType": "2", 
            "ePrepayNo": "",      
            "ePrepayPass": "",    
            "registerSummaryYN": "1",
            **params
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload)
            decoded_text = urllib.parse.unquote(response.text)
            
            print(f"\n--- 🏢 CODEF API 응답 로그 ---")
            print(f"상태 코드: {response.status_code}")
            print(f"해독된 응답: {decoded_text[:300]}...") 
            print(f"--------------------------------\n")
            
            try:
                res_data = json.loads(decoded_text)
            except json.JSONDecodeError:
                try:
                    res_data = response.json()
                except ValueError:
                    return {
                        "error": "해독 실패: 알 수 없는 응답 규격입니다.", 
                        "raw_response": decoded_text[:200]
                    }
            
            if res_data.get("result", {}).get("code") == "CF-03002":
                return {"status": "NEED_2WAY", "data": res_data.get("data")}
                
            return res_data
            
        except Exception as e:
            return {"error": f"백엔드 통신 에러: {str(e)}"}

codef = CodefService()

# API 요청 형식을 정의하는 Pydantic 모델
class RealEstateRequest(BaseModel):
    addr_sido: str
    addr_sigungu: str
    addr_roadName: str = ""
    addr_buildingNumber: str = ""
    dong: str = ""
    ho: str = ""
    realtyType: str = "1" 

class ChatRequest(BaseModel):
    user_message: str
    analysis_context: str

# --- API 엔드포인트 ---

@app.get("/ping")
async def ping():
    return {"message": "pong"}

@app.post("/fetch-real-estate")
async def fetch_info(request: RealEstateRequest):
    # 건물 번호와 동/호수까지 터미널에 찍히도록 수정된 버전
    print(f"🏢 실시간 조회 요청 수신: {request.addr_sido} {request.addr_sigungu} {request.addr_roadName} {request.addr_buildingNumber} {request.dong}동 {request.ho}호")
    result = codef.get_real_estate_register(request.dict())
    return result

@app.post("/analyze")
async def analyze_contract(file: UploadFile = File(...)):
    print(f"--- 📥 계약서 분석 요청 수신: {file.filename} ---")
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Gemini API 키 오류")
        
    try:
        contents = await file.read()
        image_part = types.Part.from_bytes(data=contents, mime_type=file.content_type)
        
        prompt = """
        귀하는 대한민국 부동산 법률 분석 AI입니다.
        업로드된 계약서 이미지를 바탕으로 정밀 분석을 수행하고, 사용자가 시각적으로 이해하기 쉽도록 풍부하고 상세한 리포트를 작성하십시오.

        [분석 리포트 필수 출력 형식]
        반드시 아래의 마크다운 형식을 엄격하게 지켜서 답변하십시오.

        ### 🚨 종합 위험도 평가
        (계약서의 전반적인 상태를 평가하여 다음 중 하나를 큰 글씨로 출력: 🟢 **[안전]** / 🟡 **[주의]** / 🔴 **[위험]**)
        - **판단 사유**: (위험도를 이렇게 평가한 핵심 이유를 2~3줄로 상세히 설명)

        ---

        ### 🔍 핵심 체크포인트 상세 분석
        **1. 임대인 및 소유주 정보**
        - (일치 여부 및 상세 설명, 계약 시 주의할 점 등 2~3문장 이상 상세히 작성)

        **2. 계약 면적 및 대상물 정확성**
        - (공부상 면적과 계약서상 면적의 일치 여부, 수치 모순 여부 등 상세히 작성)

        **3. 하자 보수 및 특약 사항**
        - (현재 특약의 유무, 세입자에게 불리한 독소조항 여부, 추가해야 할 특약 조언 등 상세히 작성)

        ---

        ### 💡 AI 종합 조언 (주의 깊게 봐야 할 부분)
        > (세입자 입장에서 이 계약을 진행할 때 반드시 확인해야 할 실질적인 조언, 팁, 주의사항을 3~4문장으로 길고 상세하게 풀어쓰십시오.)
        """
        
        # ✨ 모델명 수정: gemini-1.5-flash
        response = gemini_client.models.generate_content(
            model="gemini-1.5-flash", 
            contents=[prompt, image_part]
        )
        return {"analysis": response.text}
        
    except Exception as e:
        print(f"❌ 분석 중 서버 에러 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    print(f"--- 💬 챗봇 요청 수신: {request.user_message[:20]}... ---") 
    
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Gemini API 키 오류")
        
    try:
        sys_instruct = f"""
        당신은 SafeHome AI 임대차 분쟁 및 전세 사기 예방 분석 전문가입니다.
        
        [배경 정보: 계약서 분석 결과]
        {request.analysis_context}

        [작동 알고리즘 및 지시사항]
        1. 사용자의 질문에 답변할 때, 위 [계약서 분석 결과]를 바탕으로 세입자에게 가장 유리하고 안전한 방향으로 조언하십시오.
        2. 임대차 보호법 등 일반적인 법리나 상식을 바탕으로 일반인이 이해하기 쉬운 말로 풀어서 설명해 주십시오.
        """
        
        # ✨ 모델명 수정: gemini-1.5-flash
        response = gemini_client.models.generate_content(
            model="gemini-1.5-flash", 
            contents=request.user_message,
            config=types.GenerateContentConfig(
                system_instruction=sys_instruct,
                max_output_tokens=2048, 
                temperature=0.7
            )
        )
        return {"reply": response.text}
        
    except Exception as e:
        print(f"❌ 챗봇 서버 에러 상세: {str(e)}") 
        raise HTTPException(status_code=500, detail=str(e))