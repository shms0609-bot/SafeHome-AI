import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sun, Moon, Send, FileSearch, Building2, ShieldCheck, MessageSquare, ArrowLeft, Upload, Search, MapPin, LogOut, Plus, Archive, TrendingUp, Building, Maximize2, Menu, X } from 'lucide-react';
import DaumPostcode from 'react-daum-postcode';

// 🌟 부트페이 결제 라이브러리
import { Bootpay } from '@bootpay/client-js';
import './App.css';

const API_BASE_URL = "https://safehome-ai-pkkv.onrender.com"; 

const formatKoreanPrice = (priceStr) => {
  const num = Number(priceStr);
  if (!num || num === 0) return "-";
  
  const eok = Math.floor(num / 10000);
  const man = num % 10000;
  
  if (eok > 0) {
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  return `${man.toLocaleString()}만원`;
};

function Login({ onLoginSuccess }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState(""); 
  const [name, setName] = useState("");
  
  const [isIdChecked, setIsIdChecked] = useState(false);
  const [isIdAvailable, setIsIdAvailable] = useState(false);

  const handleIdChange = (e) => {
    setId(e.target.value);
    setIsIdChecked(false);
    setIsIdAvailable(false);
  };

  const handleCheckId = async () => {
    if (!id.trim()) return alert("아이디를 먼저 입력해주세요.");
    try {
      const res = await fetch(`${API_BASE_URL}/check-id/${id}`);
      const data = await res.json();
      
      if (data.available) {
        alert("사용 가능한 아이디입니다! ✅");
        setIsIdAvailable(true);
        setIsIdChecked(true);
      } else {
        alert("이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요. ❌");
        setIsIdAvailable(false);
        setIsIdChecked(true);
      }
    } catch (err) {
      alert("중복 확인 통신에 실패했습니다.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRegisterMode) {
      if (!isIdChecked || !isIdAvailable) return alert("아이디 중복 확인을 먼저 완료해주세요.");
      if (pw !== pwConfirm) return alert("비밀번호와 비밀번호 확인이 일치하지 않습니다. 다시 확인해주세요.");
    }
    const endpoint = isRegisterMode ? '/register' : '/login';
    const payload = isRegisterMode ? { user_id: id, password: pw, username: name } : { user_id: id, password: pw };
    
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        if (isRegisterMode) {
          // 🌟 0장 지급이므로 가입 완료 문구만 깔끔하게 출력
          alert(`가입이 완료되었습니다! 로그인을 진행해 주세요. 🎉`);
          setIsRegisterMode(false); setName(""); setPwConfirm(""); setIsIdChecked(false); setIsIdAvailable(false);
        } else {
          localStorage.setItem('accessToken', data.access_token);
          localStorage.setItem('userId', id); 
          onLoginSuccess(id);
        }
      } else { alert("오류: " + (data.detail || "정보를 확인하세요.")); }
    } catch (err) { alert("서버 연결 실패!"); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-main)' }}>
      <div className="login-box" style={{ background: 'var(--card-bg)', padding: '40px', borderRadius: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', width: '90%', maxWidth: '420px', border: '1px solid var(--border)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <ShieldCheck size={32} /> {isRegisterMode ? "회원가입" : "로그인"}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isRegisterMode && <input type="text" placeholder="이름 (닉네임)" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }} required />}
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="아이디" value={id} onChange={handleIdChange} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }} required />
            {isRegisterMode && (
              <button type="button" onClick={handleCheckId} style={{ padding: '0 15px', borderRadius: '12px', background: isIdAvailable ? '#e6f4ea' : 'var(--card-bg)', border: `1px solid ${isIdAvailable ? '#34a853' : 'var(--border)'}`, color: isIdAvailable ? '#34a853' : 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                {isIdAvailable ? "확인 완료" : "중복 확인"}
              </button>
            )}
          </div>
          <input type="password" placeholder="비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} style={{ padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }} required />
          {isRegisterMode && <input type="password" placeholder="비밀번호 확인" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} style={{ padding: '15px', borderRadius: '12px', border: `1px solid ${pwConfirm && pw !== pwConfirm ? '#f44336' : 'var(--border)'}`, background: 'var(--bg-main)', color: 'var(--text)' }} required />}
          {isRegisterMode && pwConfirm && pw !== pwConfirm && <span style={{ color: '#f44336', fontSize: '0.85rem', marginTop: '-10px', marginLeft: '5px' }}>비밀번호가 일치하지 않습니다.</span>}
          <button type="submit" className="main-btn" style={{ padding: '15px', marginTop: '10px' }}>{isRegisterMode ? "가입하기" : "로그인"}</button>
        </form>
        <button type="button" onClick={() => { setIsRegisterMode(!isRegisterMode); setId(""); setPw(""); setPwConfirm(""); setIsIdChecked(false); setIsIdAvailable(false); }} style={{ marginTop: '20px', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', width: '100%' }}>
          {isRegisterMode ? "로그인으로 돌아가기" : "계정이 없으신가요? 회원가입"}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState("");
  const [theme, setTheme] = useState('light');
  const [currentView, setCurrentView] = useState('home');
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 🌟 내 티켓 정보 State
  const [tickets, setTickets] = useState(0);

  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [freeChatLoading, setFreeChatLoading] = useState(false);
  const [freeChatInput, setFreeChatInput] = useState("");
  const [freeMessages, setFreeMessages] = useState([]);

  const [chatOffset, setChatOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(""); 
  const [regResult, setRegResult] = useState(null);
  const [regLoading, setRegLoading] = useState(false);
  const [regSido, setRegSido] = useState("");
  const [regSigungu, setRegSigungu] = useState("");
  const [regRoadName, setRegRoadName] = useState("");
  const [regBldNum, setRegBldNum] = useState("");
  const [regDong, setRegDong] = useState("");
  const [regHo, setRegHo] = useState("");
  const [regRealtyType, setRegRealtyType] = useState("1");
  const [regHistory, setRegHistory] = useState([]); 

  const [searchSido, setSearchSido] = useState("");
  const [searchSigun, setSearchSigun] = useState("");
  const [searchDong, setSearchDong] = useState("");
  const [estateList, setEstateList] = useState([]);
  const [estateLoading, setEstateLoading] = useState(false);
  const [marketResult, setMarketResult] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);

  const scrollRef = useRef(null);
  const freeChatScrollRef = useRef(null);
  const fullScreenChatScrollRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const savedUserId = localStorage.getItem('userId');
    if (token && savedUserId) { setIsLoggedIn(true); setUserId(savedUserId); }
  }, []);

  // 🌟 사용자가 로그인하면 DB에서 남은 티켓 수를 가져옵니다.
  useEffect(() => {
    if (isLoggedIn && userId) {
      fetch(`${API_BASE_URL}/user-info/${userId}`)
        .then(res => res.json())
        .then(data => { if (data.tickets !== undefined) setTickets(data.tickets); });
    }
  }, [isLoggedIn, userId]);

  const handleLogout = () => { localStorage.clear(); setIsLoggedIn(false); setCurrentView('home'); };

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, chatLoading, currentView]);
  useEffect(() => { if (freeChatScrollRef.current) freeChatScrollRef.current.scrollTop = freeChatScrollRef.current.scrollHeight; }, [freeMessages, freeChatLoading, isChatOpen]);
  useEffect(() => { if (fullScreenChatScrollRef.current) fullScreenChatScrollRef.current.scrollTop = fullScreenChatScrollRef.current.scrollHeight; }, [freeMessages, freeChatLoading, currentView]);

  const fetchRegHistory = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/real-estate-history/${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) setRegHistory(data);
    } catch (err) { console.error("보관함 로드 실패"); }
  };

  useEffect(() => { if (currentView === 'archive') fetchRegHistory(); }, [currentView]);

  const navTo = (view) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false); 
  }

  // 🌟 부트페이 결제창 호출 및 티켓 충전 로직
  const handlePayment = async () => {
    try {
      const response = await Bootpay.requestPayment({
        "application_id": "5b8f6a4d396fa665fdc2b5e7", // 부트페이 공식 테스트 키
        "price": 1000,
        "order_name": "등기부등본 열람권 1회 충전",
        "order_id": `ORDER_${new Date().getTime()}`,
        "pg": "kcp",
        "method": "card",
        "tax_free": 0,
        "user": {
          "id": userId,
          "username": "고객님"
        },
        "extra": {
          "open_type": "iframe",
          "card_quota": "0,2,3",
          "escrow": false
        }
      });

      switch (response.event) {
        case 'done':
          const verifyRes = await fetch(`${API_BASE_URL}/payment/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receipt_id: response.data.receipt_id, user_id: userId })
          });
          const result = await verifyRes.json();
          if (result.success) {
            alert("결제 완료! 열람권 1장이 충전되었습니다. 🎫");
            setTickets(result.tickets);
          }
          break;
      }
    } catch (e) {
      if(e.event === 'cancel') {
          console.log('사용자가 결제를 취소했습니다.');
      } else {
          console.error(e.message);
      }
    }
  };

  const handleCompletePostcode = (data) => {
    const sidoMap = { "서울": "서울특별시", "부산": "부산광역시", "대구": "대구광역시", "인천": "인천광역시", "광주": "광주광역시", "대전": "대전광역시", "울산": "울산광역시", "경기": "경기도", "충북": "충청북도", "충남": "충청남도", "전남": "전라남도", "경북": "경상북도", "경남": "경상남도", "세종": "세종특별자치시", "강원": "강원특별자치도", "전북": "전북특별자치도", "제주": "제주특별자치도" };
    setRegSido(sidoMap[data.sido] || data.sido); setRegSigungu(data.sigungu); setRegRoadName(data.roadname);
    const bldNumMatch = data.roadAddress.match(new RegExp(`${data.roadname} (\\d+(?:-\\d+)?)`));
    setRegBldNum(bldNumMatch ? bldNumMatch[1] : ""); setSelectedAddress(data.roadAddress); setIsPostcodeOpen(false); 
  };

  const handleAnalyze = async () => {
    if (!file) return alert("파일을 선택하세요.");
    setLoading(true); setAnalysis(""); setMessages([]); 
    const formData = new FormData(); formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE_URL}/analyze`, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) { setAnalysis(data.analysis); navTo('history'); } else throw new Error(data.detail);
    } catch (err) { alert("분석 실패: " + err.message); } finally { setLoading(false); }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const newMsgs = [...messages, { role: 'user', text: chatInput }];
    setMessages(newMsgs); setChatInput(""); setChatLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_message: chatInput, analysis_context: analysis }) });
      const data = await res.json(); setMessages([...newMsgs, { role: 'ai', text: data.reply }]);
    } catch (err) { alert("채팅 실패!"); } finally { setChatLoading(false); }
  };

  const handleFreeChat = async () => {
    if (!freeChatInput.trim()) return;
    const newMsgs = [...freeMessages, { role: 'user', text: freeChatInput }];
    setFreeMessages(newMsgs); setFreeChatInput(""); setFreeChatLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_message: freeChatInput, analysis_context: "현재는 문서 분석 모드가 아닌 자유 대화 모드입니다. 사용자의 일반적인 부동산 관련 질문이나 용어, 전세사기 예방 등에 대해 친절하고 전문적으로 자유롭게 답변해주세요." }) });
      const data = await res.json(); setFreeMessages([...newMsgs, { role: 'ai', text: data.reply }]);
    } catch (err) { alert("채팅 실패!"); } finally { setFreeChatLoading(false); }
  };

  const handleDragStart = (e) => { setIsDragging(true); dragStart.current = { x: e.clientX - chatOffset.x, y: e.clientY - chatOffset.y }; e.target.setPointerCapture(e.pointerId); };
  const handleDragMove = (e) => { if (isDragging) setChatOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }); };
  const handleDragEnd = (e) => { setIsDragging(false); e.target.releasePointerCapture(e.pointerId); };

  const handleFetchRegister = async () => {
    if (!regSido || !selectedAddress) return alert("주소를 검색해 주세요!");
    setRegLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/fetch-real-estate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, addr_sido: regSido, addr_sigungu: regSigungu, addr_roadName: regRoadName, addr_buildingNumber: regBldNum, dong: regDong, ho: regHo, realtyType: regRealtyType }) });
      const data = await res.json(); 
      
      // 티켓 부족 에러 처리
      if (data.error) {
        alert(data.error); 
        setRegResult(null);
      } else {
        setRegResult(data); 
        // 🌟 성공적으로 발급되었다면 티켓 1장 차감
        if (data.data || (data.result && data.result.code === "CF-00000")) {
          fetchRegHistory();
          setTickets(prev => prev - 1);
        }
      }
    } catch (err) { alert("조회 실패!"); } finally { setRegLoading(false); }
  };

  const handleDownloadPDF = () => {
    let pdfBase64 = null;
    if (regResult && regResult.data) {
      const dataObj = Array.isArray(regResult.data) ? regResult.data[0] : regResult.data;
      if (dataObj) pdfBase64 = dataObj.resOriGinalData || dataObj.resoriGinalData;
    }
    if (pdfBase64) {
      const linkSource = `data:application/pdf;base64,${pdfBase64}`; const downloadLink = document.createElement("a"); downloadLink.href = linkSource; downloadLink.download = `등기부등본_${selectedAddress.replace(/ /g, '_')}.pdf`; downloadLink.click();
    } else { alert("API 응답에 PDF 파일 데이터가 없습니다. 화면을 인쇄합니다."); window.print(); }
  };

  const downloadSavedPDF = (pdfBase64, address) => {
    const linkSource = `data:application/pdf;base64,${pdfBase64}`; const downloadLink = document.createElement("a"); downloadLink.href = linkSource; downloadLink.download = `[재열람]등기부_${address.replace(/ /g, '_')}.pdf`; downloadLink.click();
  };

  const handleSearchEstates = async () => {
    if (!searchSido || !searchSigun || !searchDong) return alert("시/도, 시/군/구, 읍/면/동을 모두 입력해주세요.");
    setEstateLoading(true); setEstateList([]); setMarketResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/fetch-estate-list`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ addr_sido: searchSido, addr_sigun: searchSigun, addr_dong: searchDong }) });
      const data = await res.json();
      if (data.data) setEstateList(Array.isArray(data.data) ? data.data : [data.data]); else alert("해당 지역에 검색된 단지가 없습니다.");
    } catch (err) { alert("단지 검색 실패!"); } finally { setEstateLoading(false); }
  };

  const handleFetchMarketPrice = async (complexNo) => {
    setMarketLoading(true); setMarketResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/fetch-market-price`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ complex_no: complexNo }) });
      const data = await res.json(); setMarketResult(data); setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
    } catch (err) { alert("시세 조회 실패!"); } finally { setMarketLoading(false); }
  };

  if (!isLoggedIn) return <Login onLoginSuccess={(id) => { setIsLoggedIn(true); setUserId(id); }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-main)', color: 'var(--text)' }}>
      
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navTo('home')}>
          <ShieldCheck size={28} color="var(--accent)" />
          <span style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>SafeHome</span>
        </div>
        <button className="icon-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', cursor: 'pointer', marginBottom: '20px' }} onClick={() => navTo('home')}>
            <ShieldCheck size={28} color="var(--accent)" />
            <span style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>SafeHome</span>
          </div>
          <button onClick={() => navTo('home')} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', borderRadius: '50px', background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: '1rem', fontWeight: '500', marginBottom: '30px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <Plus size={20} /> 새 분석 시작
          </button>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: '0.85rem', color: '#888', padding: '0 10px', marginBottom: '10px', fontWeight: '600' }}>메뉴</div>
            <div onClick={() => navTo('archive')} className={`menu-item ${currentView === 'archive' ? 'active' : ''}`}>
              <Archive size={18} color="var(--accent)" /> 내 등기부 보관함
            </div>
            <div onClick={() => navTo('history')} className={`menu-item ${currentView === 'history' ? 'active' : ''}`}>
              <FileSearch size={18} color="var(--accent)" /> 계약서 AI 상담
            </div>
            <div onClick={() => { navTo('freechat'); setIsChatOpen(false); }} className={`menu-item ${currentView === 'freechat' ? 'active' : ''}`}>
              <MessageSquare size={18} color="var(--accent)" /> AI 상담
            </div>
            <div onClick={() => navTo('market')} className={`menu-item ${currentView === 'market' ? 'active' : ''}`}>
              <TrendingUp size={18} color="var(--accent)" /> 아파트 시세 조회
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="menu-item borderless">
              {theme === 'light' ? <><Moon size={20} /> 다크 모드</> : <><Sun size={20} /> 라이트 모드</>}
            </button>
            <button onClick={handleLogout} className="menu-item borderless">
              <LogOut size={20} /> 로그아웃
            </button>
          </div>
        </aside>

        <main className="main-content">
          {currentView === 'home' && (
            <div className="fade-in" style={{ flex: 1, overflowY: 'auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 className="responsive-title" style={{ fontWeight: 'bold', background: 'linear-gradient(90deg, #1a73e8, #9c27b0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '40px', textAlign: 'center' }}>무엇을 도와드릴까요?</h2>
              <div className="service-grid">
                <div className="service-card" onClick={() => navTo('contract')}>
                  <div className="icon-wrapper blue"><FileSearch size={40} color="white" /></div>
                  <h4>스마트 계약서 분석</h4>
                  <p>계약서 이미지를 올려 AI 위험 진단을 받아보세요.</p>
                </div>
                <div className="service-card" onClick={() => navTo('register')}>
                  <div className="icon-wrapper green"><Building2 size={40} color="white" /></div>
                  <h4>실시간 등기 발급</h4>
                  <p>대법원 데이터를 바탕으로 권리 관계를 확인합니다.</p>
                </div>
                <div className="service-card" onClick={() => navTo('market')}>
                  <div className="icon-wrapper" style={{ background: '#fbbc05' }}><TrendingUp size={40} color="white" /></div>
                  <h4>아파트 시세 조회</h4>
                  <p>최신 면적별 실거래가와 전세가를 한눈에 확인하세요.</p>
                </div>
                <div className="service-card" onClick={() => navTo('history')}>
                  <div className="icon-wrapper yellow"><FileSearch size={40} color="white" /></div>
                  <h4>계약서 AI 상담</h4>
                  <p>분석된 계약서 결과를 바탕으로 AI와 깊이 있게 상담하세요.</p>
                </div>
                <div className="service-card wide-card" onClick={() => navTo('freechat')}>
                  <div className="icon-wrapper" style={{ background: '#9c27b0' }}><MessageSquare size={40} color="white" /></div>
                  <h4>AI 상담</h4>
                  <p>부동산 관련 궁금증을 언제든지 자유롭게 물어보세요.</p>
                </div>
              </div>
            </div>
          )}

          {currentView === 'archive' && (
            <div className="fade-in" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              <button className="back-btn" onClick={() => navTo('home')}><ArrowLeft size={20}/> 뒤로가기</button>
              <div style={{ maxWidth: '800px', margin: '0 auto', marginTop: '20px' }}>
                <h3 style={{ color: 'var(--accent)', marginBottom: '10px', fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Archive/> 내 등기부 보관함</h3>
                <p style={{ color: '#888', marginBottom: '30px' }}>한 번 발급받은 등기부등본은 결제 없이 언제든 다시 다운로드할 수 있습니다.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {regHistory.length > 0 ? regHistory.map((item) => (
                    <div key={item.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>{item.address}</div>
                        <div style={{ fontSize: '0.9rem', color: '#888' }}>발급 일시: {new Date(item.created_at).toLocaleString()}</div>
                      </div>
                      <button onClick={() => downloadSavedPDF(item.pdf_base64, item.address)} className="main-btn" style={{ margin: 0, padding: '10px 20px' }}>열람 / 다운로드</button>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#888', background: 'var(--card-bg)', borderRadius: '15px' }}>아직 발급받은 등기부가 없습니다.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentView === 'contract' && (
            <div className="fade-in" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              <button className="back-btn" onClick={() => navTo('home')}><ArrowLeft size={20}/> 뒤로가기</button>
              <div style={{ maxWidth: '800px', margin: '0 auto', marginTop: '20px' }}>
                <section className="card" style={{ padding: '40px', textAlign: 'center' }}>
                  <h3 style={{ color: 'var(--accent)', marginBottom: '20px', fontSize: '1.5rem' }}><Upload /> 계약서 이미지 업로드</h3>
                  <div className="big-upload-zone" style={{ border: '2px dashed var(--border)', padding: '50px', borderRadius: '15px', background: 'var(--bg-main)' }}>
                    <input type="file" onChange={(e) => setFile(e.target.files[0])} id="up" hidden />
                    <label htmlFor="up" className="drop-area" style={{ cursor: 'pointer', display: 'inline-block', padding: '15px 30px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '1.1rem', marginBottom: '20px' }}>{file ? file.name : "여기를 클릭해 파일을 선택하세요"}</label>
                    <br />
                    <button onClick={handleAnalyze} className="main-btn" style={{ padding: '15px 40px', fontSize: '1.1rem' }}>{loading ? "AI 분석 중..." : "AI 분석 시작하기"}</button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {currentView === 'history' && (
            <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {!analysis && messages.length === 0 && !loading && (
                  <div style={{ textAlign: 'center', color: '#888', marginTop: '10vh' }}>
                    <ShieldCheck size={50} color="var(--accent)" style={{ marginBottom: '15px', opacity: 0.5 }} />
                    <h3>진행된 계약서 분석이 없습니다.</h3>
                    <p>메뉴의 '스마트 계약서 분석'에서 문서를 먼저 업로드해주세요.</p>
                  </div>
                )}
                {loading && (
                   <div style={{ display: 'flex', gap: '15px' }}><div className="ai-icon"><ShieldCheck size={24}/></div>
                     <div className="chat-bubble">계약서 문서를 정밀하게 확인하고 있습니다...</div>
                   </div>
                )}
                {analysis && (
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div className="ai-icon"><ShieldCheck size={24}/></div>
                    <div className="chat-bubble" style={{ flex: 1 }}>
                      <h3 style={{ marginTop: 0, color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: '15px', marginBottom: '20px' }}>📄 AI 계약서 정밀 분석 리포트</h3>
                      <div className="md-content"><ReactMarkdown>{analysis}</ReactMarkdown></div>
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: '15px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                    {m.role === 'ai' && <div className="ai-icon"><ShieldCheck size={24}/></div>}
                    <div className={`chat-bubble ${m.role}`}>
                      <div className="md-content"><ReactMarkdown>{m.text}</ReactMarkdown></div>
                    </div>
                  </div>
                ))}
                {chatLoading && <div style={{ display: 'flex', gap: '15px' }}><div className="ai-icon"><ShieldCheck size={24}/></div><div className="chat-bubble ai">답변을 작성하고 있습니다...</div></div>}
              </div>
              
              <div style={{ padding: '15px 20px', background: 'var(--bg-main)' }}>
                <div className="chat-input-container">
                  <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={analysis ? "위 계약서 내용에 대해 질문해 보세요..." : "계약서를 먼저 분석해 주세요."} disabled={!analysis} className="chat-input" onKeyPress={(e) => e.key === 'Enter' && analysis && handleChat()} />
                  <button onClick={handleChat} disabled={!analysis} className="chat-send-btn" style={{ opacity: analysis ? 1 : 0.5 }}><Send size={20} style={{ marginLeft: '3px' }}/></button>
                </div>
              </div>
            </div>
          )}

          {currentView === 'freechat' && (
            <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
              <div ref={fullScreenChatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {freeMessages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#888', marginTop: '10vh' }}>
                    <MessageSquare size={50} color="var(--accent)" style={{ marginBottom: '15px', opacity: 0.5 }} />
                    <h3>AI 상담을 시작해보세요!</h3>
                    <p>전세사기 예방, 부동산 용어, 법률 지식 등 무엇이든 물어보세요.</p>
                  </div>
                )}
                {freeMessages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: '15px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                    {m.role === 'ai' && <div className="ai-icon"><ShieldCheck size={24}/></div>}
                    <div className={`chat-bubble ${m.role}`}>
                      <div className="md-content"><ReactMarkdown>{m.text}</ReactMarkdown></div>
                    </div>
                  </div>
                ))}
                {freeChatLoading && <div style={{ display: 'flex', gap: '15px' }}><div className="ai-icon"><ShieldCheck size={24}/></div><div className="chat-bubble ai">답변을 작성하고 있습니다...</div></div>}
              </div>
              <div style={{ padding: '15px 20px', background: 'var(--bg-main)' }}>
                <div className="chat-input-container">
                  <input value={freeChatInput} onChange={(e) => setFreeChatInput(e.target.value)} placeholder={"부동산에 관한 궁금증을 자유롭게 질문해 보세요!"} className="chat-input" onKeyPress={(e) => e.key === 'Enter' && handleFreeChat()} />
                  <button onClick={handleFreeChat} className="chat-send-btn"><Send size={20} style={{ marginLeft: '3px' }}/></button>
                </div>
              </div>
            </div>
          )}

          {currentView === 'register' && (
            <div className="fade-in" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              <button className="back-btn" onClick={() => navTo('home')}><ArrowLeft size={20}/> 뒤로가기</button>
              <div style={{ maxWidth: '800px', margin: '0 auto', marginTop: '20px' }}>
                <section className="card" style={{ padding: '30px' }}>
                  
                  {/* 🌟 티켓 정보 및 결제창 호출 버튼 🌟 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '15px 20px', background: 'var(--bg-main)', borderRadius: '15px', border: '1px solid var(--accent)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text)' }}>
                      🎫 내 열람권: <span style={{ color: 'var(--accent)', fontSize: '1.4rem', marginLeft: '5px' }}>{tickets}</span>장
                    </div>
                    <button onClick={handlePayment} className="main-btn" style={{ margin: 0, padding: '10px 20px', fontSize: '0.95rem' }}>충전하기 (1,000원)</button>
                  </div>

                  <h3 className="card-title" style={{ color: 'var(--accent)', marginBottom: '30px' }}><Building2 /> 부동산 실시간 등기 발급</h3>
                  
                  <div className="input-group">
                    <select value={regRealtyType} onChange={(e) => setRegRealtyType(e.target.value)} style={{ padding: '15px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <option value="1">🏢 집합건물 (아파트/빌라)</option>
                      <option value="0">🏠 토지/건물 (단독주택)</option>
                    </select>
                    <button onClick={() => setIsPostcodeOpen(true)} className="main-btn" style={{ flex: 1, margin: 0 }}><MapPin /> 도로명 주소 검색</button>
                  </div>
                  <input readOnly value={selectedAddress} placeholder="주소를 검색하세요" style={{ width: '100%', padding: '15px', marginBottom: '15px', borderRadius: '10px', border: '1px solid var(--border)' }} />
                  <div className="input-group">
                    <input placeholder="동 (예: 101동)" value={regDong} onChange={(e) => setRegDong(e.target.value)} style={{ flex: 1, padding: '15px', borderRadius: '10px', border: '1px solid var(--border)' }} />
                    <input placeholder="호 (예: 202호)" value={regHo} onChange={(e) => setRegHo(e.target.value)} style={{ flex: 1, padding: '15px', borderRadius: '10px', border: '1px solid var(--border)' }} />
                  </div>
                  <button onClick={handleFetchRegister} disabled={regLoading} className="main-btn" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <Building2 size={20} /> {regLoading ? "대법원 통신 중..." : "등기부등본 가져오기 (열람권 1장 차감)"}
                  </button>
                  
                  {regResult && (
                    (regResult.result && regResult.result.code === "CF-00000") || regResult.data ? (
                      <div className="fade-in success-box">
                        <div className="success-icon"><ShieldCheck size={40} color="#34a853" /></div>
                        <h3>등기부등본 발급 성공!</h3>
                        <p>대법원 원본 데이터가 안전하게 수신되었습니다.</p>
                        <button onClick={handleDownloadPDF} className="main-btn success-btn">📄 PDF 열람 및 다운로드</button>
                      </div>
                    ) : (
                      <div className="fade-in error-box">
                        <h4>발급 오류 발생</h4>
                        <p>{regResult.result?.message || regResult.error || "알 수 없는 오류가 발생했습니다."}</p>
                      </div>
                    )
                  )}
                </section>
              </div>
            </div>
          )}

          {currentView === 'market' && (
            <div className="fade-in" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              <button className="back-btn" onClick={() => navTo('home')}><ArrowLeft size={20}/> 뒤로가기</button>
              <div style={{ maxWidth: '800px', margin: '0 auto', marginTop: '20px' }}>
                <section className="card" style={{ padding: '30px' }}>
                  <h3 className="card-title" style={{ color: 'var(--accent)', marginBottom: '30px' }}><TrendingUp /> 아파트 시세 조회</h3>
                  
                  <div className="input-group">
                    <input placeholder="시/도 (예: 서울특별시)" value={searchSido} onChange={(e) => setSearchSido(e.target.value)} className="flex-input" />
                    <input placeholder="시/군/구 (예: 송파구)" value={searchSigun} onChange={(e) => setSearchSigun(e.target.value)} className="flex-input" />
                    <input placeholder="읍/면/동 (예: 장지동)" value={searchDong} onChange={(e) => setSearchDong(e.target.value)} className="flex-input" />
                  </div>
                  <button onClick={handleSearchEstates} disabled={estateLoading} className="main-btn" style={{ width: '100%', marginBottom: '30px' }}>
                    {estateLoading ? "단지 목록을 찾는 중..." : "해당 지역 단지 검색하기"}
                  </button>
                  
                  {estateList.length > 0 && !marketResult && (
                    <div className="fade-in">
                      <h4 style={{ marginBottom: '15px', color: 'var(--text)' }}>검색된 단지 목록 ({estateList.length}건)</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {estateList.map((estate, idx) => (
                          <div key={idx} onClick={() => handleFetchMarketPrice(estate.commComplexNo)} className="hover-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <Building color="var(--accent)" />
                              <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>{estate.resComplexName}</span>
                            </div>
                            <span className="badge">시세 확인 ➔</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {marketLoading && <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>시세 정보를 불러오고 있습니다...</div>}
                  
                  {marketResult && marketResult.data && (
                    <div className="fade-in" style={{ marginTop: '20px', borderTop: '2px solid var(--border)', paddingTop: '30px' }}>
                      <div className="market-header">
                        <div>
                          <span className="type-badge">{marketResult.data.resType || "아파트"}</span>
                          <h4 style={{ fontSize: '1.5rem', color: 'var(--text)', margin: '0 0 5px 0' }}>{marketResult.data.resComplexName}</h4>
                          <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>{marketResult.data.commAddrRoadName}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 5px 0' }}>기준일: {marketResult.data.resFixedDate}</p>
                          <button onClick={() => setMarketResult(null)} className="outline-btn">다른 단지 검색</button>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {marketResult.data.resAreaPriceList && marketResult.data.resAreaPriceList.map((priceInfo, idx) => (
                          <div key={idx} className="price-card">
                            <div style={{ flex: 1, marginBottom: '10px' }}>
                              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text)', marginBottom: '5px' }}>{priceInfo.resArea} ㎡</div>
                              <div style={{ fontSize: '0.9rem', color: '#888' }}>세대수: {priceInfo.resCompositionCnt}세대</div>
                            </div>
                            <div className="price-details">
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.85rem', color: '#888', display: 'block' }}>매매 평균가</span>
                                <strong style={{ fontSize: '1.2rem', color: '#d32f2f' }}>{formatKoreanPrice(priceInfo.resTopAveragePrice)}</strong>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.85rem', color: '#888', display: 'block' }}>전세 평균가</span>
                                <strong style={{ fontSize: '1.2rem', color: '#1976d2' }}>{formatKoreanPrice(priceInfo.resTopAveragePrice1)}</strong>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {marketResult && !marketResult.data && (
                    <div style={{ color: '#f44336', marginTop: '20px' }}>조회 결과가 없거나 API 오류가 발생했습니다.</div>
                  )}
                </section>
              </div>
            </div>
          )}
        </main>
      </div>

      {isChatOpen && (
        <div className="chat-popup" style={{ transform: `translate(${chatOffset.x}px, ${chatOffset.y}px)` }}>
          <div className="chat-popup-header" onPointerDown={handleDragStart} onPointerMove={handleDragMove} onPointerUp={handleDragEnd}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <MessageSquare size={20} /> AI 상담
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setIsChatOpen(false); navTo('freechat'); }} className="icon-btn-white" title="전체화면으로 보기"><Maximize2 size={16} /></button>
              <button onClick={() => setIsChatOpen(false)} className="icon-btn-white" style={{ fontSize: '1.2rem' }}>✖</button>
            </div>
          </div>

          <div ref={freeChatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', background: 'var(--card-bg)' }}>
            {freeMessages.length === 0 && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="ai-icon small"><ShieldCheck size={18}/></div>
                <div className="chat-bubble ai small">
                  <strong>부동산 AI 도우미입니다! 🏠</strong><br />전세사기 예방, 부동산 용어 등 자유롭게 질문해 보세요.
                </div>
              </div>
            )}
            {freeMessages.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                {m.role === 'ai' && <div className="ai-icon small"><ShieldCheck size={18}/></div>}
                <div className={`chat-bubble small ${m.role}`}>
                  <div className="md-content"><ReactMarkdown>{m.text}</ReactMarkdown></div>
                </div>
              </div>
            ))}
            {freeChatLoading && <div style={{ display: 'flex', gap: '10px' }}><div className="ai-icon small"><ShieldCheck size={18}/></div><div className="chat-bubble ai small" style={{ color: '#888' }}>답변을 고민하고 있습니다...</div></div>}
          </div>

          <div style={{ padding: '15px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-main)' }}>
            <input value={freeChatInput} onChange={(e) => setFreeChatInput(e.target.value)} placeholder="질문해보세요!" style={{ flex: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', outline: 'none' }} onKeyPress={(e) => e.key === 'Enter' && handleFreeChat()} />
            <button onClick={handleFreeChat} style={{ background: 'var(--accent)', border: 'none', cursor: 'pointer', color: '#fff', width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={16} style={{ marginLeft: '2px' }}/></button>
          </div>
        </div>
      )}

      <button className="floating-btn" onClick={() => setIsChatOpen(!isChatOpen)}>
        <MessageSquare size={28} />
      </button>

      {isPostcodeOpen && (
        <div className="postcode-overlay" onClick={() => setIsPostcodeOpen(false)}>
          <div className="postcode-modal" onClick={(e) => e.stopPropagation()}>
            <DaumPostcode onComplete={handleCompletePostcode} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;