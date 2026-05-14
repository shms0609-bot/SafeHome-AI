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

load_dotenv(override=True)

# ==========================================
# 🌟 1. DB 설정 (SQLAlchemy)
# ==========================================
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
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

class TicketTable(Base):
    __tablename__ = "user_tickets"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    count = Column(Integer, default=0)

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"❌ DB 연동 실패: {str(e)}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# 🌟 2. CODEF API 서비스 (동/호수 조회 추가)
# ==========================================
class CodefService:
    def __init__(self):
        self.client_id = os.getenv("CODEF_CLIENT_ID", "").strip().strip('"').strip("'")
        self.client_secret = os.getenv("CODEF_CLIENT_SECRET", "").strip().strip('"').strip("'")
        self.public_key = os.getenv("CODEF_PUBLIC_KEY", "").strip().strip('"').strip("'")
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
        real_phone = os.getenv("REAL_ESTATE_PHONE", "01000000000").strip().strip('"').strip("'")
        raw_password = os.getenv("REAL_ESTATE_PASSWORD", "1234").strip().strip('"').strip("'")
        encrypted_password = self.encrypt_rsa(raw_password)
        e_prepay_no = os.getenv("E_PREPAY_NO", "H82003788709").replace("-", "").strip().strip('"').strip("'")
        raw_e_prepay_pass = os.getenv("E_PREPAY_PASS", "smsh1602").strip().strip('"').strip("'")
        encrypted_e_prepay_pass = self.encrypt_rsa(raw_e_prepay_pass)
        url = f"{self.base_url}/kr/public/ck/real-estate-register/status" 
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        payload = {
            "organization": "0002", "phoneNo": real_phone, "password": encrypted_password, 
            "inquiryType": params.get("inquiryType", "3"), "realtyType": params.get("realtyType", "1"),
            "jointMortgageJeonseYN": "1", "tradingYN": "1", "issueType": "0", "originDataYN": "1",      
            "registerSummaryYN": "1", "ePrepayNo": e_prepay_no, "ePrepayPass": encrypted_e_prepay_pass, **params
        }
        try:
            response = requests.post(url, headers=headers, json=payload)
            return json.loads(urllib.parse.unquote(response.text))
        except Exception as e: return {"error": str(e)}

    def get_estate_list(self, params: dict):
        token = self.get_access_token()
        if not token: return {"error": "CODEF 토큰 발급 실패"}
        url = f"{self.base_url}/kr/public/lt/real-estate-board/estate-list"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        payload = {"organization": "0011", "addrSido": params.get("addr_sido", ""), "addrSigun": params.get("addr_sigun", ""), "addrDong": params.get("addr_dong", "")}
        try:
            response = requests.post(url, headers=headers, json=payload)
            return json.loads(urllib.parse.unquote(response.text))
        except Exception as e: return {"error": str(e)}

    def get_market_price(self, params: dict):
        token = self.get_access_token()
        if not token: return {"error": "CODEF 토큰 발급 실패"}
        url = f"{self.base_url}/kr/public/lt/real-estate-board/market-price-information"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        # 🌟 동, 호 파라미터 반영 및 searchGbn 처리
        payload = {
            "organization": "0011", 
            "searchGbn": params.get("search_gbn", "1"), 
            "complexNo": params.get("complex_no"),
            "dong": params.get("dong", ""),
            "ho": params.get("ho", "")
        }
        try:
            response = requests.post(url, headers=headers, json=payload)
            return json.loads(urllib.parse.unquote(response.text))
        except Exception as e: return {"error": str(e)}

codef = CodefService()

# ==========================================
# 🌟 3. AI API 다중 키(로테이션) 로직
# ==========================================
api_keys_str = os.getenv("GEMINI_API_KEYS", "").strip().strip('"').strip("'")
api_keys_list = [k.strip() for k in api_keys_str.split(",") if k.strip()]
current_key_index = 0  

# ==========================================
# 🌟 4. 데이터 모델 및 API 엔드포인트
# ==========================================
class UserRegister(BaseModel): user_id: str; password: str; username: str = None
class LoginRequest(BaseModel): user_id: str; password: str
class RealEstateRequest(BaseModel): user_id: str; addr_sido: str; addr_sigungu: str; addr_roadName: str = ""; addr_buildingNumber: str = ""; dong: str = ""; ho: str = ""; realtyType: str = "1" 
class EstateListRequest(BaseModel): addr_sido: str; addr_sigun: str; addr_dong: str
# 🌟 동/호 파라미터 추가
class MarketPriceRequest(BaseModel): complex_no: str; search_gbn: str = "1"; dong: str = ""; ho: str = ""
class ChatRequest(BaseModel): user_message: str; analysis_context: str
class VerifyRequest(BaseModel): receipt_id: str; user_id: str

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/ping")
async def ping(): return {"message": "pong"}

@app.get("/check-id/{user_id}")
async def check_id(user_id: str, db: Session = Depends(get_db)):
    existing = db.query(UserTable).filter(UserTable.user_id == user_id).first()
    return {"available": existing is None}

@app.post("/register")
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(UserTable).filter(UserTable.user_id == user_data.user_id).first()
    if existing: raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
    new_user = UserTable(user_id=user_data.user_id, password=user_data.password, username=user_data.username or user_data.user_id)
    db.add(new_user)
    new_ticket = TicketTable(user_id=user_data.user_id, count=0)
    db.add(new_ticket)
    db.commit()
    return {"message": "가입 성공"}

@app.post("/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserTable).filter(UserTable.user_id == req.user_id, UserTable.password == req.password).first()
    if not user: raise HTTPException(status_code=401, detail="정보 불일치")
    return {"access_token": "valid"}

@app.get("/user-info/{user_id}")
async def get_user_info(user_id: str, db: Session = Depends(get_db)):
    ticket_record = db.query(TicketTable).filter(TicketTable.user_id == user_id).first()
    if not ticket_record:
        ticket_record = TicketTable(user_id=user_id, count=0)
        db.add(ticket_record); db.commit(); db.refresh(ticket_record)
    return {"tickets": ticket_record.count}

@app.post("/payment/verify")
async def verify_payment(req: VerifyRequest, db: Session = Depends(get_db)):
    ticket_record = db.query(TicketTable).filter(TicketTable.user_id == req.user_id).first()
    if ticket_record:
        ticket_record.count += 1
        db.commit()
        return {"success": True, "tickets": ticket_record.count}
    raise HTTPException(status_code=400, detail="유저 정보를 찾을 수 없습니다.")

@app.post("/fetch-real-estate")
async def fetch_info(request: RealEstateRequest, db: Session = Depends(get_db)):
    codef_params = request.dict()
    user_id = codef_params.pop("user_id", None)
    ticket_record = db.query(TicketTable).filter(TicketTable.user_id == user_id).first()
    if not ticket_record or ticket_record.count <= 0:
        return {"error": "🎫 열람권이 부족합니다. 결제 후 충전해 주세요!"}

    res = codef.get_real_estate_register(codef_params)
    if res.get("data") or (res.get("result") and res["result"].get("code") == "CF-00000"):
        ticket_record.count -= 1
        db.commit()
        data_obj = res["data"][0] if isinstance(res["data"], list) else res["data"]
        pdf_data = data_obj.get("resOriGinalData") or data_obj.get("resoriGinalData")
        if pdf_data:
            full_addr = f"{request.addr_sido} {request.addr_roadName} {request.addr_buildingNumber} {request.dong} {request.ho}".strip()
            new_history = RealEstateHistoryTable(owner_id=user_id, address=full_addr, pdf_base64=pdf_data)
            db.add(new_history); db.commit()
    return res

@app.get("/real-estate-history/{user_id}")
async def get_history(user_id: str, db: Session = Depends(get_db)):
    return db.query(RealEstateHistoryTable).filter(RealEstateHistoryTable.owner_id == user_id).order_by(RealEstateHistoryTable.created_at.desc()).all()

@app.post("/fetch-estate-list")
async def fetch_estate_list(request: EstateListRequest):
    return codef.get_estate_list(request.dict())

@app.post("/fetch-market-price")
async def fetch_market_price(request: MarketPriceRequest):
    return codef.get_market_price(request.dict())

@app.post("/analyze")
async def analyze_contract(file: UploadFile = File(...)):
    global current_key_index
    try:
        contents = await file.read()
        image_part = types.Part.from_bytes(data=contents, mime_type=file.content_type)
        prompt = """귀하는 대한민국 부동산 법률 분석 AI입니다. 
        1. 이미지의 화질을 확인하세요. 판독이 불가능하면 다음 문구만 출력하세요: "⚠️ **이미지 판독 불가**\n\n더 선명한 사진으로 다시 업로드해 주세요."
        2. 판독이 가능하면 위험도를 평가하고 상세 마크다운 리포트를 작성하세요."""
        
        attempts = 0
        while attempts < len(api_keys_list):
            try:
                client = Client(api_key=api_keys_list[current_key_index])
                response = client.models.generate_content(model="gemini-2.5-flash", contents=[prompt, image_part])
                return {"analysis": response.text}
            except Exception as e:
                current_key_index = (current_key_index + 1) % len(api_keys_list)
                attempts += 1
        raise HTTPException(status_code=429, detail="한도 초과")
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    global current_key_index
    try:
        sys_instruct = f"당신은 SafeHome AI 임대차 분쟁 전문가입니다. 다음 분석 결과를 바탕으로 상담하세요: {request.analysis_context}"
        attempts = 0
        while attempts < len(api_keys_list):
            try:
                client = Client(api_key=api_keys_list[current_key_index])
                response = client.models.generate_content(model="gemini-2.5-flash", contents=request.user_message, config=types.GenerateContentConfig(system_instruction=sys_instruct))
                return {"reply": response.text}
            except:
                current_key_index = (current_key_index + 1) % len(api_keys_list)
                attempts += 1
        raise HTTPException(status_code=429, detail="한도 초과")
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))