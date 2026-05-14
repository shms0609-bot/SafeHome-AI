import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sun, Moon, Send, FileSearch, Building2, ShieldCheck, MessageSquare, ArrowLeft, Upload, MapPin, LogOut, Plus, Archive, TrendingUp, Building, Maximize2, Menu, X } from 'lucide-react';
import DaumPostcode from 'react-daum-postcode';
import { Bootpay } from '@bootpay/client-js';
import './App.css';

const API_BASE_URL = "https://safehome-ai-pkkv.onrender.com"; 

const formatKoreanPrice = (priceStr) => {
  const num = Number(priceStr);
  if (!num || num === 0) return "-";
  const eok = Math.floor(num / 10000);
  const man = num % 10000;
  return eok > 0 ? (man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`) : `${man.toLocaleString()}만원`;
};

function Login({ onLoginSuccess }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState(""); 
  const [name, setName] = useState("");
  const [isIdChecked, setIsIdChecked] = useState(false);
  const [isIdAvailable, setIsIdAvailable] = useState(false);

  const handleCheckId = async () => {
    if (!id.trim()) return alert("아이디를 입력해주세요.");
    try {
      const res = await fetch(`${API_BASE_URL}/check-id/${id}`);
      const data = await res.json();
      alert(data.available ? "사용 가능한 아이디입니다! ✅" : "이미 사용 중인 아이디입니다. ❌");
      setIsIdAvailable(data.available); setIsIdChecked(true);
    } catch { alert("통신 실패"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRegisterMode) {
      if (!isIdChecked || !isIdAvailable) return alert("중복 확인을 완료해주세요.");
      if (pw !== pwConfirm) return alert("비밀번호 불일치!");
    }
    const endpoint = isRegisterMode ? '/register' : '/login';
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: id, password: pw, username: name })
      });
      if (res.ok) {
        if (isRegisterMode) { alert("가입 완료! 🎉"); setIsRegisterMode(false); }
        else {
          const data = await res.json();
          localStorage.setItem('accessToken', data.access_token); localStorage.setItem('userId', id);
          onLoginSuccess(id);
        }
      } else { alert("오류 발생"); }
    } catch { alert("서버 연결 실패"); }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title"><ShieldCheck size={32} /> {isRegisterMode ? "회원가입" : "로그인"}</h2>
        <form onSubmit={handleSubmit} className="login-form">
          {isRegisterMode && <input type="text" placeholder="이름" value={name} onChange={(e)=>setName(e.target.value)} required />}
          <div className="id-group">
            <input type="text" placeholder="아이디" value={id} onChange={(e)=>{setId(e.target.value); setIsIdChecked(false);}} required />
            {isRegisterMode && <button type="button" onClick={handleCheckId} className="check-btn">중복확인</button>}
          </div>
          <input type="password" placeholder="비밀번호" value={pw} onChange={(e)=>setPw(e.target.value)} required />
          {isRegisterMode && <input type="password" placeholder="비밀번호 확인" value={pwConfirm} onChange={(e)=>setPwConfirm(e.target.value)} required />}
          <button type="submit" className="main-btn submit-btn">{isRegisterMode ? "가입하기" : "로그인"}</button>
        </form>
        <p onClick={()=>setIsRegisterMode(!isRegisterMode)} className="toggle-mode">
          {isRegisterMode ? "로그인으로 돌아가기" : "계정이 없으신가요? 회원가입"}
        </p>
      </div>
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState("");
  const [theme, setTheme] = useState('light');
  const [currentView, setCurrentView] = useState('home');
  const [tickets, setTickets] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [freeMessages, setFreeMessages] = useState([]);
  const [freeChatInput, setFreeChatInput] = useState("");
  const [freeChatLoading, setFreeChatLoading] = useState(false);

  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(""); 
  const [regResult, setRegResult] = useState(null);
  const [regLoading, setRegLoading] = useState(false);
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

  useEffect(() => {
    const savedId = localStorage.getItem('userId');
    if (savedId) { setIsLoggedIn(true); setUserId(savedId); }
  }, []);

  useEffect(() => {
    if (isLoggedIn && userId) {
      fetch(`${API_BASE_URL}/user-info/${userId}`).then(r=>r.json()).then(d=>setTickets(d.tickets));
    }
  }, [isLoggedIn, userId, currentView]);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  const handlePayment = async () => {
    try {
      const response = await Bootpay.requestPayment({
        "application_id": "Js-J8qI9S-hknFEl_Mf0Kw", // 승현님의 JS 키
        "price": 1000, "order_name": "열람권 충전", "order_id": `ORD_${Date.now()}`,
        "pg": "kcp", "method": "card", "user": { "id": userId },
        "extra": { "open_type": "iframe" }
      });
      if (response.event === 'done') {
        const res = await fetch(`${API_BASE_URL}/payment/verify`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receipt_id: response.data.receipt_id, user_id: userId })
        });
        const data = await res.json(); setTickets(data.tickets); alert("충전 완료! 🎫");
      }
    } catch { console.error("결제 실패"); }
  };

  const navTo = (v) => { setCurrentView(v); setIsMobileMenuOpen(false); };

  const handleAnalyze = async () => {
    if (!file) return alert("파일 선택!");
    setLoading(true); setAnalysis(""); setMessages([]);
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await fetch(`${API_BASE_URL}/analyze`, { method: 'POST', body: fd });
      const d = await r.json(); setAnalysis(d.analysis); navTo('history');
    } catch { alert("분석 실패"); } finally { setLoading(false); }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const msgs = [...messages, { role: 'user', text: chatInput }];
    setMessages(msgs); setChatInput(""); setChatLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_message: chatInput, analysis_context: analysis })
      });
      const d = await r.json(); setMessages([...msgs, { role: 'ai', text: d.reply }]);
    } catch { alert("채팅 실패"); } finally { setChatLoading(false); }
  };

  const handleFreeChat = async () => {
    if (!freeChatInput.trim()) return;
    const msgs = [...freeMessages, { role: 'user', text: freeChatInput }];
    setFreeMessages(msgs); setFreeChatInput(""); setFreeChatLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_message: freeChatInput, analysis_context: "자유 대화 모드" })
      });
      const d = await r.json(); setFreeMessages([...msgs, { role: 'ai', text: d.reply }]);
    } catch { alert("채팅 실패"); } finally { setFreeChatLoading(false); }
  };

  const handleFetchRegister = async () => {
    if (!selectedAddress) return alert("주소 검색!");
    setRegLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/fetch-real-estate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, addr_sido: "", addr_sigungu: "", selectedAddress, dong: regDong, ho: regHo, realtyType: regRealtyType })
      });
      const d = await r.json();
      if (d.error) alert(d.error); else { setRegResult(d); setTickets(t => t - 1); }
    } catch { alert("조회 실패"); } finally { setRegLoading(false); }
  };

  if (!isLoggedIn) return <Login onLoginSuccess={(id)=>{setIsLoggedIn(true); setUserId(id);}} />;

  return (
    <div className="app-container">
      <header className="mobile-header">
        <div className="logo" onClick={()=>navTo('home')}><ShieldCheck size={28} color="var(--accent)" /> <span>SafeHome</span></div>
        <button onClick={()=>setIsMobileMenuOpen(!isMobileMenuOpen)} className="menu-toggle">{isMobileMenuOpen ? <X size={28}/> : <Menu size={28}/>}</button>
      </header>

      <div className="layout-body">
        <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="sidebar-logo" onClick={()=>navTo('home')}><ShieldCheck size={28} color="var(--accent)" /> <span>SafeHome</span></div>
          <button className="new-btn" onClick={()=>navTo('home')}><Plus size={20}/> 새 분석 시작</button>
          <nav className="nav-menu">
            <div className="nav-item" onClick={()=>navTo('archive')}><Archive size={18}/> 내 등기부 보관함</div>
            <div className="nav-item" onClick={()=>navTo('history')}><FileSearch size={18}/> 계약서 AI 상담</div>
            <div className="nav-item" onClick={()=>navTo('freechat')}><MessageSquare size={18}/> AI 상담</div>
            <div className="nav-item" onClick={()=>navTo('market')}><TrendingUp size={18}/> 아파트 시세 조회</div>
          </nav>
          <div className="sidebar-footer">
            <div className="nav-item" onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light' ? <Moon size={18}/> : <Sun size={18}/>} 모드 변경</div>
            <div className="nav-item" onClick={()=>{localStorage.clear(); window.location.reload();}}><LogOut size={18}/> 로그아웃</div>
          </div>
        </aside>

        <main className="main-content">
          {currentView === 'home' && (
            <div className="home-view fade-in">
              <h2 className="view-title">무엇을 도와드릴까요?</h2>
              <div className="grid-container">
                <div className="card" onClick={()=>navTo('contract')}><FileSearch size={40}/> <h3>계약서 분석</h3> <p>AI가 위험을 진단합니다.</p></div>
                <div className="card" onClick={()=>navTo('register')}><Building2 size={40}/> <h3>실시간 등기</h3> <p>열람권을 사용해 조회합니다.</p></div>
                <div className="card" onClick={()=>navTo('market')}><TrendingUp size={40}/> <h3>시세 조회</h3> <p>최신 실거래가를 확인하세요.</p></div>
                <div className="card" onClick={()=>navTo('history')}><MessageSquare size={40}/> <h3>AI 심층 상담</h3> <p>계약서 결과를 분석합니다.</p></div>
                <div className="card wide" onClick={()=>navTo('freechat')}><ShieldCheck size={40}/> <h3>AI 자유 상담</h3> <p>부동산 궁금증을 해결하세요.</p></div>
              </div>
            </div>
          )}

          {currentView === 'register' && (
            <div className="view-container fade-in">
              <div className="ticket-banner">🎫 보유 열람권: <strong>{tickets}</strong>장 <button onClick={handlePayment}>충전하기</button></div>
              <section className="register-card">
                <h3>부동산 등기부 발급</h3>
                <button onClick={()=>setIsPostcodeOpen(true)} className="main-btn addr-btn"><MapPin/> 주소 검색</button>
                <input readOnly value={selectedAddress} placeholder="검색된 주소" />
                <div className="input-row"><input placeholder="동" value={regDong} onChange={e=>setRegDong(e.target.value)}/><input placeholder="호" value={regHo} onChange={e=>setRegHo(e.target.value)}/></div>
                <button onClick={handleFetchRegister} disabled={regLoading} className="main-btn run-btn">{regLoading ? "발급 중..." : "발급 시작 (1장 차감)"}</button>
              </section>
            </div>
          )}

          {currentView === 'contract' && (
            <div className="view-container fade-in">
              <section className="upload-card">
                <h3>계약서 이미지 업로드</h3>
                <input type="file" onChange={e=>setFile(e.target.files[0])} id="up" hidden/>
                <label htmlFor="up" className="upload-label">{file ? file.name : "파일을 선택하세요"}</label>
                <button onClick={handleAnalyze} disabled={loading} className="main-btn">{loading ? "분석 중..." : "분석 시작"}</button>
              </section>
            </div>
          )}

          {(currentView === 'history' || currentView === 'freechat') && (
            <div className="chat-view fade-in">
              <div className="chat-messages">
                {currentView === 'history' && analysis && <div className="analysis-box"><ReactMarkdown>{analysis}</ReactMarkdown></div>}
                {(currentView==='history'?messages:freeMessages).map((m,i)=>(
                  <div key={i} className={`bubble-row ${m.role}`}>
                    {m.role==='ai'&&<div className="ai-ico"><ShieldCheck size={20}/></div>}
                    <div className="bubble"><ReactMarkdown>{m.text}</ReactMarkdown></div>
                  </div>
                ))}
              </div>
              <div className="chat-input-area">
                <input value={currentView==='history'?chatInput:freeChatInput} onChange={e=>currentView==='history'?setChatInput(e.target.value):setFreeChatInput(e.target.value)} placeholder="질문을 입력하세요..." onKeyPress={e=>e.key==='Enter'&&(currentView==='history'?handleChat():handleFreeChat())}/>
                <button onClick={currentView==='history'?handleChat:handleFreeChat}><Send size={20}/></button>
              </div>
            </div>
          )}
        </main>
      </div>

      {isPostcodeOpen && <div className="modal-overlay" onClick={()=>setIsPostcodeOpen(false)}><div className="modal" onClick={e=>e.stopPropagation()}><DaumPostcode onComplete={(d)=>{setSelectedAddress(d.roadAddress); setIsPostcodeOpen(false);}}/></div></div>}
    </div>
  );
}

export default App;