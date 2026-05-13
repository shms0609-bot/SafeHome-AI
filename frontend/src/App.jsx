import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sun, Moon, Send, FileSearch, Building2, ShieldCheck, MessageSquare, ArrowLeft, Upload, Search, MapPin, LogOut, Plus, Archive } from 'lucide-react';
import DaumPostcode from 'react-daum-postcode';
import './App.css';

// 🌟 승현님의 실제 Render 백엔드 주소 적용 완료!
const API_BASE_URL = "https://safehome-ai-pkkv.onrender.com"; 

function Login({ onLoginSuccess }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
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
          alert(`가입 성공! 로그인을 진행해 주세요.`);
          setIsRegisterMode(false); setName("");
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
      <div style={{ background: 'var(--card-bg)', padding: '40px', borderRadius: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', border: '1px solid var(--border)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <ShieldCheck size={32} /> {isRegisterMode ? "회원가입" : "로그인"}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isRegisterMode && <input type="text" placeholder="이름 (닉네임)" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }} required />}
          <input type="text" placeholder="아이디" value={id} onChange={(e) => setId(e.target.value)} style={{ padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }} required />
          <input type="password" placeholder="비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} style={{ padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }} required />
          <button type="submit" className="main-btn" style={{ padding: '15px', marginTop: '10px' }}>{isRegisterMode ? "가입하기" : "로그인"}</button>
        </form>
        <button type="button" onClick={() => setIsRegisterMode(!isRegisterMode)} style={{ marginTop: '20px', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', width: '100%' }}>
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
  
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);

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

  const scrollRef = useRef(null);

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
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, chatLoading, analysis, currentView]);

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
    setCurrentView('history'); 
    const formData = new FormData(); formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE_URL}/analyze`, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) setAnalysis(data.analysis);
      else throw new Error(data.detail);
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

  const handleFetchRegister = async () => {
    if (!regSido || !selectedAddress) return alert("주소를 검색해 주세요!");
    setRegLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/fetch-real-estate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: userId, 
          addr_sido: regSido, addr_sigungu: regSigungu, addr_roadName: regRoadName, addr_buildingNumber: regBldNum, dong: regDong, ho: regHo, realtyType: regRealtyType 
        })
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

  if (!isLoggedIn) return <Login onLoginSuccess={(id) => { setIsLoggedIn(true); setUserId(id); }} />;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-main)', color: 'var(--text)' }}>
      {/* 🌟 사이드바 */}
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
            <MessageSquare size={18} color="var(--accent)" /> AI 상담 기록
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

      {/* 🌟 메인 컨텐츠 */}
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
              <div className="service-card" onClick={() => setCurrentView('archive')}>
                <div className="icon-wrapper yellow"><Archive size={40} color="white" /></div>
                <h4>등기부 보관함</h4>
                <p>과거에 발급받은 등기부등본을 다시 확인하세요.</p>
              </div>
            </div>
          </div>
        )}

        {/* 🌟 보관함 화면 */}
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

        {/* 계약서 분석 화면 */}
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

        {/* AI 상담 화면 */}
        {currentView === 'history' && (
          <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {!analysis && messages.length === 0 && !loading && (
                <div style={{ textAlign: 'center', color: '#888', marginTop: '100px' }}><h3>진행된 분석이나 대화가 없습니다.</h3><p>왼쪽 메뉴의 '새 분석 시작'을 눌러주세요.</p></div>
              )}
              {loading && (
                 <div style={{ display: 'flex', gap: '15px' }}><div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><ShieldCheck size={24}/></div>
                   <div style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '15px', border: '1px solid var(--border)' }}>문서를 확인하고 있습니다...</div>
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
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={analysis ? "궁금한 점을 질문해 보세요..." : "계약서를 먼저 분석해 주세요."} disabled={!analysis} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '1rem', padding: '10px' }} onKeyPress={(e) => e.key === 'Enter' && analysis && handleChat()} />
                <button onClick={handleChat} disabled={!analysis} style={{ background: 'var(--accent)', border: 'none', cursor: analysis ? 'pointer' : 'not-allowed', color: '#fff', width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: analysis ? 1 : 0.5 }}><Send size={20} style={{ marginLeft: '3px' }}/></button>
              </div>
            </div>
          </div>
        )}

        {/* 등기 발급 화면 */}
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
                
                {/* 🌟 수정된 성공/실패 화면 렌더링 UI */}
                {regResult && (
                  (regResult.result && regResult.result.code === "CF-00000") || regResult.data ? (
                    <div className="fade-in" style={{ background: 'var(--card-bg)', border: '2px solid #34a853', padding: '40px 30px', marginTop: '30px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 4px 15px rgba(52, 168, 83, 0.1)' }}>
                      <div style={{ width: '70px', height: '70px', background: '#e6f4ea', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <ShieldCheck size={40} color="#34a853" />
                      </div>
                      <h3 style={{ margin: '0 0 15px 0', color: '#34a853', fontSize: '1.5rem' }}>등기부등본 발급 성공!</h3>
                      <p style={{ color: '#888', marginBottom: '30px', lineHeight: '1.6' }}>
                        대법원 원본 데이터가 안전하게 수신되었습니다.<br/>
                        아래 버튼을 눌러 PDF 파일을 열람하거나 다운로드하세요.
                      </p>
                      <button onClick={handleDownloadPDF} className="main-btn" style={{ margin: 0, padding: '15px 30px', fontSize: '1.1rem', background: '#34a853', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                        📄 PDF 열람 및 다운로드
                      </button>
                    </div>
                  ) : (
                    <div className="fade-in" style={{ background: 'var(--bg-main)', border: '1px solid #f44336', padding: '20px', marginTop: '30px', borderRadius: '10px', textAlign: 'center' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#f44336' }}>발급 오류 발생</h4>
                      <p style={{ color: 'var(--text)', fontSize: '0.9rem', marginBottom: 0 }}>
                        {regResult.result?.message || regResult.error || "알 수 없는 오류가 발생했습니다."}
                      </p>
                    </div>
                  )
                )}

              </section>
            </div>
          </div>
        )}
      </main>

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