from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.genai import Client, types
import os
import requests
import base64
import urllib.parse
import json
import xml.etree.ElementTree as ET 
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

# 서버 시작 시 환경 변수 로드 상태 확인
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    print(f"✅ 성공: API KEY 로드 완료 ({api_key[:10]}...)")
else:
    print("❌ 에러: GEMINI_API_KEY가 로드되지 않았습니다.")

gemini_client = Client(api_key=api_key) if api_key else None

# ✨ AI 성능 튜닝: 속도는 높이고 대답 길이는 넉넉하게!
ai_config = {
    "temperature": 0.7,
    "max_output_tokens": 2048,  # 토큰 양을 늘려 대답이 잘리지 않게 함
    "top_p": 0.95,
}

class CodefService:
    def __init__(self):
        self.client_id = os.getenv("CODEF_CLIENT_ID")
        self.client_secret = os.getenv("CODEF_CLIENT_SECRET")
        self.public_key = os.getenv("CODEF_PUBLIC_KEY", "") 
        self.base_url = "https://development.codef.io/v1" 

    def encrypt_rsa(self, text: str) -> str:
        if not self.public_key: return ""
        try:
            key_der = base64.b64decode(self.public_key)
            key_pub = RSA.import_key(key_der)
            cipher = PKCS1_v1_5.new(key_pub)
            encrypted = cipher.encrypt(text.encode('utf-8'))
            return base64.b64encode(encrypted).decode('utf-8')
        except: return ""

    def get_access_token(self):
        try:
            auth_str = f"{self.client_id}:{self.client_secret}"
            b64_auth = base64.b64encode(auth_str.encode()).decode()
            url = "https://oauth.codef.io/oauth/token"
            headers = {"Authorization": f"Basic {b64_auth}", "Content-Type": "application/x-www-form-urlencoded"}
            data = {"grant_type": "client_credentials"}
            response = requests.post(url, headers=headers, data=data)
            return response.json().get("access_token")
        except: return None

    def get_real_estate_register(self, params: dict):
        token = self.get_access_token()
        if not token: return {"error": "CODEF API 토큰 발급 실패"}
        
        real_phone = os.getenv("REAL_ESTATE_PHONE", "01000000000")
        raw_password = os.getenv("REAL_ESTATE_PASSWORD", "1234")
        encrypted_password = self.encrypt_rsa(raw_password)
        
        url = f"{self.base_url}/kr/public/ck/real-estate-register/status" 
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        payload = {
            "organization": "0002", "phoneNo": real_phone, "password": encrypted_password, 
            "inquiryType": params.get("inquiryType", "3"), "realtyType": params.get("realtyType", "1"),
            "jointMortgageJeonseYN": "1", "tradingYN": "1", "issueType": "2", 
            "ePrepayNo": "", "ePrepayPass": "", "registerSummaryYN": "1", **params
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload)
            res_data = json.loads(urllib.parse.unquote(response.text))
            return res_data
        except: return {"error": "통신 에러"}

codef = CodefService()

class OpenLawService:
    def __init__(self):
        self.api_key = os.getenv("OPEN_LAW_API_KEY")
        self.base_url = "http://www.law.go.kr/DRF/lawSearch.do"

    def get_fallback_data(self):
        return """■ 사건명: 임대차보증금등·손해배상(기)
■ 판결요지: 임대인은 사용·수익에 필요한 상태를 유지할 의무가 있다. 대규모 하자는 집주인 부담이다. (2011다107405)
■ 사건명: 손해배상(기)
■ 판결요지: 대규모 수선은 특약이 있어도 집주인이 수리해야 한다. (94다34692)"""

    def search_precedent(self, keyword="임대차 하자보수"):
        try:
            url = f"{self.base_url}?OC={self.api_key}&target=prec&type=XML&query={urllib.parse.quote(keyword)}"
            response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=3)
            root = ET.fromstring(response.text)
            prec_list = []
            for item in root.findall('.//prec')[:2]: 
                title = item.findtext('사건명')
                content = item.findtext('판결요지', default='요지 없음').replace('<![CDATA[', '').replace(']]>', '').strip()
                prec_list.append(f"■ {title}\n{content}")
            return "\n\n".join(prec_list) if prec_list else self.get_fallback_data()
        except:
            return self.get_fallback_data()

open_law = OpenLawService()

class RealEstateRequest(BaseModel):
    addr_sido: str; addr_sigungu: str; addr_roadName: str = ""; addr_buildingNumber: str = ""
    dong: str = ""; ho: str = ""; realtyType: str = "1" 

class ChatRequest(BaseModel):
    user_message: str; analysis_context: str

@app.post("/analyze")
async def analyze_contract(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image_part = types.Part.from_bytes(data=contents, mime_type=file.content_type)
        prompt = "대한민국 부동산 법률 분석 AI로서 계약서를 분석하고 위험도를 평가하십시오."
        
        # ✨ gemini-2.0-flash 모델명 사용 (가장 빠름)
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash", 
            contents=[prompt, image_part],
            config=ai_config
        )
        return {"analysis": response.text}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    try:
        real_law_data = open_law.search_precedent("임대차 하자보수")
        prompt = f"판례 전문가로서 다음 질문에 답하세요.\n[판례]\n{real_law_data}\n\n[계약분석]\n{request.analysis_context}\n\n[질문]\n{request.user_message}"
        
        # ✨ gemini-2.0-flash 모델명 사용 (404 에러 방지)
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=ai_config
        )
        return {"reply": response.text}
    except Exception as e:
        print(f"❌ 챗봇 오류: {str(e)}")
        return {"reply": "법률 판례를 해석하는 중 오류가 발생했습니다. 잠시 후 다시 질문해 주세요."}

@app.get("/ping")
async def ping(): return {"message": "pong"}

@app.post("/fetch-real-estate")
async def fetch_info(request: RealEstateRequest):
    return codef.get_real_estate_register(request.dict())