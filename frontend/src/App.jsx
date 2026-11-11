import { useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  "Ce temperatură e în Brașov?",
  "Cum va fi vremea mâine în București?",
  "Prognoza pe săptămână pentru Cluj-Napoca",
];

const WELCOME = {
  role: "assistant",
  content: "Salut! Întreabă-mă de vremea din orice oraș din România.",
};

const dayName = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("ro-RO", { weekday: "short", day: "numeric" });

function WeatherCard({ data }) {
  const { city, county, current, forecast } = data;
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="city">{city}</div>
          <div className="sub">{county ? `Jud. ${county.replace(/^Județul\s*/i, "")} · ` : ""}{current.description}</div>
        </div>
        <div className="temp">{Math.round(current.temperature)}°</div>
      </div>
      <div className="stats">
        <span>Se simt {Math.round(current.feels_like)}°</span>
        <span>Umiditate {current.humidity}%</span>
        <span>Vânt {Math.round(current.wind_kmh)} km/h</span>
      </div>
      {forecast.length > 1 && (
        <div className="forecast">
          {forecast.map((d) => (
            <div className="day" key={d.date}>
              <div className="day-name">{dayName(d.date)}</div>
              <div className="day-temp">{Math.round(d.max)}° <small>{Math.round(d.min)}°</small></div>
              <div className="day-rain">{d.rain_chance ?? 0}%</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // trimitem doar conversatia reala (fara mesajul de bun venit si fara cardurile)
        body: JSON.stringify({
          messages: next.slice(1).map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok) throw new Error("server");
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply, weather: data.weather }]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Nu mă pot conecta la server. Pornește backend-ul (port 8000) și încearcă din nou." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <header>
        <h1>Vremea în România</h1>
        <p>Scrie orașul și ce vrei să afli.</p>
      </header>

      <section className="chat" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">{m.content}</div>
            {m.weather && <WeatherCard data={m.weather} />}
          </div>
        ))}
        {loading && (
          <div className="msg assistant">
            <div className="bubble typing"><i /><i /><i /></div>
          </div>
        )}
        {messages.length === 1 && (
          <div className="chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </section>

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: Ce temperatură e în Sibiu?"
          aria-label="Mesaj"
        />
        <button type="submit" disabled={loading || !input.trim()}>Trimite</button>
      </form>
    </main>
  );
}
