import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import axios from "axios";

function Home() {
  const navigate = useNavigate();
  const cardStyle = {
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "24px",
    margin: "16px 0",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    cursor: "pointer",
    background: "#f9f9f9",
    textAlign: "center",
    fontSize: "18px",
    transition: "box-shadow 0.2s"
  };
  return (
    <div style={{ padding: "20px", maxWidth: 600, margin: "auto" }}>
      <h1>DeepSync</h1>
      <div style={cardStyle} onClick={() => navigate("/audio-gen")}>Sample Audio Input & Transcript → Generate New Audio</div>
      <div style={cardStyle} onClick={() => navigate("/video-gen")}>Sample Video & Transcript → Generate New Video</div>
      <div style={cardStyle} onClick={() => navigate("/ai-check")}>Check if Video is AI Generated</div>
    </div>
  );
}

function AudioGenPage() {
  const [status, setStatus] = useState("");
  const handleClick = async () => {
    try {
      const res = await axios.post("http://localhost:8000/api/audio-gen", {});
      setStatus(res.data.message);
    } catch (err) {
      setStatus("Connection failed.");
    }
  };
  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "auto" }}>
      <h2>Generate New Audio</h2>
      <button onClick={handleClick}>Connect to Audio API</button>
      <p>{status}</p>
    </div>
  );
}

function VideoGenPage() {
  const [status, setStatus] = useState("");
  const handleClick = async () => {
    try {
      const res = await axios.post("http://localhost:8000/api/video-gen", {});
      setStatus(res.data.message);
    } catch (err) {
      setStatus("Connection failed.");
    }
  };
  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "auto" }}>
      <h2>Generate New Video</h2>
      <button onClick={handleClick}>Connect to Video API</button>
      <p>{status}</p>
    </div>
  );
}

function AICheckPage() {
  const [status, setStatus] = useState("");
  const handleClick = async () => {
    try {
      const res = await axios.post("http://localhost:8000/api/ai-check", {});
      setStatus(res.data.message);
    } catch (err) {
      setStatus("Connection failed.");
    }
  };
  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "auto" }}>
      <h2>Check if Video is AI Generated</h2>
      <button onClick={handleClick}>Connect to AI Check API</button>
      <p>{status}</p>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/audio-gen" element={<AudioGenPage />} />
        <Route path="/video-gen" element={<VideoGenPage />} />
        <Route path="/ai-check" element={<AICheckPage />} />
      </Routes>
    </Router>
  );
}

export default App;
