import { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown'; // 추가됨

function App() {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return alert("분석할 계약서 사진을 선택해주세요!");
    setLoading(true);
    setAnalysis("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://127.0.0.1:8000/analyze", formData);
      setAnalysis(response.data.analysis);
    } catch (error) {
      console.error(error);
      alert("서버 연결 실패! 백엔드를 확인하세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🏠 SafeHome AI</h1>
        <p style={styles.subtitle}>소중한 보증금을 지키는 스마트한 파트너</p>
      </header>

      <main style={styles.main}>
        <div style={styles.uploadBox}>
          <input type="file" onChange={handleFileChange} accept="image/*" style={styles.fileInput} />
          <button onClick={handleUpload} disabled={loading} style={styles.button}>
            {loading ? "전문가 AI가 분석 중..." : "계약서 무료 분석 시작"}
          </button>
        </div>

        {loading && (
          <div style={styles.loadingBox}>
            <div className="spinner"></div>
            <p>문서의 독소 조항과 사기 패턴을 정밀 분석 중입니다...</p>
          </div>
        )}

        {analysis && (
          <div style={styles.resultBox}>
            <h2 style={styles.resultTitle}>📋 AI 상세 분석 리포트</h2>
            <hr style={styles.hr} />
            <div style={styles.markdownContent}>
              {/* 마크다운으로 변환하여 출력 */}
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Wood & White 테마 스타일
const styles = {
  container: { padding: '60px 20px', minHeight: '100vh', backgroundColor: '#F9F7F2', color: '#443C33', fontFamily: '"Noto Sans KR", sans-serif' },
  header: { textAlign: 'center', marginBottom: '50px' },
  title: { fontSize: '2.8rem', color: '#5D4037', marginBottom: '12px', fontWeight: '800' },
  subtitle: { color: '#8D6E63', fontSize: '1.1rem' },
  main: { maxWidth: '850px', margin: '0 auto' },
  uploadBox: { backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(93, 64, 55, 0.08)', textAlign: 'center', marginBottom: '40px', border: '1px solid #EFEBE9' },
  fileInput: { marginBottom: '25px', fontSize: '1rem' },
  button: { padding: '15px 40px', backgroundColor: '#795548', color: '#FFFFFF', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: '600', transition: 'all 0.3s ease' },
  loadingBox: { textAlign: 'center', color: '#795548', padding: '40px' },
  resultBox: { backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', borderTop: '8px solid #5D4037' },
  resultTitle: { color: '#3E2723', marginBottom: '15px', textAlign: 'center' },
  hr: { border: '0', height: '1px', backgroundColor: '#EFEBE9', marginBottom: '25px' },
  markdownContent: { lineHeight: '1.8', color: '#4E342E', fontSize: '1.05rem' }
};

export default App;