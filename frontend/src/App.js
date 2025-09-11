import { useState } from "react";
import axios from "axios";

function App() {
  const [msg, setMsg] = useState("");

  const callAPI = async () => {
    const res = await axios.get("http://localhost:8000/");
    setMsg(res.data.message);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>React + FastAPI Demo</h1>
      <button onClick={callAPI}>Call Backend</button>
      <p>{msg}</p>
    </div>
  );
}

export default App;
