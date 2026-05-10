import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sun, Moon, Send, FileSearch, Building2, ShieldCheck, MessageSquare, ArrowLeft, Upload, Search, Ruler, MapPin } from 'lucide-react';
import DaumPostcode from 'react-daum-postcode';
import './App.css';

function App() {
  const [theme, setTheme] = useState('light');
  const [currentView, setCurrentView] = useState('home');
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [showChat, setShowChat] = useState(false); 
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false); 
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);

  // 🌟 다음 우편번호 & 주소 상태 관리
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(""); // 화면 표시용 전체 주소
  const [regRealtyType, setRegRealtyType] = useState("1"); // 1: 아파트/빌라, 0: 단독/다가구
  
  const [regSido, setRegSido] = useState("");
  const [regSigungu, setRegSigungu] = useState("");
  const [regRoadName, setRegRoadName] = useState(""); 
  const [regBldNum, setRegBldNum] = useState("");     
  const [regDong, setRegDong] = useState("");
  const [regHo, setRegHo] = useState("");
  
  const [regLoading, setRegLoading] = useState(false);
  const [regResult, setRegResult] = useState(null);
  
  const scrollRef = useRef(null);
  const floatingScrollRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    if (floatingScrollRef.current) floatingScrollRef.current.scrollTop = floatingScrollRef.current.scrollHeight;
  }, [messages, chatLoading, showChat, isFloatingChatOpen]);

  // 🌟 다음 우편번호 검색 완료 시 실행되는 마법의 함수
  const handleCompletePostcode = (data) => {
    // 1. 대법원 규격에 맞게 시/도 이름 풀네임으로 변환
    const sidoMap = {
      "서울": "서울특별시", "부산": "부산광역시", "대구": "대구광역시", "인천": "인천광역시",
      "광주": "광주광역시", "대전": "대전광역시", "울산": "울산광역시", "경기": "경기도",
      "충북": "충청북도", "충남": "충청남도", "전남": "전라남도", "경북": "경상북도", "경남": "경상남도",
      "세종": "세종특별자치시", "강원": "강원특별자치도", "전북": "전북특별자치도", "제주": "제주특별자치도"
    };
    
    setRegSido(sidoMap[data.sido] || data.sido);
    setRegSigungu(data.sigungu);
    setRegRoadName(data.roadname);

    // 2. 도로명 주소에서 건물번호만 쏙 뽑아내기 (예: 테헤란로 123 -> 123)
    const bldNumMatch = data.roadAddress.match(new RegExp(`${data.roadname} (\\d+(?:-\\d+)?)`));
    setRegBldNum(bldNumMatch ? bldNumMatch[1] : "");

    // 3. 화면에 예쁘게 보여주기
    setSelectedAddress(data.roadAddress);
    setIsPostcodeOpen(false); // 팝업 닫기
  };

  const handleAnalyze = async () => {
    if (!file) return alert("파일을 선택하세요.");
    setLoading(true);
    setAnalysis("");
    setShowChat(false); 
    setMessages([]); 
    
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('https://safehome-ai-pkkv.onrender.com/analyze', { method: 'POST', body: formData });
      if (!res.ok) throw new Error("서버 응답 오류");
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err) { 
      alert("분석 중 오류가 발생했습니다.");
    } finally { setLoading(false); }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const newMsgs = [...messages, { role: 'user', text: chatInput }];
    setMessages(newMsgs);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch('https://safehome-ai-pkkv.onrender.com/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_message: chatInput, analysis_context: analysis })
      });
      const data = await res.json();
      setMessages([...newMsgs, { role: 'ai', text: data.reply }]);
    } catch (err) { 
      alert("상담 서버 연결 실패"); 
    } finally { setChatLoading(false); }
  };

  const handleFetchRegister = async () => {
    if (!regSido || !selectedAddress) {
      return alert("먼저 도로명 주소 검색을 진행해 주세요!");
    }
    
    setRegLoading(true);
    setRegResult(null);
    
    try {
      const res = await fetch('https://safehome-ai-pkkv.onrender.com/fetch-real-estate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addr_sido: regSido,
          addr_sigungu: regSigungu,
          addr_roadName: regRoadName,        
          addr_buildingNumber: regBldNum,    
          dong: regDong,
          ho: regHo,
          realtyType: regRealtyType // 🌟 건물 유형 추가 전송
        })
      });
      const data = await res.json();
      setRegResult(data);
    } catch (err) {
      setRegResult({ error: "조회 중 통신 에러가 발생했습니다." });
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="gemini-container">
      <nav className="nav-bar">
        <div className="nav-left" onClick={() => { setCurrentView('home'); setShowChat(false); }}>
          <ShieldCheck size={36} color="var(--accent)" />
          <span className="logo-text">SafeHome AI</span>
        </div>
        <button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? <Moon size={28} /> : <Sun size={28} />}
        </button>
      </nav>

      <main className="main-content fade-in">
        {currentView === 'home' ? (
          <div className="home-dashboard">
            <section className="hero-section">
              <h2>환영합니다.<br/>어떤 도움이 필요하신가요?</h2>
              <div className="search-bar-mock">
                <input placeholder="계약서 분석, 실시간 등기 조회, 하자 분쟁 상담 등..." />
                <Search size={30} color="var(--accent)" />
              </div>
            </section>
            
            <section className="service-grid">
              <div className="service-card" onClick={() => setCurrentView('contract')}>
                <div className="icon-wrapper blue"><FileSearch size={48} color="white" /></div>
                <h4>스마트 계약서 분석</h4>
                <p>AI가 전세 사기 위험 요소를 정밀 진단합니다.</p>
              </div>
              <div className="service-card" onClick={() => setCurrentView('register')}>
                <div className="icon-wrapper green"><Building2 size={48} color="white" /></div>
                <h4>실시간 등기 조회</h4>
                <p>대법원 데이터를 바탕으로 권리 관계를 확인합니다.</p>
              </div>
              <div className="service-card" onClick={() => { setCurrentView('chat'); setShowChat(true); }}>
                <div className="icon-wrapper yellow"><MessageSquare size={48} color="white" /></div>
                <h4>하자 및 분쟁 상담</h4>
                <p>법률 판례 기반의 1:1 상담을 진행합니다.</p>
              </div>
              <div className="service-card" onClick={() => alert("공간 최적화 기능은 준비 중입니다!")}>
                <div className="icon-wrapper" style={{ background: '#9c27b0' }}><Ruler size={48} color="white" /></div>
                <h4>공간 최적화 & 체크리스트</h4>
                <p>콤팩트한 방 구조 배치와 룸투어 체크리스트를 제공합니다.</p>
              </div>
            </section>
          </div>
        ) : (
          <div className="view-container">
            <button className="back-btn" onClick={() => { setCurrentView('home'); setShowChat(false); setRegResult(null); }}>
              <ArrowLeft size={24}/> 대시보드로 돌아가기
            </button>
            
            {/* ... (contract 뷰 생략, 그대로 유지) ... */}

            {currentView === 'register' && (
              <div className="functional-layout" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <section className="card" style={{ width: '100%', maxWidth: '800px' }}>
                  <h3 className="card-title"><Building2 /> 부동산 실시간 등기 조회</h3>
                  <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '30px' }}>
                    안전한 조회를 위해 도로명 주소 검색을 이용해 주세요.
                  </p>
                  
                  {/* 🌟 택배 스타일 주소 입력 UI로 대폭 변경! */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <select 
                        value={regRealtyType} 
                        onChange={(e) => setRegRealtyType(e.target.value)}
                        style={{ width: '200px', padding: '15px', fontSize: '1.2rem', borderRadius: '15px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }}
                      >
                        <option value="1">🏢 아파트/오피스텔/빌라</option>
                        <option value="0">🏠 단독주택/다가구/토지</option>
                      </select>
                      
                      <button 
                        onClick={() => setIsPostcodeOpen(true)}
                        className="main-btn"
                        style={{ margin: 0, padding: '15px', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                      >
                        <MapPin size={24} /> 도로명 주소 검색
                      </button>
                    </div>

                    <input 
                      readOnly
                      value={selectedAddress}
                      placeholder="위 버튼을 눌러 주소를 검색하세요" 
                      style={{ width: '100%', padding: '20px', fontSize: '1.2rem', borderRadius: '15px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)', cursor: 'not-allowed' }} 
                    />
                    
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <input 
                        value={regDong}
                        onChange={(e) => setRegDong(e.target.value)}
                        placeholder="동 입력 (예: 101동, 없으면 생략)" 
                        style={{ flex: 1, padding: '20px', fontSize: '1.2rem', borderRadius: '15px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }} 
                      />
                      <input 
                        value={regHo}
                        onChange={(e) => setRegHo(e.target.value)}
                        placeholder="호 입력 (예: 202호, 없으면 생략)" 
                        style={{ flex: 1, padding: '20px', fontSize: '1.2rem', borderRadius: '15px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }} 
                      />
                    </div>

                    <button 
                      onClick={handleFetchRegister}
                      disabled={regLoading}
                      className="main-btn" 
                      style={{ background: regLoading ? '#888' : '#34a853', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                    >
                      <Search size={24} />
                      {regLoading ? "대법원 서버 통신 중..." : "안전 등기 데이터 조회하기"}
                    </button>
                  </div>
                </section>

                {regResult && (
                  <section className="card" style={{ width: '100%', maxWidth: '800px', marginTop: '20px', padding: '30px' }}>
                    <h3 style={{ marginBottom: '15px', color: 'var(--accent)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Building2 /> 조회 결과 데이터
                    </h3>
                    <pre style={{ 
                      background: '#1e1e1e', color: '#d4d4d4', padding: '20px', borderRadius: '15px', 
                      overflowX: 'auto', fontSize: '1rem', lineHeight: '1.5', maxHeight: '400px', overflowY: 'auto'
                    }}>
                      {JSON.stringify(regResult, null, 2)}
                    </pre>
                  </section>
                )}
              </div>
            )}

          </div>
        )}
      </main>

      {/* 🌟 다음 우편번호 팝업창 */}
      {isPostcodeOpen && (
        <div className="postcode-overlay" onClick={() => setIsPostcodeOpen(false)}>
          <div className="postcode-modal" onClick={(e) => e.stopPropagation()}>
            <button className="postcode-close" onClick={() => setIsPostcodeOpen(false)}>닫기 ✕</button>
            <DaumPostcode onComplete={handleCompletePostcode} autoClose={false} />
          </div>
        </div>
      )}

      {/* ... (플로팅 챗봇 생략, 그대로 유지) ... */}
    </div>
  );
}

export default App;