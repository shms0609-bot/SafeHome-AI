import os
import requests
import base64
import urllib.parse
import json
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.genai import Client, types
from dotenv import load_dotenv

from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# 🌟 수정 1: 환경 변수 강제 새로고침 옵션 (override=True)
load_dotenv(override=True)

# ==========================================
# 🌟 1. DB 설정 (SQLAlchemy)
# ==========================================
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class UserTable(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    password = Column(String)
    username = Column(String)

class RealEstateHistoryTable(Base):
    __tablename__ = "real_estate_history"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(String, index=True) 
    address = Column(String)               
    pdf_base64 = Column(Text)              
    created_at = Column(DateTime, default=datetime.now)

try:
    Base.metadata.create_all(bind=engine)
    print("✅ DB 연동 및 테이블 생성 성공")
except Exception as e:
    print(f"❌ DB 연동 실패: {str(e)}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# 🌟 2. CODEF API 서비스
# ==========================================
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
        if not token: return {"error": "CODEF 토큰 발급 실패"}
        
        real_phone = os.getenv("REAL_ESTATE_PHONE", "01000000000")
        raw_password = os.getenv("REAL_ESTATE_PASSWORD", "1234")
        encrypted_password = self.encrypt_rsa(raw_password)
        
        # .env 파일에서 가져오기
        e_prepay_no = os.getenv("E_PREPAY_NO", "").replace("-", "").strip()
        e_prepay_pass = os.getenv("E_PREPAY_PASS", "").strip()
        
        # 🌟 수정 2: 만약 .env 파일 적용이 안 돼서 또 똑같은 에러가 난다면,
        # 아래 두 줄의 제일 앞 '#' 기호를 지우고 강제로 번호를 코드에 박아버리세요! (하드코딩)
        # e_prepay_no = "H82003788709"
        # e_prepay_pass = "160212"
        
        print(f"\n--- 🕵️ 결제 정보 체크 ---")
        print(f"전송할 캐시 번호 길이: {len(e_prepay_no)} (12자리 필수)")
        print(f"전송할 캐시 비번 길이: {len(e_prepay_pass)} (4~6자리 필수)")
        print(f"---------------------------\n")

        if not e_prepay_no:
            return {"error": ".env 파일에서 캐시 번호를 못 읽어왔습니다! VS Code 터미널을 완전히 껐다 켜주세요."}
        
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
            "issueType": "0",         
            "originDataYN": "1",      
            "registerSummaryYN": "1",
            "ePrepayNo": e_prepay_no,
            "ePrepayPass": e_prepay_pass,  # 암호화 없이 Plain Text 전송
            **params
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload)
            return json.loads(urllib.parse.unquote(response.text))
        except Exception as e:
            return {"error": str(e)}

codef = CodefService()

# ==========================================
# 🌟 3. 데이터 모델 및 API
# ==========================================
class UserRegister(BaseModel):
    user_id: str
    password: str
    username: str = None

class LoginRequest(BaseModel):
    user_id: str
    password: str

class RealEstateRequest(BaseModel):
    user_id: str 
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

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

api_key = os.getenv("GEMINI_API_KEY")
gemini_client = Client(api_key=api_key) if api_key else None

@app.post("/register")
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(UserTable).filter(UserTable.user_id == user_data.user_id).first()
    if existing: raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
    new_user = UserTable(user_id=user_data.user_id, password=user_data.password, username=user_data.username or user_data.user_id)
    db.add(new_user); db.commit(); return {"message": "가입 성공"}

@app.post("/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserTable).filter(UserTable.user_id == req.user_id, UserTable.password == req.password).first()
    if not user: raise HTTPException(status_code=401, detail="정보 불일치")
    return {"access_token": "valid"}

@app.post("/fetch-real-estate")
async def fetch_info(request: RealEstateRequest, db: Session = Depends(get_db)):
    codef_params = request.dict()
    user_id = codef_params.pop("user_id", None)
    
    res = codef.get_real_estate_register(codef_params)
    
    if res.get("data"):
        data_obj = res["data"][0] if isinstance(res["data"], list) else res["data"]
        pdf_data = data_obj.get("resOriGinalData") or data_obj.get("resoriGinalData")
        
        if pdf_data:
            full_addr = f"{request.addr_sido} {request.addr_roadName} {request.addr_buildingNumber} {request.dong} {request.ho}".strip()
            new_history = RealEstateHistoryTable(
                owner_id=user_id,
                address=full_addr,
                pdf_base64=pdf_data
            )
            db.add(new_history)
            db.commit()
            
    return res

@app.get("/real-estate-history/{user_id}")
async def get_history(user_id: str, db: Session = Depends(get_db)):
    histories = db.query(RealEstateHistoryTable).filter(RealEstateHistoryTable.owner_id == user_id).order_by(RealEstateHistoryTable.created_at.desc()).all()
    return histories

@app.post("/analyze")
async def analyze_contract(file: UploadFile = File(...)):
    if not gemini_client: raise HTTPException(status_code=500, detail="Gemini API 키 오류")
    try:
        contents = await file.read()
        image_part = types.Part.from_bytes(data=contents, mime_type=file.content_type)
        prompt = "귀하는 대한민국 부동산 법률 분석 AI입니다. 계약서 이미지를 정밀 분석하여 위험도를 평가하고 마크다운 리포트를 작성하세요."
        response = gemini_client.models.generate_content(model="gemini-1.5-flash", contents=[prompt, image_part])
        return {"analysis": response.text}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    if not gemini_client: raise HTTPException(status_code=500, detail="Gemini API 키 오류")
    try:
        sys_instruct = f"당신은 SafeHome AI 임대차 분쟁 전문가입니다. 다음 분석 결과를 바탕으로 상담하세요: {request.analysis_context}"
        response = gemini_client.models.generate_content(
            model="gemini-1.5-flash", 
            contents=request.user_message,
            config=types.GenerateContentConfig(system_instruction=sys_instruct, max_output_tokens=2048, temperature=0.7)
        )
        return {"reply": response.text}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))