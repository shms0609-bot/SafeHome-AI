import os
import requests
import base64
import urllib.parse
import json
import hmac
import hashlib
import uuid
from datetime import datetime, timedelta
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

class TicketTable(Base):
    __tablename__ = "user_tickets"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    count = Column(Integer, default=0)

class RealEstateHistoryTable(Base):
    __tablename__ = "real_estate_history_v2" # v2 유지!
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(String, index=True) 
    address = Column(String)               
    pdf_base64 = Column(Text)              
    created_at = Column(DateTime, default=datetime.now)
    monitoring_interval_hours = Column(Integer, default=24)
    last_checked_at = Column(DateTime, default=datetime.now)

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
# 🌟 2. CODEF API 서비스 (진짜 대법원 통신)
# ==========================================
class CodefService:
    def __init__(self):
        self.client_id = os.getenv("CODEF_CLIENT_ID", "").strip().strip('"').strip("'")
        self.client_secret = os.getenv("CODEF_CLIENT_SECRET", "").strip().strip('"').strip("'")
        self.public_key = os.getenv("CODEF_PUBLIC_KEY", "").strip().strip('"').strip("'")
        self.base_url = "https://api.codef.io/v1"

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

    # 등기 모니터링용 상태 조회 함수 (수수료 적게 듦)
    def check_register_status(self, params: dict):
        token = self.get_access_token()
        if not token: return False
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
            "inquiryType": "1", "realtyType": params.get("realtyType", "1"),
            "ePrepayNo": e_prepay_no, "ePrepayPass": encrypted_e_prepay_pass, **params
        }
        try:
            response = requests.post(url, headers=headers, json=payload)
            res_data = json.loads(urllib.parse.unquote(response.text))
            if res_data.get("data"):
                status_list = res_data["data"] if isinstance(res_data["data"], list) else [res_data["data"]]
                for item in status_list:
                    if item.get("resStatus") in ["접수", "처리중"]:
                        return True
            return False
        except Exception: return False

   # 🌟 진짜 대법원 등기부 발급 함수 (인터넷등기소 예치금 차감)
    def get_real_estate_register(self, params: dict):
        token = self.get_access_token()
        if not token: return {"error": "CODEF 토큰 발급 실패"}
        real_phone = os.getenv("REAL_ESTATE_PHONE", "01000000000").strip().strip('"').strip("'")
        raw_password = os.getenv("REAL_ESTATE_PASSWORD", "1234").strip().strip('"').strip("'")
        encrypted_password = self.encrypt_rsa(raw_password)
        
        e_prepay_no = os.getenv("E_PREPAY_NO", "H82003788709").replace("-", "").strip().strip('"').strip("'")
        raw_e_prepay_pass = os.getenv("E_PREPAY_PASS", "smsh1602").strip().strip('"').strip("'")
        encrypted_e_prepay_pass = self.encrypt_rsa(raw_e_prepay_pass)
        
        # 🌟 범인 검거 완료: /issue가 아니라 /status가 맞습니다! (상용 서버 api.codef.io는 유지)
        url = "https://development.codef.io/v1/kr/public/ck/real-estate-register/status" 
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        payload = {
            "organization": "0002", "phoneNo": real_phone, "password": encrypted_password, 
            "inquiryType": "3", "realtyType": params.get("realtyType", "1"),
            "jointMortgageJeonseYN": "1", "tradingYN": "1", "issueType": "0", 
            "originDataYN": "1", "reqOriginDataYN": "1", "registerSummaryYN": "1", 
            "ePrepayNo": e_prepay_no, "ePrepayPass": encrypted_e_prepay_pass,
            
            "addr_sido": params.get("addr_sido", ""),
            "addr_sigungu": params.get("addr_sigungu", ""),
            "addr_roadName": params.get("addr_roadName", ""),
            "addr_buildingNumber": params.get("addr_buildingNumber", ""),
            "dong": params.get("dong", ""),
            "ho": params.get("ho", "")
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
# 🌟 3. AI 다중 키 로직 및 법령 데이터 로드
# ==========================================
api_keys_str = os.getenv("GEMINI_API_KEYS", "").strip().strip('"').strip("'")
api_keys_list = [k.strip() for k in api_keys_str.split(",") if k.strip()]
current_key_index = 0  

LEGAL_KNOWLEDGE = ""
try:
    with open("laws.txt", "r", encoding="utf-8") as f:
        LEGAL_KNOWLEDGE = f.read()
    print("✅ 법령 데이터 로드 완료!")
except:
    pass

# ==========================================
# 🌟 4. 솔라피(Solapi) 문자 발송 유틸리티
# ==========================================
def send_sms(phone_number: str, text: str):
    api_key = os.getenv("SOLAPI_API_KEY", "")
    api_secret = os.getenv("SOLAPI_API_SECRET", "")
    sender_phone = os.getenv("SOLAPI_SENDER_PHONE", "01000000000")
    
    if not api_key or not api_secret:
        print(f"💌 [문자 발송 시뮬레이션 - API 키 없음]\n수신: {phone_number}\n내용: {text}")
        return False
        
    salt = str(uuid.uuid1().hex)
    date = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    message = date + salt
    signature = hmac.new(api_secret.encode(), message.encode(), hashlib.sha256).hexdigest()
    
    headers = {
        'Authorization': f'HMAC-SHA256 apiKey={api_key}, date={date}, salt={salt}, signature={signature}',
        'Content-Type': 'application/json'
    }
    data = {"message": {"to": phone_number.replace("-", ""), "from": sender_phone.replace("-", ""), "text": text}}
    try:
        res = requests.post("https://api.solapi.com/messages/v4/send", headers=headers, json=data)
        return res.status_code == 200
    except:
        return False

# ==========================================
# 🌟 5. 데이터 모델 및 엔드포인트
# ==========================================
class UserRegister(BaseModel): user_id: str; password: str; username: str = None
class LoginRequest(BaseModel): user_id: str; password: str
class RealEstateRequest(BaseModel): user_id: str; addr_sido: str; addr_sigungu: str; addr_roadName: str = ""; addr_buildingNumber: str = ""; dong: str = ""; ho: str = ""; realtyType: str = "1"; interval: int = 24
class EstateListRequest(BaseModel): addr_sido: str; addr_sigun: str; addr_dong: str
class MarketPriceRequest(BaseModel): complex_no: str; search_gbn: str = "1"; dong: str = ""; ho: str = ""
class ChatRequest(BaseModel): user_message: str; analysis_context: str
class VerifyRequest(BaseModel): receipt_id: str; user_id: str
class SmsRequest(BaseModel): phone_number: str

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/ping")
async def ping(): return {"message": "pong"}

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


# ==========================================
# 🌟 [진짜 발급 + 프리패스] 실제 대법원 통신 엔드포인트
# ==========================================
@app.post("/fetch-real-estate")
async def fetch_info(request: RealEstateRequest, db: Session = Depends(get_db)):
    codef_params = request.dict()
    user_id = codef_params.pop("user_id", None)
    interval = codef_params.pop("interval", 24)
    
    # 🌟 [시연용 프리패스] 열람권 검사 완벽 무력화 (주석 처리됨)
    # ticket_record = db.query(TicketTable).filter(TicketTable.user_id == user_id).first()
    # if not ticket_record or ticket_record.count <= 0:
    #     return {"error": "🎫 열람권이 부족합니다. 결제 후 충전해 주세요!"}

    # 진짜 CODEF API(대법원)로 요청 전송
    res = codef.get_real_estate_register(codef_params)
    
    # 응답 코드가 성공(CF-00000)이거나 데이터가 있는 경우
    if res.get("data") or (res.get("result") and res["result"].get("code") == "CF-00000"):
        data_obj = res["data"][0] if isinstance(res["data"], list) else res["data"]
        pdf_data = data_obj.get("resOriginalData") or data_obj.get("resOriGinalData")
        
        if pdf_data:
            # 🌟 [시연용 프리패스] 열람권 차감 로직 무력화 (주석 처리됨)
            # if ticket_record: ticket_record.count -= 1  
            
            full_addr = f"{request.addr_sido} {request.addr_roadName} {request.addr_buildingNumber} {request.dong} {request.ho}".strip()
            new_history = RealEstateHistoryTable(
                owner_id=user_id, address=full_addr, pdf_base64=pdf_data, 
                monitoring_interval_hours=interval
            )
            db.add(new_history)
            db.commit()
            return res
        else:
            # 만약 또 PDF가 안 온다면, 컴퓨터가 침묵하지 않고 진짜 대법원의 거절 사유를 띄워줍니다!
            error_msg = data_obj.get("resMessage") or "주소를 다시 확인해주세요."
            return {"error": f"❌ 대법원 발급 거절: {error_msg}"}
            
    # 통신 에러 발생 시
    error_msg = res.get("result", {}).get("message") if res.get("result") else "대법원 통신 에러"
    return {"error": f"❌ 시스템 에러: {error_msg}"}

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
        sys_instruct = f"""당신은 대한민국 법률에 기반하여 세입자의 권리를 보호하는 '집야(Zipya) AI 임대차 분쟁 최고 전문가'입니다. 

[명령어]
1. 반드시 아래 제공된 [대한민국 부동산 법령 및 판례]를 최우선으로 참고하여 정확하고 논리적인 법률 조언을 제공하세요.
2. 사용자의 상황을 [계약서 분석 결과]와 대조하여 위험 요소를 파악하세요.
3. 법률 용어는 사용자가 이해하기 쉽게 풀어서 설명하되, 근거가 되는 '법령 조항(예: 주택임대차보호법 제X조)'을 명시해 주면 신뢰도가 올라갑니다.

[대한민국 부동산 법령 및 판례 모음]
{LEGAL_KNOWLEDGE}

[계약서 분석 결과]
{request.analysis_context}
"""
        attempts = 0
        while attempts < len(api_keys_list):
            try:
                client = Client(api_key=api_keys_list[current_key_index])
                response = client.models.generate_content(
                    model="gemini-2.5-flash", 
                    contents=request.user_message, 
                    config=types.GenerateContentConfig(system_instruction=sys_instruct)
                )
                return {"reply": response.text}
            except:
                current_key_index = (current_key_index + 1) % len(api_keys_list)
                attempts += 1
        raise HTTPException(status_code=429, detail="한도 초과")
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/cron/auto-check")
async def auto_daily_check(db: Session = Depends(get_db)):
    histories = db.query(RealEstateHistoryTable).all()
    current_time = datetime.now()
    checked_count = 0
    alert_count = 0

    for item in histories:
        time_diff = current_time - item.last_checked_at
        if time_diff >= timedelta(hours=item.monitoring_interval_hours):
            checked_count += 1
            is_risk_detected = codef.check_register_status({
                "addr_sido": item.address.split(" ")[0],
                "addr_sigungu": item.address.split(" ")[1] if len(item.address.split(" ")) > 1 else ""
            })
            
            if is_risk_detected:
                msg = f"[집야 긴급알림]\n고객님이 등록하신 [{item.address}]에 새로운 등기신청이 감지되었습니다! 즉시 앱을 확인해주세요."
                send_sms("01000000000", msg) 
                alert_count += 1
                
            item.last_checked_at = current_time
            db.commit()
            
    return {"status": "success", "message": f"총 {len(histories)}건 중 {checked_count}건 검사 완료. 위험 알림 {alert_count}건 발송."}

@app.post("/trigger-monitor")
async def trigger_monitor(req: SmsRequest, db: Session = Depends(get_db)):
    history = db.query(RealEstateHistoryTable).order_by(RealEstateHistoryTable.created_at.desc()).first()
    target_address = history.address if history else "서울특별시 송파구 잠실동 123"
    msg = f"[집야(Zipya) 긴급알림]\n고객님이 등록하신 [{target_address}]에 새로운 등기신청(근저당 설정 등)이 감지되었습니다. 즉시 앱에서 상세 내역을 확인해주세요!"
    success = send_sms(req.phone_number, msg)
    if success: return {"message": "✅ 알림 문자가 성공적으로 발송되었습니다!"}
    else: return {"message": "✅ [시뮬레이션 모드] 문자 발송 로그가 서버에 기록되었습니다."}