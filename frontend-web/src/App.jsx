import { useEffect, useRef, useState } from "react";
import "./App.css";

const WELCOME = {
  role: "assistant",
  isWelcome: true,
  content:
    "Salut! Întreabă-mă despre vremea din orice oraș din România sau alege direct o opțiune de mai jos:",
};

const MAIN_CITIES = [
  { name: "Brașov", region: "Centru" },
  { name: "București", region: "Sud" },
  { name: "Cluj-Napoca", region: "Nord-Vest" },
  { name: "Timișoara", region: "Vest" },
  { name: "Iași", region: "Nord-Est" },
  { name: "Constanța", region: "Litoral" },
  { name: "Sibiu", region: "Centru" },
  { name: "Oradea", region: "Nord-Vest" },
];

const QUICK_QUESTIONS = [
  { icon: "📅", label: "Prognoza pe 7 zile în Brașov", query: "Prognoza pe 7 zile în Brașov" },
  { icon: "🌅", label: "Cum va fi vremea mâine în București?", query: "Cum va fi vremea mâine în București?" },
  { icon: "🧥", label: "Cum să mă îmbrac azi în Cluj-Napoca?", query: "Cum să mă îmbrac azi în Cluj-Napoca?" },
  { icon: "🌧️", label: "Plouă săptămâna asta în Constanța?", query: "Prognoza pe 7 zile în Constanța" },
];

const dayName = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("ro-RO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const getWeatherEmoji = (desc = "") => {
  const d = desc.toLowerCase();
  if (d.includes("senin")) return "☀️";
  if (d.includes("parțial")) return "⛅";
  if (d.includes("noros")) return "☁️";
  if (d.includes("ploaie") || d.includes("averse") || d.includes("burniță")) return "🌧️";
  if (d.includes("ninsoare") || d.includes("zăpadă") || d.includes("fulgi")) return "❄️";
  if (d.includes("furtună") || d.includes("grindină")) return "⛈️";
  if (d.includes("ceață")) return "🌫️";
  return "🌡️";
};

const getAdvice = (current) => {
  const t = current.temperature;
  const d = (current.description || "").toLowerCase();
  const rain = d.includes("ploaie") || d.includes("averse") || (current.precipitation_mm ?? 0) > 0;

  let clothing = "Ținută lejeră, tricou";
  if (t <= 3) clothing = "Geacă groasă de iarnă, fular";
  else if (t <= 10) clothing = "Geacă de tranziție / palton";
  else if (t <= 18) clothing = "Hanorac sau jachetă subțire";

  let comfort = "Confortabil";
  if (current.feels_like < 0) comfort = "Ger / Frig pătrunzător";
  else if (current.feels_like < 8) comfort = "Răcoros";
  else if (current.feels_like > 28) comfort = "Caniculă / Disconfort";

  const umbrella = rain ? "Ia umbrela cu tine ☔" : "Nu ai nevoie de umbrelă";
  const windNote =
    current.wind_kmh > 30 ? "Vânt puternic, atenție afară" : "Vânt slab spre moderat";

  return { clothing, comfort, umbrella, windNote };
};

// Elimină lista brută cu liniuțe din text atunci când afișăm tabelul grafic
const getCleanReply = (content, hasMultiDayForecast) => {
  if (!hasMultiDayForecast) return content;
  return content.split("\nPrognoza:")[0].trim();
};

export default function App() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeWeather, setActiveWeather] = useState(null);
  const [unit, setUnit] = useState("C");
  const [recentCities, setRecentCities] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const formatTemp = (celsius) => {
    if (celsius === undefined || celsius === null) return "—";
    const val = unit === "C" ? celsius : (celsius * 9) / 5 + 32;
    return `${Math.round(val)}°${unit}`;
  };

  const resetChat = () => {
    setMessages([WELCOME]);
    setActiveWeather(null);
  };

  async function send(text) {
    const content = text.trim();
    if (!content || loading) return;

    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(1).map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok) throw new Error("server");
      const data = await res.json();

      setMessages([
        ...next,
        { role: "assistant", content: data.reply, weather: data.weather },
      ]);

      if (data.weather) {
        setActiveWeather(data.weather);
        setRecentCities((prev) => {
          const filtered = prev.filter((c) => c !== data.weather.city);
          return [data.weather.city, ...filtered].slice(0, 6);
        });
      }
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            "Nu mă pot conecta la server. Verifică dacă backend-ul rulează pe portul 8000.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const todayDate = new Date().toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const advice = activeWeather ? getAdvice(activeWeather.current) : null;

  return (
    <div className="portal-shell">
      {/* === TOP NAVBAR SIMPLIFICAT (FĂRĂ BARĂ DE CĂUTARE DUPLICATĂ) === */}
      <header className="top-navbar">
        <div className="nav-left">
          <div className="brand-badge">🌤️</div>
          <div>
            <h1 className="brand-title">Weather AI Romania</h1>
            <span className="brand-date">{todayDate}</span>
          </div>
        </div>

        <div className="nav-right">
          <div className="unit-pill">
            <button className={unit === "C" ? "active" : ""} onClick={() => setUnit("C")}>
              °C
            </button>
            <button className={unit === "F" ? "active" : ""} onClick={() => setUnit("F")}>
              °F
            </button>
          </div>
          <button className="nav-reset-btn" onClick={resetChat} title="Resetează conversația">
            🗑️ Chat nou
          </button>
          <div className="server-status">
            <span className="status-dot" />
            <span>Live API</span>
          </div>
        </div>
      </header>

      {/* === BODY PE 2 COLOANE === */}
      <div className="portal-body">
        {/* 1. CHAT AI (STÂNGA - EXTINS) */}
        <main className="chat-column">
          <div className="column-head">
            <h2>💬 Asistent Meteo AI</h2>
            <span>Răspunsuri în timp real & tabele de prognoză</span>
          </div>

          <section className="chat-feed" aria-live="polite">
            {messages.map((m, i) => {
              const hasMultiDay = m.weather?.forecast?.length > 1;
              return (
                <div key={i} className={`msg-row ${m.role}`}>
                  <div className="msg-avatar">{m.role === "assistant" ? "🤖" : "👤"}</div>
                  <div className="msg-card">
                    <div className="msg-text">
                      {getCleanReply(m.content, hasMultiDay)}
                    </div>

                    {/* MENIU INTERACTIV INTEGRAT ÎN MESAJUL DE BUN VENIT */}
                    {m.isWelcome && (
                      <div className="chat-hub">
                        <div className="hub-section">
                          <div className="hub-title">🗺️ Orașe Principale</div>
                          <ul className="hub-city-list">
                            {MAIN_CITIES.map((c) => (
                              <li key={c.name}>
                                <button
                                  className="hub-city-row"
                                  onClick={() => send(`Prognoza pe 7 zile în ${c.name}`)}
                                >
                                  <span className="city-name">📍 {c.name}</span>
                                  <span className="city-region">{c.region} →</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="hub-section">
                          <div className="hub-title">⚡ Întrebări Rapide</div>
                          <div className="hub-actions">
                            {QUICK_QUESTIONS.map((q) => (
                              <button
                                key={q.label}
                                className="hub-action-btn"
                                onClick={() => send(q.query)}
                              >
                                <span>{q.icon}</span>
                                <span>{q.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* RĂSPUNS EVIDENȚIAT ÎN TABEL DIRECT ÎN CHAT */}
                    {m.weather && (
                      <div className="highlighted-weather-box">
                        <div className="hw-header">
                          <div className="hw-title">
                            <span className="hw-emoji">
                              {getWeatherEmoji(m.weather.current.description)}
                            </span>
                            <div>
                              <strong>{m.weather.city}</strong>
                              <span className="hw-desc">
                                {m.weather.current.description}
                              </span>
                            </div>
                          </div>
                          <button
                            className="open-report-btn"
                            onClick={() => setActiveWeather(m.weather)}
                          >
                            📊 Raport complet →
                          </button>
                        </div>

                        {/* Sumar curent */}
                        <div className="hw-current-strip">
                          <div>
                            <span>Acum</span>
                            <strong className="hl-amber">
                              {formatTemp(m.weather.current.temperature)}
                            </strong>
                          </div>
                          <div>
                            <span>Resimțită</span>
                            <strong>{formatTemp(m.weather.current.feels_like)}</strong>
                          </div>
                          <div>
                            <span>Umiditate</span>
                            <strong>{m.weather.current.humidity}%</strong>
                          </div>
                          <div>
                            <span>Vânt</span>
                            <strong>{Math.round(m.weather.current.wind_kmh)} km/h</strong>
                          </div>
                        </div>

                        {/* Tabel extins pe 7 zile direct în chat */}
                        {hasMultiDay && (
                          <div className="hw-table-wrap">
                            <table className="hw-table">
                              <thead>
                                <tr>
                                  <th>Ziua</th>
                                  <th>Condiții</th>
                                  <th>Min</th>
                                  <th>Max</th>
                                  <th>Ploaie</th>
                                </tr>
                              </thead>
                              <tbody>
                                {m.weather.forecast.map((d) => (
                                  <tr key={d.date}>
                                    <td className="hw-day">{dayName(d.date)}</td>
                                    <td className="hw-cond">
                                      {getWeatherEmoji(d.description)} {d.description}
                                    </td>
                                    <td className="hw-min">{formatTemp(d.min)}</td>
                                    <td className="hw-max">{formatTemp(d.max)}</td>
                                    <td className="hw-rain">
                                      <span>{d.rain_chance ?? 0}%</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="msg-row assistant">
                <div className="msg-avatar">🤖</div>
                <div className="msg-card typing">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </section>

          {/* BARĂ CĂUTĂRI RECENTE (STILIZATĂ SEPARAT DEASUPRA INPUT-ULUI) */}
          {recentCities.length > 0 && (
            <div className="recent-strip">
              <span className="recent-label">🕒 Recente:</span>
              <div className="recent-tags">
                {recentCities.map((city) => (
                  <button
                    key={city}
                    className={`recent-tag ${activeWeather?.city === city ? "active" : ""}`}
                    onClick={() => send(`Prognoza pe 7 zile în ${city}`)}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            className="chat-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Scrie un oraș sau o întrebare (ex: Prognoza pe 7 zile în Hărman)..."
              autoFocus
            />
            <button type="submit" disabled={loading || !input.trim()}>
              Trimite 🚀
            </button>
          </form>
        </main>

        {/* 2. PANOU METEO DETALIAT (DREAPTA) */}
        <section className="report-column">
          {!activeWeather ? (
            <div className="empty-report">
              <div className="empty-graphic">🌍</div>
              <h3>Raport Meteo Detaliat</h3>
              <p>
                Alege un oraș din lista din chat sau scrie o întrebare pentru a
                vedea indicatorii compleți, recomandările și tabelul extins.
              </p>
            </div>
          ) : (
            <div className="report-scroll">
              <div className="hero-banner">
                <div className="hero-top">
                  <div>
                    <span className="region-pill">
                      {activeWeather.county
                        ? `Județul ${activeWeather.county.replace(/^Județul\s*/i, "")}`
                        : "România"}
                    </span>
                    <h2>{activeWeather.city}</h2>
                    <p className="hero-cond">{activeWeather.current.description}</p>
                  </div>
                </div>

                <div className="hero-main-temp">
                  <span className="big-emoji">
                    {getWeatherEmoji(activeWeather.current.description)}
                  </span>
                  <span className="big-temp">
                    {formatTemp(activeWeather.current.temperature)}
                  </span>
                  <div className="hero-minmax">
                    {activeWeather.forecast?.[0] && (
                      <>
                        <span>Max: {formatTemp(activeWeather.forecast[0].max)}</span>
                        <span>Min: {formatTemp(activeWeather.forecast[0].min)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="advice-grid">
                <div className="advice-item">
                  <span className="adv-label">🧥 Recomandare vestimentară</span>
                  <strong>{advice.clothing}</strong>
                </div>
                <div className="advice-item">
                  <span className="adv-label">🌡️ Confort termic</span>
                  <strong>{advice.comfort}</strong>
                </div>
                <div className="advice-item">
                  <span className="adv-label">☔ Precipitații</span>
                  <strong>{advice.umbrella}</strong>
                </div>
                <div className="advice-item">
                  <span className="adv-label">💨 Condiții vânt</span>
                  <strong>{advice.windNote}</strong>
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric-card">
                  <span>🌡️ Temp. Resimțită</span>
                  <strong>{formatTemp(activeWeather.current.feels_like)}</strong>
                </div>
                <div className="metric-card">
                  <span>💧 Umiditate</span>
                  <strong>{activeWeather.current.humidity}%</strong>
                  <div className="bar-track">
                    <div
                      className="bar-fill cyan"
                      style={{ width: `${activeWeather.current.humidity}%` }}
                    />
                  </div>
                </div>
                <div className="metric-card">
                  <span>💨 Viteză Vânt</span>
                  <strong>{Math.round(activeWeather.current.wind_kmh)} km/h</strong>
                </div>
                <div className="metric-card">
                  <span>🌧️ Precipitații</span>
                  <strong>{activeWeather.current.precipitation_mm ?? 0} mm</strong>
                </div>
              </div>

              <div className="forecast-box">
                <div className="forecast-head">
                  <div>
                    <h3>📅 Tabel Prognoză Detaliată</h3>
                    <span className="forecast-sub">
                      {activeWeather.forecast.length} zi(le) afișate
                    </span>
                  </div>
                  {activeWeather.forecast.length <= 1 && (
                    <button
                      className="extend-btn"
                      onClick={() => send(`Prognoza pe 7 zile în ${activeWeather.city}`)}
                    >
                      + Extinde la 7 zile
                    </button>
                  )}
                </div>

                <div className="table-wrapper">
                  <table className="full-forecast-table">
                    <thead>
                      <tr>
                        <th>Ziua</th>
                        <th>Condiții</th>
                        <th>Min</th>
                        <th>Max</th>
                        <th>Șanse ploaie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeWeather.forecast.map((d) => (
                        <tr key={d.date}>
                          <td className="col-day">{dayName(d.date)}</td>
                          <td className="col-cond">
                            <span>{getWeatherEmoji(d.description)}</span>
                            <span>{d.description}</span>
                          </td>
                          <td className="col-min">{formatTemp(d.min)}</td>
                          <td className="col-max">{formatTemp(d.max)}</td>
                          <td className="col-rain">
                            <div className="rain-wrap">
                              <span>{d.rain_chance ?? 0}%</span>
                              <div className="rain-bar">
                                <div
                                  className="rain-fill"
                                  style={{ width: `${d.rain_chance ?? 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}