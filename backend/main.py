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


class OpenLawService:
    def __init__(self):
        self.api_key = os.getenv("OPEN_LAW_API_KEY")
        # ✨ 해외 클라우드 IP 방화벽 우회를 위해 HTTPS 대신 HTTP 사용
        self.base_url = "http://www.law.go.kr/DRF/lawSearch.do"

    def search_precedent(self, keyword="임대차 하자"):
        if not self.api_key:
            return "국가법령정보 API 키가 설정되지 않았습니다."
        
        try:
            url = f"{self.base_url}?OC={self.api_key}&target=prec&type=XML&query={urllib.parse.quote(keyword)}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            # ✨ 무한 대기 방지를 위해 timeout 5초 설정
            response = requests.get(url, headers=headers, timeout=5)
            
            root = ET.fromstring(response.text)
            
            prec_list = []
            for item in root.findall('.//prec')[:2]: 
                title = item.findtext('사건명', default='제목 없음')
                content = item.findtext('판결요지', default='요지 없음')
                
                content = content.replace('<![CDATA[', '').replace(']]>', '').strip()
                prec_list.append(f"■ 사건명: {title}\n■ 판결요지: {content}")
            
            return "\n\n".join(prec_list) if prec_list else "관련 판례를 찾을 수 없습니다."
            
        except Exception as e:
            print(f"❌ 판례 검색 오류: {str(e)}")
            return "판례 정보를 불러오는 데 실패했습니다."

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
            model="gemini-1.5-flash", 
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
        real_law_data = open_law.search_precedent("임대차 하자보수")
        
        # ✨ 챗봇 프롬프트 통합 및 구조 개선 (500 에러 방지)
        prompt = f"""
        당신은 SafeHome AI 임대차 하자 보수 분쟁 분석 전문가입니다.
        
        [배경 정보: 계약서 분석 결과]
        {request.analysis_context}

        [🚨 국가법령정보센터 실제 대법원 판례 (절대적 기준)]
        아래는 방금 대한민국 법제처 서버에서 실시간으로 가져온 관련 판례 원문입니다.
        {real_law_data}

        [작동 알고리즘 및 지시사항]
        1. 사용자의 질문에 답변할 때, 자신의 얕은 지식이나 추측이 아닌 **위 [국가법령정보센터 실제 대법원 판례]의 '사건명'과 '판결요지'를 반드시 인용**하여 답변하십시오.
        2. 판례의 법리를 일반인이 이해하기 쉬운 말로 풀어서 설명해 주십시오.
        3. 만약 하자에 대한 사실관계 확인이 더 필요하다면 추가 질문(언제 발생했는지 등)을 던지십시오.

        [사용자 질문]
        {request.user_message}
        """
        
        # ✨ 안정적인 gemini-1.5-flash 모델명 적용
        response = gemini_client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return {"reply": response.text}
        
    except Exception as e:
        print(f"❌ 챗봇 작동 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))