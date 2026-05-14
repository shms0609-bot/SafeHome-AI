import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sun, Moon, Send, FileSearch, Building2, ShieldCheck, MessageSquare, ArrowLeft, Upload, Search, MapPin, LogOut, Plus, Archive, TrendingUp, Building, Maximize2 } from 'lucide-react';
import DaumPostcode from 'react-daum-postcode';
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
      if (!isIdChecked || !isIdAvailable) {
        return alert("아이디 중복 확인을 먼저 완료해주세요.");
      }
      if (pw !== pwConfirm) {
        return alert("비밀번호와 비밀번호 확인이 일치하지 않습니다. 다시 확인해주세요.");
      }
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
          alert(`가입이 완료되었습니다! 로그인을 진행해 주세요. 🎉`);
          setIsRegisterMode(false); 
          setName("");
          setPwConfirm("");
          setIsIdChecked(false);
          setIsIdAvailable(false);
        } else {
          localStorage.setItem('accessToken', data.access_token);
          localStorage.setItem('userId', id); 
          onLoginSuccess(id);
        }
      } else { 
        alert("오류: " + (data.detail || "정보를 확인하세요.")); 
      }
    } catch (err) { 
      alert("서버 연결 실패!"); 
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-main)' }}>
      <div style={{ background: 'var(--card-bg)', padding: '40px', borderRadius: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', width: '100%', maxWidth: '420px', border: '1px solid var(--border)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <ShieldCheck size={32} /> {isRegisterMode ? "회원가입" : "로그인"}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isRegisterMode && (
            <input type="text" placeholder="이름 (닉네임)" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }} required />
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="아이디" value={id} onChange={handleIdChange} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }} required />
            {isRegisterMode && (
              <button type="button" onClick={handleCheckId} style={{ padding: '0 15px', borderRadius: '12px', background: isIdAvailable ? '#e6f4ea' : 'var(--card-bg)', border: `1px solid ${isIdAvailable ? '#34a853' : 'var(--border)'}`, color: isIdAvailable ? '#34a853' : 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                {isIdAvailable ? "확인 완료" : "중복 확인"}
              </button>
            )}
          </div>
          <input type="password" placeholder="비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} style={{ padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }} required />
          {isRegisterMode && (
            <input type="password" placeholder="비밀번호 확인" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} style={{ padding: '15px', borderRadius: '12px', border: `1px solid ${pwConfirm && pw !== pwConfirm ? '#f44336' : 'var(--border)'}`, background: 'var(--bg-main)', color: 'var(--text)' }} required />
          )}
          {isRegisterMode && pwConfirm && pw !== pwConfirm && (
            <span style={{ color: '#f44336', fontSize: '0.85rem', marginTop: '-10px', marginLeft: '5px' }}>비밀번호가 일치하지 않습니다.</span>
          )}
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
  
  // [계약서 전용] 상담 State
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);

  // 🌟 [자유 챗봇 전용] 팝업 & 전체화면이 공유하는 State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [freeChatLoading, setFreeChatLoading] = useState(false);
  const [freeChatInput, setFreeChatInput] = useState("");
  const [freeMessages, setFreeMessages] = useState([]);

  // 팝업 챗봇 드래그 위치 제어 State
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

  const scrollRef = useRef(null); // 계약서 상담용
  const freeChatScrollRef = useRef(null); // 팝업 챗봇용
  const fullScreenChatScrollRef = useRef(null); // 🌟 전체화면 챗봇용

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const savedUserId = localStorage.getItem('userId');
    if (token && savedUserId) {
      setIsLoggedIn(true);
      setUserId(savedUserId);
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setCurrentView('home');
  };

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  
  // 스크롤 자동 이동 처리
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

  useEffect(() => {
    if (currentView === 'archive') fetchRegHistory();
  }, [currentView]);

  const handleCompletePostcode = (data) => {
    const sidoMap = { "서울": "서울특별시", "부산": "부산광역시", "대구": "대구광역시", "인천": "인천광역시", "광주": "광주광역시", "대전": "대전광역시", "울산": "울산광역시", "경기": "경기도", "충북": "충청북도", "충남": "충청남도", "전남": "전라남도", "경북": "경상북도", "경남": "경상남도", "세종": "세종특별자치시", "강원": "강원특별자치도", "전북": "전북특별자치도", "제주": "제주특별자치도" };
    setRegSido(sidoMap[data.sido] || data.sido);
    setRegSigungu(data.sigungu);
    setRegRoadName(data.roadname);
    const bldNumMatch = data.roadAddress.match(new RegExp(`${data.roadname} (\\d+(?:-\\d+)?)`));
    setRegBldNum(bldNumMatch ? bldNumMatch[1] : "");
    setSelectedAddress(data.roadAddress);
    setIsPostcodeOpen(false); 
  };

  const handleAnalyze = async () => {
    if (!file) return alert("파일을 선택하세요.");
    setLoading(true); setAnalysis(""); setMessages([]); 
    const formData = new FormData(); formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE_URL}/analyze`, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setAnalysis(data.analysis);
        setCurrentView('history'); 
      } else throw new Error(data.detail);
    } catch (err) { alert("분석 실패: " + err.message); } finally { setLoading(false); }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const newMsgs = [...messages, { role: 'user', text: chatInput }];
    setMessages(newMsgs); setChatInput(""); setChatLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_message: chatInput, analysis_context: analysis })
      });
      const data = await res.json();
      setMessages([...newMsgs, { role: 'ai', text: data.reply }]);
    } catch (err) { alert("채팅 실패!"); } finally { setChatLoading(false); }
  };

  // 🌟 자유 대화형 챗봇 핸들러 (팝업과 전체화면 모두 이 함수를 씁니다)
  const handleFreeChat = async () => {
    if (!freeChatInput.trim()) return;
    const newMsgs = [...freeMessages, { role: 'user', text: freeChatInput }];
    setFreeMessages(newMsgs); setFreeChatInput(""); setFreeChatLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_message: freeChatInput, 
          analysis_context: "현재는 문서 분석 모드가 아닌 자유 대화 모드입니다. 사용자의 일반적인 부동산 관련 질문이나 용어, 전세사기 예방 등에 대해 친절하고 전문적으로 자유롭게 답변해주세요." 
        })
      });
      const data = await res.json();
      setFreeMessages([...newMsgs, { role: 'ai', text: data.reply }]);
    } catch (err) { alert("채팅 실패!"); } finally { setFreeChatLoading(false); }
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - chatOffset.x, y: e.clientY - chatOffset.y };
    e.target.setPointerCapture(e.pointerId); 
  };

  const handleDragMove = (e) => {
    if (isDragging) {
      setChatOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    }
  };

  const handleDragEnd = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  const handleFetchRegister = async () => {
    if (!regSido || !selectedAddress) return alert("주소를 검색해 주세요!");
    setRegLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/fetch-real-estate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, addr_sido: regSido, addr_sigungu: regSigungu, addr_roadName: regRoadName, addr_buildingNumber: regBldNum, dong: regDong, ho: regHo, realtyType: regRealtyType })
      });
      const data = await res.json();
      setRegResult(data);
      if (data.data) fetchRegHistory();
    } catch (err) { alert("조회 실패!"); } finally { setRegLoading(false); }
  };

  const handleDownloadPDF = () => {
    let pdfBase64 = null;
    if (regResult && regResult.data) {
      const dataObj = Array.isArray(regResult.data) ? regResult.data[0] : regResult.data;
      if (dataObj) pdfBase64 = dataObj.resOriGinalData || dataObj.resoriGinalData;
    }
    if (pdfBase64) {
      const linkSource = `data:application/pdf;base64,${pdfBase64}`;
      const downloadLink = document.createElement("a");
      downloadLink.href = linkSource;
      downloadLink.download = `등기부등본_${selectedAddress.replace(/ /g, '_')}.pdf`;
      downloadLink.click();
    } else {
      alert("API 응답에 PDF 파일 데이터가 없습니다. 화면을 인쇄합니다.");
      window.print();
    }
  };

  const downloadSavedPDF = (pdfBase64, address) => {
    const linkSource = `data:application/pdf;base64,${pdfBase64}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = linkSource;
    downloadLink.download = `[재열람]등기부_${address.replace(/ /g, '_')}.pdf`;
    downloadLink.click();
  };

  const handleSearchEstates = async () => {
    if (!searchSido || !searchSigun || !searchDong) return alert("시/도, 시/군/구, 읍/면/동을 모두 입력해주세요.");
    setEstateLoading(true); setEstateList([]); setMarketResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/fetch-estate-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addr_sido: searchSido, addr_sigun: searchSigun, addr_dong: searchDong })
      });
      const data = await res.json();
      if (data.data) {
        setEstateList(Array.isArray(data.data) ? data.data : [data.data]);
      } else {
        alert("해당 지역에 검색된 단지가 없습니다.");
      }
    } catch (err) { alert("단지 검색 실패!"); } finally { setEstateLoading(false); }
  };

  const handleFetchMarketPrice = async (complexNo) => {
    setMarketLoading(true); setMarketResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/fetch-market-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complex_no: complexNo })
      });
      const data = await res.json();
      setMarketResult(data);
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
    } catch (err) { alert("시세 조회 실패!"); } finally { setMarketLoading(false); }
  };

  if (!isLoggedIn) return <Login onLoginSuccess={(id) => { setIsLoggedIn(true); setUserId(id); }} />;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-main)', color: 'var(--text)' }}>
      <aside style={{ width: '280px', background: 'var(--bg-main)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', cursor: 'pointer', marginBottom: '20px' }} onClick={() => setCurrentView('home')}>
          <ShieldCheck size={28} color="var(--accent)" />
          <span style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>SafeHome</span>
        </div>
        <button onClick={() => setCurrentView('home')} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 15px', borderRadius: '50px', background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: '1rem', fontWeight: '500', marginBottom: '30px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <Plus size={20} /> 새 분석 시작
        </button>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.85rem', color: '#888', padding: '0 10px', marginBottom: '10px', fontWeight: '600' }}>메뉴</div>
          <div onClick={() => setCurrentView('archive')} style={{ padding: '12px 15px', borderRadius: '10px', cursor: 'pointer', background: currentView === 'archive' ? 'var(--card-bg)' : 'transparent', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}>
            <Archive size={18} color="var(--accent)" /> 내 등기부 보관함
          </div>
          <div onClick={() => setCurrentView('history')} style={{ padding: '12px 15px', borderRadius: '10px', cursor: 'pointer', background: currentView === 'history' ? 'var(--card-bg)' : 'transparent', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}>
            <FileSearch size={18} color="var(--accent)" /> 계약서 AI 상담
          </div>
          {/* 🌟 전체화면 챗봇 메뉴 추가 */}
          <div onClick={() => { setCurrentView('freechat'); setIsChatOpen(false); }} style={{ padding: '12px 15px', borderRadius: '10px', cursor: 'pointer', background: currentView === 'freechat' ? 'var(--card-bg)' : 'transparent', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}>
            <Maximize2 size={18} color="var(--accent)" /> 전체화면 AI 상담
          </div>
          <div onClick={() => setCurrentView('market')} style={{ padding: '12px 15px', borderRadius: '10px', cursor: 'pointer', background: currentView === 'market' ? 'var(--card-bg)' : 'transparent', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}>
            <TrendingUp size={18} color="var(--accent)" /> 아파트 시세 조회
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', textAlign: 'left', borderRadius: '8px' }}>
            {theme === 'light' ? <><Moon size={20} /> 다크 모드</> : <><Sun size={20} /> 라이트 모드</>}
          </button>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', textAlign: 'left', borderRadius: '8px' }}>
            <LogOut size={20} /> 로그아웃
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        {currentView === 'home' && (
          <div className="fade-in" style={{ flex: 1, overflowY: 'auto', padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', background: 'linear-gradient(90deg, #1a73e8, #9c27b0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '50px', textAlign: 'center' }}>무엇을 도와드릴까요?</h2>
            <div className="service-grid" style={{ width: '100%', maxWidth: '900px' }}>
              <div className="service-card" onClick={() => setCurrentView('contract')}>
                <div className="icon-wrapper blue"><FileSearch size={40} color="white" /></div>
                <h4>스마트 계약서 분석</h4>
                <p>계약서 이미지를 올려 AI 위험 진단을 받아보세요.</p>
              </div>
              <div className="service-card" onClick={() => setCurrentView('register')}>
                <div className="icon-wrapper green"><Building2 size={40} color="white" /></div>
                <h4>실시간 등기 발급</h4>
                <p>대법원 데이터를 바탕으로 권리 관계를 확인합니다.</p>
              </div>
              <div className="service-card" onClick={() => setCurrentView('market')}>
                <div className="icon-wrapper" style={{ background: '#fbbc05' }}><TrendingUp size={40} color="white" /></div>
                <h4>아파트 시세 조회</h4>
                <p>최신 면적별 실거래가와 전세가를 한눈에 확인하세요.</p>
              </div>
              <div className="service-card" onClick={() => setCurrentView('history')}>
                <div className="icon-wrapper yellow"><MessageSquare size={40} color="white" /></div>
                <h4>계약서 AI 상담</h4>
                <p>분석된 계약서 결과를 바탕으로 AI와 깊이 있게 상담하세요.</p>
              </div>
              {/* 🌟 메인 화면에도 전체화면 챗봇 바로가기 추가 */}
              <div className="service-card" onClick={() => setCurrentView('freechat')} style={{ gridColumn: 'span 2' }}>
                <div className="icon-wrapper" style={{ background: '#9c27b0' }}><Maximize2 size={40} color="white" /></div>
                <h4>전체화면 AI 자유 상담</h4>
                <p>넓고 쾌적한 화면에서 부동산 관련 궁금증을 자유롭게 물어보세요.</p>
              </div>
            </div>
          </div>
        )}

        {currentView === 'archive' && (
          <div className="fade-in" style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
            <button className="back-btn" onClick={() => setCurrentView('home')}><ArrowLeft size={20}/> 뒤로가기</button>
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
          <div className="fade-in" style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
            <button className="back-btn" onClick={() => setCurrentView('home')}><ArrowLeft size={20}/> 뒤로가기</button>
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
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {!analysis && messages.length === 0 && !loading && (
                <div style={{ textAlign: 'center', color: '#888', marginTop: '100px' }}>
                  <ShieldCheck size={50} color="var(--accent)" style={{ marginBottom: '15px', opacity: 0.5 }} />
                  <h3>진행된 계약서 분석이 없습니다.</h3>
                  <p>왼쪽 메뉴의 '스마트 계약서 분석'에서 문서를 먼저 업로드해주세요.</p>
                </div>
              )}
              {loading && (
                 <div style={{ display: 'flex', gap: '15px' }}><div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><ShieldCheck size={24}/></div>
                   <div style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '15px', border: '1px solid var(--border)' }}>계약서 문서를 정밀하게 확인하고 있습니다...</div>
                 </div>
              )}
              {analysis && (
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}><ShieldCheck size={24}/></div>
                  <div style={{ flex: 1, background: 'var(--card-bg)', padding: '25px', borderRadius: '15px', border: '1px solid var(--border)' }}>
                    <h3 style={{ marginTop: 0, color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: '15px', marginBottom: '20px' }}>📄 AI 계약서 정밀 분석 리포트</h3>
                    <div className="md-content"><ReactMarkdown>{analysis}</ReactMarkdown></div>
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: '15px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                  {m.role === 'ai' && <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}><ShieldCheck size={24}/></div>}
                  <div style={{ maxWidth: '80%', background: m.role === 'user' ? '#f0f4f9' : 'var(--card-bg)', color: m.role === 'user' ? '#111' : 'var(--text)', padding: '20px', borderRadius: '15px', border: m.role === 'user' ? 'none' : '1px solid var(--border)', lineHeight: '1.6' }}>
                    <div className="md-content"><ReactMarkdown>{m.text}</ReactMarkdown></div>
                  </div>
                </div>
              ))}
              {chatLoading && <div style={{ display: 'flex', gap: '15px' }}><div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><ShieldCheck size={24}/></div><div style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '15px', border: '1px solid var(--border)', color: '#888' }}>답변을 작성하고 있습니다...</div></div>}
            </div>
            
            <div style={{ padding: '20px 40px', background: 'var(--bg-main)' }}>
              <div style={{ display: 'flex', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '30px', padding: '10px 20px', alignItems: 'center' }}>
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={analysis ? "위 계약서 내용에 대해 궁금한 점을 질문해 보세요..." : "계약서를 먼저 분석해 주세요."} disabled={!analysis} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '1rem', padding: '10px' }} onKeyPress={(e) => e.key === 'Enter' && analysis && handleChat()} />
                <button onClick={handleChat} disabled={!analysis} style={{ background: 'var(--accent)', border: 'none', cursor: analysis ? 'pointer' : 'not-allowed', color: '#fff', width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: analysis ? 1 : 0.5 }}><Send size={20} style={{ marginLeft: '3px' }}/></button>
              </div>
            </div>
          </div>
        )}

        {/* 🌟 팝업과 대화 기록이 연동되는 '전체화면 자유 상담' UI */}
        {currentView === 'freechat' && (
          <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
            <div ref={fullScreenChatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {freeMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#888', marginTop: '100px' }}>
                  <MessageSquare size={50} color="var(--accent)" style={{ marginBottom: '15px', opacity: 0.5 }} />
                  <h3>부동산 자유 상담을 시작해보세요!</h3>
                  <p>전세사기 예방, 부동산 용어, 법률 지식 등 무엇이든 편하게 물어보세요.</p>
                </div>
              )}

              {freeMessages.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: '15px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                  {m.role === 'ai' && <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}><ShieldCheck size={24}/></div>}
                  <div style={{ maxWidth: '80%', background: m.role === 'user' ? '#f0f4f9' : 'var(--card-bg)', color: m.role === 'user' ? '#111' : 'var(--text)', padding: '20px', borderRadius: '15px', border: m.role === 'user' ? 'none' : '1px solid var(--border)', lineHeight: '1.6' }}>
                    <div className="md-content"><ReactMarkdown>{m.text}</ReactMarkdown></div>
                  </div>
                </div>
              ))}
              {freeChatLoading && <div style={{ display: 'flex', gap: '15px' }}><div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><ShieldCheck size={24}/></div><div style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '15px', border: '1px solid var(--border)', color: '#888' }}>답변을 작성하고 있습니다...</div></div>}
            </div>
            
            <div style={{ padding: '20px 40px', background: 'var(--bg-main)' }}>
              <div style={{ display: 'flex', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '30px', padding: '10px 20px', alignItems: 'center' }}>
                <input value={freeChatInput} onChange={(e) => setFreeChatInput(e.target.value)} placeholder={"부동산에 관한 궁금증을 자유롭게 질문해 보세요!"} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '1rem', padding: '10px' }} onKeyPress={(e) => e.key === 'Enter' && handleFreeChat()} />
                <button onClick={handleFreeChat} style={{ background: 'var(--accent)', border: 'none', cursor: 'pointer', color: '#fff', width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={20} style={{ marginLeft: '3px' }}/></button>
              </div>
            </div>
          </div>
        )}

        {currentView === 'register' && (
          <div className="fade-in" style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
            <button className="back-btn" onClick={() => setCurrentView('home')}><ArrowLeft size={20}/> 뒤로가기</button>
            <div style={{ maxWidth: '800px', margin: '0 auto', marginTop: '20px' }}>
              <section className="card" style={{ padding: '40px' }}>
                <h3 className="card-title" style={{ color: 'var(--accent)', marginBottom: '30px' }}><Building2 /> 부동산 실시간 등기 발급</h3>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                  <select value={regRealtyType} onChange={(e) => setRegRealtyType(e.target.value)} style={{ width: '200px', padding: '15px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <option value="1">🏢 집합건물 (아파트/빌라)</option>
                    <option value="0">🏠 토지/건물 (단독주택)</option>
                  </select>
                  <button onClick={() => setIsPostcodeOpen(true)} className="main-btn" style={{ flex: 1 }}><MapPin /> 도로명 주소 검색</button>
                </div>
                <input readOnly value={selectedAddress} placeholder="주소를 검색하세요" style={{ width: '100%', padding: '15px', marginBottom: '20px', borderRadius: '10px', border: '1px solid var(--border)' }} />
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                  <input placeholder="동 (예: 101동)" value={regDong} onChange={(e) => setRegDong(e.target.value)} style={{ flex: 1, padding: '15px', borderRadius: '10px', border: '1px solid var(--border)' }} />
                  <input placeholder="호 (예: 202호)" value={regHo} onChange={(e) => setRegHo(e.target.value)} style={{ flex: 1, padding: '15px', borderRadius: '10px', border: '1px solid var(--border)' }} />
                </div>
                <button onClick={handleFetchRegister} disabled={regLoading} className="main-btn" style={{ width: '100%', background: regLoading ? '#888' : '#34a853', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                  <Building2 size={20} />
                  {regLoading ? "대법원 통신 및 발급 중..." : "등기부등본 원본 가져오기 (대법원 캐시 차감)"}
                </button>
                
                {regResult && (
                  (regResult.result && regResult.result.code === "CF-00000") || regResult.data ? (
                    <div className="fade-in" style={{ background: 'var(--card-bg)', border: '2px solid #34a853', padding: '40px 30px', marginTop: '30px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 4px 15px rgba(52, 168, 83, 0.1)' }}>
                      <div style={{ width: '70px', height: '70px', background: '#e6f4ea', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <ShieldCheck size={40} color="#34a853" />
                      </div>
                      <h3 style={{ margin: '0 0 15px 0', color: '#34a853', fontSize: '1.5rem' }}>등기부등본 발급 성공!</h3>
                      <p style={{ color: '#888', marginBottom: '30px', lineHeight: '1.6' }}>대법원 원본 데이터가 안전하게 수신되었습니다.<br/>아래 버튼을 눌러 PDF 파일을 열람하거나 다운로드하세요.</p>
                      <button onClick={handleDownloadPDF} className="main-btn" style={{ margin: 0, padding: '15px 30px', fontSize: '1.1rem', background: '#34a853', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>📄 PDF 열람 및 다운로드</button>
                    </div>
                  ) : (
                    <div className="fade-in" style={{ background: 'var(--bg-main)', border: '1px solid #f44336', padding: '20px', marginTop: '30px', borderRadius: '10px', textAlign: 'center' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#f44336' }}>발급 오류 발생</h4>
                      <p style={{ color: 'var(--text)', fontSize: '0.9rem', marginBottom: 0 }}>{regResult.result?.message || regResult.error || "알 수 없는 오류가 발생했습니다."}</p>
                    </div>
                  )
                )}
              </section>
            </div>
          </div>
        )}

        {currentView === 'market' && (
          <div className="fade-in" style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
            <button className="back-btn" onClick={() => setCurrentView('home')}><ArrowLeft size={20}/> 뒤로가기</button>
            <div style={{ maxWidth: '800px', margin: '0 auto', marginTop: '20px' }}>
              <section className="card" style={{ padding: '40px' }}>
                <h3 className="card-title" style={{ color: 'var(--accent)', marginBottom: '30px' }}><TrendingUp /> 아파트 시세 조회</h3>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <input placeholder="시/도 (예: 서울특별시)" value={searchSido} onChange={(e) => setSearchSido(e.target.value)} style={{ flex: 1, padding: '15px', borderRadius: '10px', border: '1px solid var(--border)' }} />
                  <input placeholder="시/군/구 (예: 송파구)" value={searchSigun} onChange={(e) => setSearchSigun(e.target.value)} style={{ flex: 1, padding: '15px', borderRadius: '10px', border: '1px solid var(--border)' }} />
                  <input placeholder="읍/면/동 (예: 장지동)" value={searchDong} onChange={(e) => setSearchDong(e.target.value)} style={{ flex: 1, padding: '15px', borderRadius: '10px', border: '1px solid var(--border)' }} />
                </div>
                <button onClick={handleSearchEstates} disabled={estateLoading} className="main-btn" style={{ width: '100%', marginBottom: '30px' }}>
                  {estateLoading ? "단지 목록을 찾는 중..." : "해당 지역 단지 검색하기"}
                </button>
                
                {estateList.length > 0 && !marketResult && (
                  <div className="fade-in">
                    <h4 style={{ marginBottom: '15px', color: 'var(--text)' }}>검색된 단지 목록 ({estateList.length}건)</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {estateList.map((estate, idx) => (
                        <div key={idx} onClick={() => handleFetchMarketPrice(estate.commComplexNo)} style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }} className="hover-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <Building color="var(--accent)" />
                            <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>{estate.resComplexName}</span>
                          </div>
                          <span style={{ fontSize: '0.9rem', color: '#888', background: 'var(--card-bg)', padding: '5px 10px', borderRadius: '20px' }}>시세 확인 ➔</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {marketLoading && <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>단지 시세 정보를 대법원 캐시에서 불러오고 있습니다...</div>}
                
                {marketResult && marketResult.data && (
                  <div className="fade-in" style={{ marginTop: '20px', borderTop: '2px solid var(--border)', paddingTop: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                      <div>
                        <span style={{ background: 'var(--accent)', color: '#fff', padding: '5px 10px', borderRadius: '5px', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '10px', display: 'inline-block' }}>{marketResult.data.resType || "아파트"}</span>
                        <h4 style={{ fontSize: '1.5rem', color: 'var(--text)', margin: '0 0 5px 0' }}>{marketResult.data.resComplexName}</h4>
                        <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>{marketResult.data.commAddrRoadName}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 5px 0' }}>기준일: {marketResult.data.resFixedDate}</p>
                        <button onClick={() => setMarketResult(null)} style={{ background: 'none', border: '1px solid var(--border)', padding: '5px 15px', borderRadius: '5px', cursor: 'pointer', color: 'var(--text)' }}>다른 단지 검색</button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {marketResult.data.resAreaPriceList && marketResult.data.resAreaPriceList.map((priceInfo, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text)', marginBottom: '5px' }}>{priceInfo.resArea} ㎡</div>
                            <div style={{ fontSize: '0.9rem', color: '#888' }}>세대수: {priceInfo.resCompositionCnt}세대</div>
                          </div>
                          <div style={{ flex: 2, display: 'flex', gap: '20px', justifyContent: 'flex-end' }}>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.85rem', color: '#888', display: 'block' }}>매매 평균가</span>
                              <strong style={{ fontSize: '1.2rem', color: '#d32f2f' }}>
                                {formatKoreanPrice(priceInfo.resTopAveragePrice)}
                              </strong>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.85rem', color: '#888', display: 'block' }}>전세 평균가</span>
                              <strong style={{ fontSize: '1.2rem', color: '#1976d2' }}>
                                {formatKoreanPrice(priceInfo.resTopAveragePrice1)}
                              </strong>
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

      {/* 🌟 팝업 창 하단 여백 추가로 네이티브 크기 조절 손잡이가 노출되도록 완벽 해결 */}
      {isChatOpen && (
        <div style={{
          position: 'fixed', right: '30px', bottom: '100px',
          width: '380px', height: '550px',
          minWidth: '300px', minHeight: '400px',
          maxWidth: '90vw', maxHeight: '90vh',
          transform: `translate(${chatOffset.x}px, ${chatOffset.y}px)`,
          background: 'var(--bg-main)', border: '1px solid var(--border)',
          borderRadius: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', zIndex: 9999,
          resize: 'both', overflow: 'hidden', paddingBottom: '10px' 
        }}>
          <div
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            style={{
              padding: '15px', background: 'var(--accent)', color: '#fff',
              cursor: isDragging ? 'grabbing' : 'grab',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              userSelect: 'none', touchAction: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <MessageSquare size={20} /> 부동산 자유 질문 챗봇
            </div>
            {/* 전체화면 전환 버튼과 닫기 버튼 */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setIsChatOpen(false); setCurrentView('freechat'); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} title="전체화면으로 보기"><Maximize2 size={16} /></button>
              <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem', lineHeight: '1' }}>✖</button>
            </div>
          </div>

          <div ref={freeChatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', background: 'var(--card-bg)' }}>
            {freeMessages.length === 0 && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}><ShieldCheck size={20}/></div>
                <div style={{ background: 'var(--bg-main)', color: 'var(--text)', padding: '15px', borderRadius: '15px', border: '1px solid var(--border)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  <strong>부동산 AI 도우미입니다! 🏠</strong><br />전세사기 예방, 복잡한 부동산 용어, 관련 법률 등 무엇이든 자유롭게 질문해 보세요.
                </div>
              </div>
            )}

            {freeMessages.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                {m.role === 'ai' && <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}><ShieldCheck size={20}/></div>}
                <div style={{ maxWidth: '85%', background: m.role === 'user' ? '#f0f4f9' : 'var(--bg-main)', color: m.role === 'user' ? '#111' : 'var(--text)', padding: '15px', borderRadius: '15px', border: m.role === 'user' ? 'none' : '1px solid var(--border)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  <div className="md-content"><ReactMarkdown>{m.text}</ReactMarkdown></div>
                </div>
              </div>
            ))}
            {freeChatLoading && <div style={{ display: 'flex', gap: '10px' }}><div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><ShieldCheck size={20}/></div><div style={{ padding: '15px', background: 'var(--bg-main)', borderRadius: '15px', border: '1px solid var(--border)', color: '#888', fontSize: '0.95rem' }}>답변을 고민하고 있습니다...</div></div>}
          </div>

          <div style={{ padding: '15px', borderTop: '1px solid var(--border)', background: 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input value={freeChatInput} onChange={(e) => setFreeChatInput(e.target.value)} placeholder={"부동산 관련 자유롭게 질문해보세요!"} style={{ flex: 1, padding: '12px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', outline: 'none' }} onKeyPress={(e) => e.key === 'Enter' && handleFreeChat()} />
            <button onClick={handleFreeChat} style={{ background: 'var(--accent)', border: 'none', cursor: 'pointer', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={18} style={{ marginLeft: '2px' }}/></button>
          </div>
        </div>
      )}

      {/* 우측 하단 플로팅 챗봇 아이콘 버튼 */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        style={{
          position: 'fixed', right: '30px', bottom: '30px',
          width: '60px', height: '60px', borderRadius: '50%',
          background: 'var(--accent)', color: '#fff', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', zIndex: 9998
        }}
      >
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