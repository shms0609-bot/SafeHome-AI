import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sun, Moon, Send, FileSearch, Building2, ShieldCheck, MessageSquare, ArrowLeft, Upload, Search, Ruler } from 'lucide-react';
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

  // 🌟 분리된 도로명 주소 상태들
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

  const handleAnalyze = async () => {
    if (!file) return alert("파일을 선택하세요.");
    setLoading(true);
    setAnalysis("");
    setShowChat(false); 
    setMessages([]); 
    
    const formData = new FormData();
    formData.append('file', file);
    try {
      // ✨ 로컬 주소에서 Render 서버 주소로 변경 완료
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
      // ✨ 로컬 주소에서 Render 서버 주소로 변경 완료
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
    if (!regSido || !regSigungu || !regRoadName || !regBldNum) {
      return alert("시/도, 시/군/구, 도로명, 건물번호를 모두 입력해주세요.");
    }
    
    setRegLoading(true);
    setRegResult(null);
    
    try {
      // ✨ 로컬 주소에서 Render 서버 주소로 변경 완료
      const res = await fetch('https://safehome-ai-pkkv.onrender.com/fetch-real-estate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addr_sido: regSido,
          addr_sigungu: regSigungu,
          addr_roadName: regRoadName,        
          addr_buildingNumber: regBldNum,    
          dong: regDong,
          ho: regHo
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
              {/* 🌟 이름 제거 및 공용 인사말로 변경 완료! */}
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
            
            {currentView === 'contract' && (
              <div className="functional-layout">
                <div className="flex-col">
                  {!showChat ? (
                    <section className="card">
                      <h3 className="card-title"><Upload /> 계약서 업로드</h3>
                      <div className="big-upload-zone">
                        <input type="file" onChange={(e) => setFile(e.target.files[0])} id="up" hidden />
                        <label htmlFor="up" className="drop-area">{file ? file.name : "파일을 클릭하여 선택하세요"}</label>
                        <button onClick={handleAnalyze} className="main-btn">{loading ? "데이터 분석 엔진 가동 중..." : "AI 정밀 분석 시작"}</button>
                      </div>
                    </section>
                  ) : (
                    <section className="card scroll-y fixed-height">
                      <h3 className="card-title">📝 계약서 요약본</h3>
                      <div className="md-content">
                        <ReactMarkdown>{analysis}</ReactMarkdown>
                      </div>
                    </section>
                  )}
                </div>

                <div className="flex-col">
                  {!showChat ? (
                    <section className="card scroll-y fixed-height">
                      <h3 className="card-title">분석 리포트</h3>
                      <div className="md-content">
                        {analysis ? <ReactMarkdown>{analysis}</ReactMarkdown> : "결과가 여기에 표시됩니다."}
                      </div>
                      
                      {analysis && (
                        <div className="chat-start-box">
                          <p>분석된 계약서를 바탕으로 하자 분쟁 상담을 받아보시겠어요?</p>
                          <button onClick={() => setShowChat(true)} className="main-btn chat-start-btn">
                            <MessageSquare size={24} /> AI와 1:1 상담 시작하기
                          </button>
                        </div>
                      )}
                    </section>
                  ) : (
                    <section className="kakao-chat-container">
                      <div className="kakao-header">
                        <MessageSquare size={20} /> 하자 보수 및 분쟁 AI 상담
                      </div>
                      <div className="kakao-chat-flow" ref={scrollRef}>
                        {messages.length === 0 && (
                          <div className="kakao-bubble ai">
                            안녕하세요! 왼쪽의 계약서 내용을 모두 숙지했습니다.<br/>
                            현재 거주 중이신 곳에 어떤 하자가 발생했는지 편하게 말씀해 주세요.
                          </div>
                        )}
                        {messages.map((m, i) => (
                          <div key={i} className={`kakao-bubble ${m.role}`}>
                            <ReactMarkdown>{m.text}</ReactMarkdown>
                          </div>
                        ))}
                        {chatLoading && <div className="kakao-bubble ai">답변을 생성 중입니다...</div>}
                      </div>
                      <div className="kakao-input-bar">
                        <input 
                          value={chatInput} 
                          onChange={(e)=>setChatInput(e.target.value)} 
                          placeholder="메시지를 입력하세요..." 
                          onKeyPress={(e)=>e.key==='Enter'&&handleChat()}
                        />
                        <button onClick={handleChat}><Send size={20} color="#333" /></button>
                      </div>
                    </section>
                  )}
                </div>
              </div>
            )}

            {currentView === 'register' && (
              <div className="functional-layout" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <section className="card" style={{ width: '100%', maxWidth: '800px' }}>
                  <h3 className="card-title"><Building2 /> 부동산 실시간 등기 조회</h3>
                  <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '30px' }}>
                    대법원 인터넷등기소의 데이터를 실시간으로 조회하여 권리관계를 확인합니다.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <input 
                        value={regSido}
                        onChange={(e) => setRegSido(e.target.value)}
                        placeholder="시/도 (예: 서울특별시)" 
                        style={{ flex: 1, padding: '20px', fontSize: '1.2rem', borderRadius: '15px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }} 
                      />
                      <input 
                        value={regSigungu}
                        onChange={(e) => setRegSigungu(e.target.value)}
                        placeholder="시/군/구 (예: 강남구)" 
                        style={{ flex: 1, padding: '20px', fontSize: '1.2rem', borderRadius: '15px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }} 
                      />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <input 
                        value={regRoadName}
                        onChange={(e) => setRegRoadName(e.target.value)}
                        placeholder="도로명 (예: 테헤란로)" 
                        style={{ flex: 1, padding: '20px', fontSize: '1.2rem', borderRadius: '15px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }} 
                      />
                      <input 
                        value={regBldNum}
                        onChange={(e) => setRegBldNum(e.target.value)}
                        placeholder="건물번호 (예: 123)" 
                        style={{ flex: 1, padding: '20px', fontSize: '1.2rem', borderRadius: '15px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }} 
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '20px' }}>
                      <input 
                        value={regDong}
                        onChange={(e) => setRegDong(e.target.value)}
                        placeholder="동 입력 (예: 101동, 단독주택이면 생략)" 
                        style={{ flex: 1, padding: '20px', fontSize: '1.2rem', borderRadius: '15px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text)' }} 
                      />
                      <input 
                        value={regHo}
                        onChange={(e) => setRegHo(e.target.value)}
                        placeholder="호 입력 (예: 202호, 단독주택이면 생략)" 
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

      {/* 플로팅 AI 챗봇 위젯 */}
      <div className="floating-chat-widget">
        {isFloatingChatOpen && (
          <div className="floating-chat-window">
            <div className="floating-header">
              <span>🤖 SafeHome AI 상담원</span>
              <button onClick={() => setIsFloatingChatOpen(false)}>✕</button>
            </div>
            <div className="floating-chat-flow" ref={floatingScrollRef}>
              {messages.length === 0 && (
                <div className="kakao-bubble ai" style={{ fontSize: '1rem', padding: '12px 16px' }}>
                  무엇이든 물어보세요! 부동산 계약 용어나 평소 궁금했던 하자에 대해 편하게 질문해 주세요.
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`kakao-bubble ${m.role}`} style={{ fontSize: '1rem', padding: '12px 16px' }}>
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
              ))}
              {chatLoading && <div className="kakao-bubble ai" style={{ fontSize: '1rem' }}>답변 생성 중...</div>}
            </div>
            <div className="floating-input-bar">
              <input 
                value={chatInput} 
                onChange={(e)=>setChatInput(e.target.value)} 
                placeholder="질문을 입력하세요..." 
                onKeyPress={(e)=>e.key==='Enter'&&handleChat()}
              />
              <button onClick={handleChat}><Send size={18} color="#333" /></button>
            </div>
          </div>
        )}
        <button className="floating-chat-btn" onClick={() => setIsFloatingChatOpen(!isFloatingChatOpen)}>
          <MessageSquare size={34} color="#131314" />
        </button>
      </div>
    </div>
  );
}

export default App;