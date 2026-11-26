import Constants from "expo-constants";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const getApiUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:8000/api/chat`;
  }
  return "http://localhost:8000/api/chat";
};

const API_URL = getApiUrl();

interface ForecastDay {
  date: string;
  description: string;
  min: number;
  max: number;
  rain_chance?: number;
}

interface CurrentWeather {
  temperature: number;
  feels_like: number;
  humidity: number;
  wind_kmh: number;
  description: string;
  precipitation_mm?: number;
}

interface WeatherData {
  city: string;
  county?: string;
  current: CurrentWeather;
  forecast: ForecastDay[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  isWelcome?: boolean;
  weather?: WeatherData;
}

const WELCOME: Message = {
  role: "assistant",
  isWelcome: true,
  content:
    "Salut! Întreabă-mă despre vremea din orice oraș din România sau alege o opțiune de mai jos:",
};

const MAIN_CITIES = [
  { name: "Brașov", region: "Centru" },
  { name: "București", region: "Sud" },
  { name: "Cluj-Napoca", region: "Nord-Vest" },
  { name: "Timișoara", region: "Vest" },
  { name: "Iași", region: "Nord-Est" },
  { name: "Constanța", region: "Litoral" },
];

const QUICK_QUESTIONS = [
  { icon: "📅", label: "Prognoza pe 7 zile în Brașov", query: "Prognoza pe 7 zile în Brașov" },
  { icon: "🌅", label: "Cum va fi vremea mâine în București?", query: "Cum va fi vremea mâine în București?" },
  { icon: "🧥", label: "Cum să mă îmbrac azi în Cluj-Napoca?", query: "Cum să mă îmbrac azi în Cluj-Napoca?" },
];

const dayName = (iso: string) =>
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

const getAdvice = (current: CurrentWeather) => {
  const t = current.temperature;
  const d = (current.description || "").toLowerCase();
  const rain = d.includes("ploaie") || d.includes("averse") || (current.precipitation_mm ?? 0) > 0;

  let clothing = "Ținută lejeră, tricou";
  if (t <= 3) clothing = "Geacă groasă, fular";
  else if (t <= 10) clothing = "Geacă de tranziție / palton";
  else if (t <= 18) clothing = "Hanorac / jachetă subțire";

  let comfort = "Confortabil";
  if (current.feels_like < 0) comfort = "Ger / Frig pătrunzător";
  else if (current.feels_like < 8) comfort = "Răcoros";
  else if (current.feels_like > 28) comfort = "Caniculă / Disconfort";

  const umbrella = rain ? "Ia umbrela cu tine ☔" : "Nu ai nevoie de umbrelă";
  const windNote = current.wind_kmh > 30 ? "Vânt puternic" : "Vânt slab / moderat";

  return { clothing, comfort, umbrella, windNote };
};

const getCleanReply = (content: string, hasMultiDay: boolean) => {
  if (!hasMultiDay) return content;
  return content.split("\nPrognoza:")[0].trim();
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"chat" | "report">("chat");
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeWeather, setActiveWeather] = useState<WeatherData | null>(null);
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [recentCities, setRecentCities] = useState<string[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (activeTab === "chat") {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, loading, activeTab]);

  const formatTemp = (celsius?: number) => {
    if (celsius === undefined || celsius === null) return "—";
    const val = unit === "C" ? celsius : (celsius * 9) / 5 + 32;
    return `${Math.round(val)}°${unit}`;
  };

  const resetChat = () => {
    setMessages([WELCOME]);
    setActiveWeather(null);
    setActiveTab("chat");
  };

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setActiveTab("chat");

    try {
      const res = await fetch(API_URL, {
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
            "Nu mă pot conecta la server. Verifică dacă backend-ul rulează pe portul 8000 și ești pe același Wi-Fi.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const advice = activeWeather ? getAdvice(activeWeather.current) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0e1320" />

      {/* === HEADER === */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Text style={{ fontSize: 18 }}>🌤️</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>Weather AI</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Live API</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <View style={styles.unitPill}>
            <TouchableOpacity
              style={[styles.unitBtn, unit === "C" && styles.unitBtnActive]}
              onPress={() => setUnit("C")}
            >
              <Text style={[styles.unitText, unit === "C" && styles.unitTextActive]}>°C</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitBtn, unit === "F" && styles.unitBtnActive]}
              onPress={() => setUnit("F")}
            >
              <Text style={[styles.unitText, unit === "F" && styles.unitTextActive]}>°F</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.resetBtn} onPress={resetChat}>
            <Text style={styles.resetBtnText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* === SEGMENTED TAB BAR (CHAT / RAPORT METEO) === */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "chat" && styles.tabBtnActive]}
          onPress={() => setActiveTab("chat")}
        >
          <Text style={[styles.tabText, activeTab === "chat" && styles.tabTextActive]}>
            💬 Asistent AI
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "report" && styles.tabBtnActive]}
          onPress={() => setActiveTab("report")}
        >
          <Text style={[styles.tabText, activeTab === "report" && styles.tabTextActive]}>
            📊 Raport {activeWeather ? `(${activeWeather.city})` : "Meteo"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* === TAB 1: CHAT AI === */}
      {activeTab === "chat" ? (
        <KeyboardAvoidingView
          style={styles.flex1}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.chatFeed}
            contentContainerStyle={styles.chatFeedContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((m, i) => {
              const hasMultiDay = (m.weather?.forecast?.length ?? 0) > 1;
              const isUser = m.role === "user";

              return (
                <View
                  key={i}
                  style={[styles.msgWrapper, isUser ? styles.msgUserWrap : styles.msgBotWrap]}
                >
                  <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
                    <Text style={[styles.msgText, isUser && styles.msgTextUser]}>
                      {getCleanReply(m.content, hasMultiDay)}
                    </Text>

                    {/* HUB INTERACTIV ÎN PRIMUL MESAJ */}
                    {m.isWelcome && (
                      <View style={styles.hubContainer}>
                        <Text style={styles.hubTitle}>🗺️ ORAȘE PRINCIPALE</Text>
                        <View style={styles.cityGrid}>
                          {MAIN_CITIES.map((c) => (
                            <TouchableOpacity
                              key={c.name}
                              style={styles.cityCard}
                              onPress={() => send(`Prognoza pe 7 zile în ${c.name}`)}
                            >
                              <Text style={styles.cityCardName} numberOfLines={1}>
                                📍 {c.name}
                              </Text>
                              <Text style={styles.cityCardRegion}>{c.region}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <Text style={[styles.hubTitle, { marginTop: 14 }]}>⚡ ÎNTREBĂRI RAPIDE</Text>
                        <View style={styles.quickList}>
                          {QUICK_QUESTIONS.map((q) => (
                            <TouchableOpacity
                              key={q.label}
                              style={styles.quickBtn}
                              onPress={() => send(q.query)}
                            >
                              <Text style={styles.quickBtnText}>
                                {q.icon} {q.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* CARD + TABEL EVIDENȚIAT DIRECT ÎN CHAT */}
                    {m.weather && (
                      <View style={styles.inlineCard}>
                        <View style={styles.inlineHead}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.inlineCity}>
                              {getWeatherEmoji(m.weather.current.description)} {m.weather.city}
                            </Text>
                            <Text style={styles.inlineDesc}>{m.weather.current.description}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.reportLinkBtn}
                            onPress={() => {
                              setActiveWeather(m.weather!);
                              setActiveTab("report");
                            }}
                          >
                            <Text style={styles.reportLinkText}>Raport →</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.inlineStrip}>
                          <View style={styles.stripItem}>
                            <Text style={styles.stripLabel}>Acum</Text>
                            <Text style={[styles.stripVal, { color: "#f59e0b" }]}>
                              {formatTemp(m.weather.current.temperature)}
                            </Text>
                          </View>
                          <View style={styles.stripItem}>
                            <Text style={styles.stripLabel}>Resimțită</Text>
                            <Text style={styles.stripVal}>
                              {formatTemp(m.weather.current.feels_like)}
                            </Text>
                          </View>
                          <View style={styles.stripItem}>
                            <Text style={styles.stripLabel}>Umid.</Text>
                            <Text style={styles.stripVal}>{m.weather.current.humidity}%</Text>
                          </View>
                          <View style={styles.stripItem}>
                            <Text style={styles.stripLabel}>Vânt</Text>
                            <Text style={styles.stripVal}>
                              {Math.round(m.weather.current.wind_kmh)} km/h
                            </Text>
                          </View>
                        </View>

                        {hasMultiDay && (
                          <View style={styles.miniTable}>
                            <View style={styles.miniTableHead}>
                              <Text style={[styles.th, { flex: 1.4 }]}>Ziua</Text>
                              <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>
                                Min / Max
                              </Text>
                              <Text style={[styles.th, { flex: 0.7, textAlign: "right" }]}>
                                Ploaie
                              </Text>
                            </View>
                            {m.weather.forecast.map((d) => (
                              <View key={d.date} style={styles.miniTableRow}>
                                <Text style={[styles.tdDay, { flex: 1.4 }]} numberOfLines={1}>
                                  {getWeatherEmoji(d.description)} {dayName(d.date)}
                                </Text>
                                <Text style={[styles.tdTemp, { flex: 1, textAlign: "center" }]}>
                                  <Text style={{ color: "#94a3b8" }}>{formatTemp(d.min)}</Text> /{" "}
                                  <Text style={{ color: "#f59e0b" }}>{formatTemp(d.max)}</Text>
                                </Text>
                                <Text style={[styles.tdRain, { flex: 0.7, textAlign: "right" }]}>
                                  {d.rain_chance ?? 0}%
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {loading && (
              <View style={[styles.msgWrapper, styles.msgBotWrap]}>
                <View style={[styles.bubble, styles.bubbleBot, { paddingVertical: 12 }]}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                </View>
              </View>
            )}
          </ScrollView>

          {/* BARĂ CĂUTĂRI RECENTE */}
          {recentCities.length > 0 && (
            <View style={styles.recentBar}>
              <Text style={styles.recentLabel}>🕒 Recente:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {recentCities.map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={[
                      styles.recentChip,
                      activeWeather?.city === city && styles.recentChipActive,
                    ]}
                    onPress={() => send(`Prognoza pe 7 zile în ${city}`)}
                  >
                    <Text
                      style={[
                        styles.recentChipText,
                        activeWeather?.city === city && { color: "#0ea5e9" },
                      ]}
                    >
                      {city}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* INPUT BAR */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Scrie un oraș (ex: Brașov, Hărman)..."
              placeholderTextColor="#64748b"
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={() => send(input)}
              disabled={!input.trim() || loading}
            >
              <Text style={styles.sendBtnText}>🚀</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        /* === TAB 2: RAPORT METEO DETALIAT === */
        <ScrollView style={styles.reportScroll} contentContainerStyle={styles.reportContent}>
          {!activeWeather ? (
            <View style={styles.emptyReport}>
              <Text style={{ fontSize: 52, marginBottom: 12 }}>🌍</Text>
              <Text style={styles.emptyTitle}>Nicio locație selectată</Text>
              <Text style={styles.emptySub}>
                Caută un oraș în tab-ul Asistent AI pentru a vedea raportul complet și tabelul pe 7
                zile.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.heroCard}>
                <Text style={styles.regionPill}>
                  {activeWeather.county
                    ? `JUDEȚUL ${activeWeather.county.replace(/^Județul\s*/i, "").toUpperCase()}`
                    : "ROMÂNIA"}
                </Text>
                <Text style={styles.heroCity}>{activeWeather.city}</Text>
                <Text style={styles.heroDesc}>{activeWeather.current.description}</Text>

                <View style={styles.heroTempRow}>
                  <Text style={styles.heroEmoji}>
                    {getWeatherEmoji(activeWeather.current.description)}
                  </Text>
                  <Text style={styles.heroTemp}>
                    {formatTemp(activeWeather.current.temperature)}
                  </Text>
                  {activeWeather.forecast?.[0] && (
                    <View style={styles.heroMinMax}>
                      <Text style={styles.minMaxText}>
                        Max: {formatTemp(activeWeather.forecast[0].max)}
                      </Text>
                      <Text style={styles.minMaxText}>
                        Min: {formatTemp(activeWeather.forecast[0].min)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {advice && (
                <View style={styles.grid2}>
                  <View style={styles.gridBox}>
                    <Text style={styles.gridLabel}>🧥 Vestimentație</Text>
                    <Text style={styles.gridValSm}>{advice.clothing}</Text>
                  </View>
                  <View style={styles.gridBox}>
                    <Text style={styles.gridLabel}>🌡️ Confort termic</Text>
                    <Text style={styles.gridValSm}>{advice.comfort}</Text>
                  </View>
                  <View style={styles.gridBox}>
                    <Text style={styles.gridLabel}>☔ Precipitații</Text>
                    <Text style={styles.gridValSm}>{advice.umbrella}</Text>
                  </View>
                  <View style={styles.gridBox}>
                    <Text style={styles.gridLabel}>💨 Vânt</Text>
                    <Text style={styles.gridValSm}>{advice.windNote}</Text>
                  </View>
                </View>
              )}

              <View style={styles.grid2}>
                <View style={styles.gridBox}>
                  <Text style={styles.gridLabel}>🌡️ Resimțită</Text>
                  <Text style={styles.gridValLg}>
                    {formatTemp(activeWeather.current.feels_like)}
                  </Text>
                </View>
                <View style={styles.gridBox}>
                  <Text style={styles.gridLabel}>💧 Umiditate</Text>
                  <Text style={styles.gridValLg}>{activeWeather.current.humidity}%</Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, { width: `${activeWeather.current.humidity}%` }]}
                    />
                  </View>
                </View>
                <View style={styles.gridBox}>
                  <Text style={styles.gridLabel}>💨 Viteză vânt</Text>
                  <Text style={styles.gridValLg}>
                    {Math.round(activeWeather.current.wind_kmh)} km/h
                  </Text>
                </View>
                <View style={styles.gridBox}>
                  <Text style={styles.gridLabel}>🌧️ Precipitații</Text>
                  <Text style={styles.gridValLg}>
                    {activeWeather.current.precipitation_mm ?? 0} mm
                  </Text>
                </View>
              </View>

              <View style={styles.forecastCard}>
                <View style={styles.forecastHead}>
                  <Text style={styles.forecastTitle}>📅 Prognoză Detaliată</Text>
                  {activeWeather.forecast.length <= 1 && (
                    <TouchableOpacity
                      style={styles.extendBtn}
                      onPress={() => send(`Prognoza pe 7 zile în ${activeWeather.city}`)}
                    >
                      <Text style={styles.extendBtnText}>+ 7 zile</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {activeWeather.forecast.map((d) => (
                  <View key={d.date} style={styles.forecastRow}>
                    <View style={{ flex: 1.4 }}>
                      <Text style={styles.fDay}>{dayName(d.date)}</Text>
                      <Text style={styles.fDesc} numberOfLines={1}>
                        {getWeatherEmoji(d.description)} {d.description}
                      </Text>
                    </View>
                    <Text style={styles.fTemp}>
                      <Text style={{ color: "#94a3b8" }}>{formatTemp(d.min)}</Text> /{" "}
                      <Text style={{ color: "#f8fafc" }}>{formatTemp(d.max)}</Text>
                    </Text>
                    <Text style={styles.fRain}>💧 {d.rain_chance ?? 0}%</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0e1320", // Se unește seamless cu header-ul sus și input bar-ul jos pe iOS & Android
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  flex1: { flex: 1, backgroundColor: "#070a12" },

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#0e1320",
    borderBottomWidth: 1,
    borderBottomColor: "#232d45",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: { color: "#f8fafc", fontSize: 17, fontWeight: "800" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#10b981" },
  statusText: { color: "#94a3b8", fontSize: 11 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  unitPill: {
    flexDirection: "row",
    backgroundColor: "#070a12",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#232d45",
    padding: 2,
  },
  unitBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  unitBtnActive: { backgroundColor: "#f59e0b" },
  unitText: { color: "#94a3b8", fontSize: 12, fontWeight: "700" },
  unitTextActive: { color: "#000" },
  resetBtn: {
    backgroundColor: "#151c2e",
    borderWidth: 1,
    borderColor: "#232d45",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resetBtnText: { fontSize: 14 },

  /* Segmented Tab Bar */
  tabBar: {
    flexDirection: "row",
    padding: 8,
    gap: 8,
    backgroundColor: "#0e1320",
    borderBottomWidth: 1,
    borderBottomColor: "#232d45",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#070a12",
    borderWidth: 1,
    borderColor: "#232d45",
  },
  tabBtnActive: { backgroundColor: "#1c253d", borderColor: "#3b82f6" },
  tabText: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#f8fafc", fontWeight: "700" },

  /* Chat */
  chatFeed: { flex: 1, backgroundColor: "#070a12" },
  chatFeedContent: { padding: 14, gap: 14 },
  msgWrapper: { width: "100%" },
  msgUserWrap: { alignItems: "flex-end" },
  msgBotWrap: { alignItems: "flex-start" },
  bubble: { maxWidth: "96%", padding: 14, borderRadius: 16 },
  bubbleBot: {
    backgroundColor: "#151c2e",
    borderWidth: 1,
    borderColor: "#232d45",
    borderTopLeftRadius: 4,
    width: "100%",
  },
  bubbleUser: { backgroundColor: "#3b82f6", borderTopRightRadius: 4 },
  msgText: { color: "#f8fafc", fontSize: 14.5, lineHeight: 21 },
  msgTextUser: { color: "#ffffff", fontWeight: "500" },

  /* Hub integrat */
  hubContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#232d45",
  },
  hubTitle: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  cityGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 },
  cityCard: {
    width: "48.5%",
    backgroundColor: "#070a12",
    borderWidth: 1,
    borderColor: "#232d45",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
    flexDirection: "column",
    gap: 2,
  },
  cityCardName: { color: "#f8fafc", fontSize: 13.5, fontWeight: "600" },
  cityCardRegion: { color: "#64748b", fontSize: 11, marginLeft: 18 },
  quickList: { gap: 7 },
  quickBtn: {
    backgroundColor: "#070a12",
    borderWidth: 1,
    borderColor: "#232d45",
    borderRadius: 10,
    padding: 10,
  },
  quickBtnText: { color: "#e2e8f0", fontSize: 13 },

  /* Inline Weather Card */
  inlineCard: {
    marginTop: 12,
    backgroundColor: "#090d17",
    borderWidth: 1,
    borderColor: "#3b82f6",
    borderRadius: 12,
    overflow: "hidden",
  },
  inlineHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "rgba(59, 130, 246, 0.14)",
    borderBottomWidth: 1,
    borderBottomColor: "#232d45",
  },
  inlineCity: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
  inlineDesc: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  reportLinkBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reportLinkText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  inlineStrip: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#232d45",
  },
  stripItem: { alignItems: "center" },
  stripLabel: { color: "#94a3b8", fontSize: 11 },
  stripVal: { color: "#f8fafc", fontSize: 14, fontWeight: "700", marginTop: 2 },
  miniTable: { padding: 10 },
  miniTableHead: {
    flexDirection: "row",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#232d45",
  },
  th: { color: "#94a3b8", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  miniTableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(35, 45, 69, 0.5)",
  },
  tdDay: { color: "#f8fafc", fontSize: 12.5, fontWeight: "600", textTransform: "capitalize" },
  tdTemp: { fontSize: 12.5, fontWeight: "700" },
  tdRain: { color: "#0ea5e9", fontSize: 12.5, fontWeight: "700" },

  /* Recent Bar */
  recentBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#0e1320",
    borderTopWidth: 1,
    borderTopColor: "#232d45",
    gap: 8,
  },
  recentLabel: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
  recentChip: {
    backgroundColor: "#070a12",
    borderWidth: 1,
    borderColor: "#232d45",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginRight: 8,
  },
  recentChipActive: { borderColor: "#0ea5e9", backgroundColor: "rgba(14, 165, 233, 0.12)" },
  recentChipText: { color: "#f8fafc", fontSize: 12.5 },

  /* Input Bar */
  inputBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: "#0e1320",
    borderTopWidth: 1,
    borderTopColor: "#232d45",
  },
  input: {
    flex: 1,
    backgroundColor: "#070a12",
    borderWidth: 1,
    borderColor: "#232d45",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#f8fafc",
    fontSize: 14.5,
  },
  sendBtn: {
    backgroundColor: "#f59e0b",
    width: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#151c2e" },
  sendBtnText: { fontSize: 18 },

  /* Report Tab */
  reportScroll: { flex: 1, backgroundColor: "#070a12" },
  reportContent: { padding: 16, gap: 14 },
  emptyReport: { alignItems: "center", marginTop: 80, paddingHorizontal: 24 },
  emptyTitle: { color: "#f8fafc", fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySub: { color: "#94a3b8", fontSize: 14, textAlign: "center", lineHeight: 20 },
  heroCard: {
    backgroundColor: "#151c2e",
    borderWidth: 1,
    borderColor: "#232d45",
    borderRadius: 18,
    padding: 18,
  },
  regionPill: { color: "#0ea5e9", fontSize: 11, fontWeight: "700", letterSpacing: 0.7 },
  heroCity: { color: "#f8fafc", fontSize: 28, fontWeight: "800", marginTop: 2 },
  heroDesc: { color: "#94a3b8", fontSize: 14, marginTop: 2 },
  heroTempRow: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 12 },
  heroEmoji: { fontSize: 48 },
  heroTemp: { color: "#f59e0b", fontSize: 48, fontWeight: "800" },
  heroMinMax: { marginLeft: "auto", alignItems: "flex-end", gap: 4 },
  minMaxText: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },

  grid2: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  gridBox: {
    width: "48.5%",
    backgroundColor: "#151c2e",
    borderWidth: 1,
    borderColor: "#232d45",
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  gridLabel: { color: "#94a3b8", fontSize: 12 },
  gridValSm: { color: "#f8fafc", fontSize: 13.5, fontWeight: "700" },
  gridValLg: { color: "#f8fafc", fontSize: 20, fontWeight: "800" },
  progressTrack: {
    height: 5,
    backgroundColor: "#070a12",
    borderRadius: 4,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#0ea5e9" },

  forecastCard: {
    backgroundColor: "#151c2e",
    borderWidth: 1,
    borderColor: "#232d45",
    borderRadius: 16,
    padding: 16,
  },
  forecastHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  forecastTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "700" },
  extendBtn: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderWidth: 1,
    borderColor: "#3b82f6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  extendBtnText: { color: "#93c5fd", fontSize: 12, fontWeight: "700" },
  forecastRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(35, 45, 69, 0.7)",
  },
  fDay: { color: "#f8fafc", fontSize: 13.5, fontWeight: "700", textTransform: "capitalize" },
  fDesc: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  fTemp: { flex: 1, textAlign: "center", fontSize: 13.5, fontWeight: "700" },
  fRain: { width: 58, textAlign: "right", color: "#0ea5e9", fontSize: 13, fontWeight: "700" },
});