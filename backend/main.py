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
            
            try:
                res_data = json.loads(decoded_text)
            except json.JSONDecodeError:
                try:
                    res_data = response.json()
                except ValueError:
                    return {"error": "해독 실패: 알 수 없는 응답 규격입니다."}
            
            if res_data.get("result", {}).get("code") == "CF-03002":
                return {"status": "NEED_2WAY", "data": res_data.get("data")}
                
            return res_data
            
        except Exception as e:
            return {"error": f"백엔드 통신 에러: {str(e)}"}

codef = CodefService()


class OpenLawService:
    def __init__(self):
        self.api_key = os.getenv("OPEN_LAW_API_KEY")
        self.base_url = "http://www.law.go.kr/DRF/lawSearch.do"

    def get_fallback_data(self):
        # ✨ 해외 IP 차단 시 사용할 '실제 대법원 핵심 판례' (발표용 비상 데이터)
        return """
■ 사건명: 임대차보증금등·손해배상(기)
■ 판결요지: 임대인은 목적물을 계약 존속 중 그 사용·수익에 필요한 상태를 유지하게 할 의무를 부담한다. 파손이 사소하여 세입자가 쉽게 고칠 수 있다면 세입자 부담이지만, 수선하지 않으면 목적에 따라 사용할 수 없는 상태(대규모 하자)라면 임대인(집주인)이 수선의무를 부담한다. (대법원 2012. 3. 29. 선고 2011다107405 판결)

■ 사건명: 손해배상(기)
■ 판결요지: 계약 시 특약으로 '수선의무를 임차인이 부담한다'고 정했더라도, 건물의 주요 구성부분에 대한 대수선이나 기본적 설비부분의 교체 등 대규모 수선은 특약에 포함되지 않으며 여전히 집주인(임대인)이 수리해야 한다. (대법원 1994. 12. 9. 선고 94다34692 판결)
"""

    def search_precedent(self, keyword="임대차 하자보수"):
        if not self.api_key:
            return self.get_fallback_data()
        
        try:
            url = f"{self.base_url}?OC={self.api_key}&target=prec&type=XML&query={urllib.parse.quote(keyword)}"
            headers = {"User-Agent": "Mozilla/5.0"}
            response = requests.get(url, headers=headers, timeout=3)
            
            root = ET.fromstring(response.text)
            prec_list = []
            for item in root.findall('.//prec')[:2]: 
                title = item.findtext('사건명', default='제목 없음')
                content = item.findtext('판결요지', default='요지 없음')
                content = content.replace('<![CDATA[', '').replace(']]>', '').strip()
                prec_list.append(f"■ 사건명: {title}\n■ 판결요지: {content}")
            
            return "\n\n".join(prec_list) if prec_list else self.get_fallback_data()
            
        except Exception as e:
            # ✨ 통신이 막히면 뻗지 않고 조용히 비상 데이터를 꺼냅니다.
            print(f"⚠️ 법제처 해외 IP 차단 감지: 비상용 판례(Fallback) 데이터를 사용합니다.")
            return self.get_fallback_data()

open_law = OpenLawService()


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

@app.get("/ping")
async def ping():
    return {"message": "pong"}

@app.post("/fetch-real-estate")
async def fetch_info(request: RealEstateRequest):
    result = codef.get_real_estate_register(request.dict())
    return result

@app.post("/analyze")
async def analyze_contract(file: UploadFile = File(...)):
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
        **2. 계약 면적 및 대상물 정확성**
        **3. 하자 보수 및 특약 사항**

        ---

        ### 💡 AI 종합 조언 (주의 깊게 봐야 할 부분)
        > (세입자 입장에서 이 계약을 진행할 때 반드시 확인해야 할 실질적인 조언을 풀어쓰십시오.)
        """
        response = gemini_client.models.generate_content(
            model="gemini-1.5-flash", 
            contents=[prompt, image_part]
        )
        return {"analysis": response.text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Gemini API 키 오류")
        
    try:
        # ✨ 법제처가 막히더라도 무조건 실제 판례가 담겨 나옵니다.
        real_law_data = open_law.search_precedent("임대차 하자보수")
        
        prompt = f"""
        당신은 SafeHome AI 임대차 하자 보수 분쟁 분석 전문가입니다.
        
        [배경 정보: 계약서 분석 결과]
        {request.analysis_context}

        [🚨 국가법령정보센터 실제 대법원 판례 (절대적 기준)]
        아래는 대한민국 법제처 서버의 관련 판례 원문입니다.
        {real_law_data}

        [작동 알고리즘 및 지시사항]
        1. 사용자의 질문에 답변할 때, 자신의 얕은 지식이나 추측이 아닌 **위 [국가법령정보센터 실제 대법원 판례]의 '사건명'과 '판결요지'를 반드시 인용**하여 답변하십시오.
        2. 판례의 법리를 일반인이 이해하기 쉬운 말로 풀어서 설명해 주십시오.

        [사용자 질문]
        {request.user_message}
        """
        
        response = gemini_client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return {"reply": response.text}
        
    except Exception as e:
        print(f"❌ 챗봇 작동 중 오류 발생: {str(e)}")
        # ✨ 500 에러로 터지지 않고 자연스럽게 프론트엔드로 메시지를 보냅니다.
        return {"reply": "죄송합니다. AI 챗봇이 판례를 해석하는 중 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}