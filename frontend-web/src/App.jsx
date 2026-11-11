import { useState } from 'react';
import './App.css';

export default function App() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Salut! Scrie-mi un oraș pentru a afla vremea (ex: Cum e vremea în Brașov?)." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 1. Adăugăm mesajul utilizatorului în interfață
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // 2. Trimitem conversația către backend-ul tău Python
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      // 3. Adăugăm răspunsul bot-ului în interfață
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (error) {
      console.error("Eroare:", error);
      setMessages([...newMessages, { role: "assistant", content: "Eroare: Nu m-am putut conecta la serverul Python." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>☁️ Weather AI Chatbot</h2>

      {/* Fereastra de chat */}
      <div style={{
        height: '400px', overflowY: 'auto', border: '1px solid #ccc',
        borderRadius: '8px', padding: '15px', marginBottom: '20px',
        backgroundColor: '#1e1e1e', display: 'flex', flexDirection: 'column'
      }}>
        {messages.map((msg, index) => (
          <div key={index} style={{
            margin: '8px 0', padding: '12px', borderRadius: '8px', maxWidth: '80%',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            backgroundColor: msg.role === 'user' ? '#646cff' : '#444',
            color: 'white', textAlign: 'left'
          }}>
            <span style={{ whiteSpace: 'pre-line' }}>{msg.content}</span>
          </div>
        ))}
        {loading && <div style={{ alignSelf: 'flex-start', color: '#888', marginTop: '10px' }}>Botul scrie...</div>}
      </div>

      {/* Formularul pentru trimiterea mesajului */}
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scrie un mesaj..."
          style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc', color: 'black' }}
        />
        <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '4px' }}>
          Trimite
        </button>
      </form>
    </div>
  );
}