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

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    print(f"✅ 성공: API KEY 로드 완료 ({api_key[:10]}...)")
else:
    print("❌ 에러: GEMINI_API_KEY가 .env 파일에 없습니다.")

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
        
        # 🌟 대법원 매뉴얼 필수 조건: 비밀번호는 무조건 4자리 숫자여야 함
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
            "realtyType": "1", # 집합건물 기본값
            "jointMortgageJeonseYN": "1",
            "tradingYN": "1",
            "issueType": "2", # ✨ 2: 고유번호 조회 (결제 필요 없는 무료 테스트용)
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
            
            # 추가 인증이 필요한 경우 (CF-03002)
            if res_data.get("result", {}).get("code") == "CF-03002":
                return {"status": "NEED_2WAY", "data": res_data.get("data")}
                
            return res_data
            
        except Exception as e:
            return {"error": f"백엔드 통신 에러: {str(e)}"}

codef = CodefService()

# 🌟 대법원 규격에 맞게 파라미터 분리 (inquiryType 3 기준)
class RealEstateRequest(BaseModel):
    addr_sido: str
    addr_sigungu: str
    addr_roadName: str = ""
    addr_buildingNumber: str = ""
    dong: str = ""
    ho: str = ""

class ChatRequest(BaseModel):
    user_message: str
    analysis_context: str

@app.get("/ping")
async def ping():
    return {"message": "pong"}

@app.post("/fetch-real-estate")
async def fetch_info(request: RealEstateRequest):
    print(f"🏢 실시간 조회 요청 수신: {request.addr_sido} {request.addr_sigungu} {request.addr_roadName}")
    result = codef.get_real_estate_register(request.dict())
    return result

@app.post("/analyze")
async def analyze_contract(file: UploadFile = File(...)):
    print(f"--- 📥 분석 요청 수신: {file.filename} ---")
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
        response = gemini_client.models.generate_content(
            model="gemini-flash-latest", 
            contents=[prompt, image_part]
        )
        return {"analysis": response.text}
        
    except Exception as e:
        print(f"❌ 분석 중 서버 에러 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Gemini API 키 오류")
        
    try:
        system_instruction = f"""
        당신은 SafeHome AI 임대차 하자 보수 분쟁 분석 전문가입니다.
        
        [배경 정보: 계약서 분석 결과]
        {request.analysis_context}

        [작동 알고리즘: 단계별 질문 시스템]
        사용자가 하자를 언급하면 즉시 판별하지 말고, 다음 질문을 한 번에 하나씩 차례대로 던져 사실관계를 먼저 확인하라.
        
        1단계 (발생 시점): "입주 시점부터 그랬나요, 아니면 거주 중에 발생했나요?"
        2단계 (부위 및 상태): "구체적인 위치가 어디이며, 소모품인가요 아니면 대규모 시설물인가요?"
        3단계 (관리 노력): "하자를 발견하고 임대인에게 즉시 알렸나요? 직접 조치한 사항이 있나요?"

        [최종 종합 분석 가이드라인]
        3단계 답변이 모두 완료되면 법리(민법 제623조, 제374조 등)를 바탕으로 분석 결과를 요약해 주십시오.
        """
        response = gemini_client.models.generate_content(
            model="gemini-flash-latest",
            contents=[system_instruction, request.user_message]
        )
        return {"reply": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))