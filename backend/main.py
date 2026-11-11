"""
Weather chatbot - backend (FastAPI)

Flux:
  UI (React) -> POST /api/chat -> Claude (tool use) -> get_weather() -> Open-Meteo API
Daca nu exista ANTHROPIC_API_KEY, se foloseste un parser simplu (fallback) care
extrage orasul din mesaj si raspunde direct, fara AI.

Open-Meteo este gratuit si nu cere cheie API.
"""
import json
import os
import re
import unicodedata

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5")
API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()

WEATHER_CODES = {
    0: "Cer senin", 1: "Predominant senin", 2: "Parțial noros", 3: "Noros",
    45: "Ceață", 48: "Ceață cu depunere de chiciură",
    51: "Burniță ușoară", 53: "Burniță", 55: "Burniță densă",
    56: "Burniță înghețată", 57: "Burniță înghețată densă",
    61: "Ploaie ușoară", 63: "Ploaie", 65: "Ploaie puternică",
    66: "Ploaie înghețată", 67: "Ploaie înghețată puternică",
    71: "Ninsoare ușoară", 73: "Ninsoare", 75: "Ninsoare abundentă",
    77: "Fulgi de zăpadă", 80: "Averse ușoare", 81: "Averse", 82: "Averse puternice",
    85: "Averse de ninsoare", 86: "Averse de ninsoare puternice",
    95: "Furtună", 96: "Furtună cu grindină", 99: "Furtună cu grindină puternică",
}

app = FastAPI(title="Weather Chatbot")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- weather ---
def get_weather(city: str, days: int = 1) -> dict:
    """Returneaza vremea pentru un oras din Romania (prognoza pe 1-7 zile)."""
    days = max(1, min(int(days or 1), 7))
    try:
        with httpx.Client(timeout=10) as http:
            geo = http.get(
                GEOCODE_URL,
                params={"name": city, "count": 1, "language": "ro", "countryCode": "RO"},
            ).json()
            results = geo.get("results") or []
            if not results:
                return {"error": f"Nu am găsit orașul „{city}” în România."}
            place = results[0]

            data = http.get(
                FORECAST_URL,
                params={
                    "latitude": place["latitude"],
                    "longitude": place["longitude"],
                    "current": "temperature_2m,apparent_temperature,relative_humidity_2m,"
                               "precipitation,weather_code,wind_speed_10m",
                    "daily": "weather_code,temperature_2m_max,temperature_2m_min,"
                             "precipitation_probability_max",
                    "timezone": "Europe/Bucharest",
                    "forecast_days": days,
                },
            ).json()
    except httpx.HTTPError:
        return {"error": "Serviciul meteo nu răspunde acum. Încearcă din nou."}

    cur, daily = data["current"], data["daily"]
    return {
        "city": place["name"],
        "county": place.get("admin1", ""),
        "current": {
            "temperature": cur["temperature_2m"],
            "feels_like": cur["apparent_temperature"],
            "humidity": cur["relative_humidity_2m"],
            "wind_kmh": cur["wind_speed_10m"],
            "precipitation_mm": cur["precipitation"],
            "description": WEATHER_CODES.get(cur["weather_code"], "—"),
        },
        "forecast": [
            {
                "date": daily["time"][i],
                "min": daily["temperature_2m_min"][i],
                "max": daily["temperature_2m_max"][i],
                "rain_chance": daily["precipitation_probability_max"][i],
                "description": WEATHER_CODES.get(daily["weather_code"][i], "—"),
            }
            for i in range(len(daily["time"]))
        ],
    }


# ------------------------------------------------------------- AI (Claude) ---
SYSTEM_PROMPT = (
    "Ești un asistent meteo prietenos care vorbește română. Ajuți utilizatorul să "
    "afle vremea în orice oraș din România. Folosește mereu unealta get_weather "
    "pentru date reale; nu inventa temperaturi. Dacă utilizatorul nu spune orașul, "
    "întreabă-l. Răspunde scurt, clar, cu temperaturile în °C. Dacă întrebarea nu "
    "are legătură cu vremea, spune politicos că te ocupi doar de vreme."
)

TOOLS = [
    {
        "name": "get_weather",
        "description": "Vremea curentă și prognoza pe 1-7 zile pentru un oraș din România.",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "Numele orașului, ex: Brașov"},
                "days": {
                    "type": "integer",
                    "description": "Câte zile de prognoză (1 = azi, 2 = azi+mâine, max 7)",
                },
            },
            "required": ["city"],
        },
    }
]


def chat_with_claude(messages: list[dict]) -> tuple[str, dict | None]:
    import anthropic

    client = anthropic.Anthropic(api_key=API_KEY)
    convo = list(messages)
    last_weather = None

    for _ in range(5):  # limita de siguranta pentru bucla de tool use
        resp = client.messages.create(
            model=MODEL,
            max_tokens=1000,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=convo,
        )
        if resp.stop_reason != "tool_use":
            text = "".join(b.text for b in resp.content if b.type == "text")
            return text.strip(), last_weather

        convo.append({"role": "assistant", "content": resp.content})
        results = []
        for block in resp.content:
            if block.type == "tool_use":
                out = get_weather(**block.input)
                if "error" not in out:
                    last_weather = out
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(out, ensure_ascii=False),
                })
        convo.append({"role": "user", "content": results})

    return "Nu am reușit să obțin răspunsul. Încearcă din nou.", last_weather


# ------------------------------------------------- Fallback (fara AI/cheie) ---
STOPWORDS = {
    "ce", "cum", "este", "e", "vremea", "vreme", "temperatura", "temperaturi",
    "in", "la", "din", "de", "pe", "azi", "astazi", "maine", "poimaine",
    "saptamana", "zile", "zilele", "urmatoare", "viitoare", "prognoza", "spune",
    "imi", "vreau", "sa", "stiu", "afara", "acum", "mi", "ma", "va", "fi", "sunt",
    "cat", "este", "oras", "orasul", "salut", "buna", "hei", "te", "rog", "si",
}


def strip_diacritics(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def find_city_and_days(text: str) -> tuple[dict | None, int]:
    norm = strip_diacritics(text.lower())
    days = 1
    if re.search(r"saptamana|7 zile|urmatoarele zile|prognoza", norm):
        days = 7
    elif re.search(r"\bmaine\b|\bpoimaine\b", norm):
        days = 3 if "poimaine" in norm else 2

    words = [w for w in re.findall(r"[a-z\-]+", norm) if w not in STOPWORDS and len(w) > 2]
    # incearca cuvinte singure, apoi perechi (ex: "Cluj Napoca", "Targu Mures")
    candidates = words + [f"{a} {b}" for a, b in zip(words, words[1:])]
    candidates.sort(key=lambda w: -len(w))
    for cand in candidates[:6]:
        out = get_weather(cand, days)
        if "error" not in out:
            return out, days
    return None, days


def format_reply(w: dict) -> str:
    c = w["current"]
    lines = [
        f"Acum în {w['city']}: {c['temperature']}°C ({c['description'].lower()}), "
        f"se simt {c['feels_like']}°C. Umiditate {c['humidity']}%, vânt {c['wind_kmh']} km/h."
    ]
    if len(w["forecast"]) > 1:
        lines.append("Prognoza:")
        for d in w["forecast"]:
            lines.append(
                f"• {d['date']}: {d['min']}° / {d['max']}°C, {d['description'].lower()}, "
                f"șanse de precipitații {d['rain_chance']}%"
            )
    return "\n".join(lines)


def chat_simple(messages: list[dict]) -> tuple[str, dict | None]:
    last = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    weather, _ = find_city_and_days(last if isinstance(last, str) else "")
    if weather:
        return format_reply(weather), weather
    return ("Nu am înțeles orașul. Scrie, de exemplu: „Ce temperatură e în Brașov?” "
            "sau „Prognoza pentru Cluj-Napoca”."), None


# -------------------------------------------------------------------- API ---
class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]


@app.get("/api/health")
def health():
    return {"status": "ok", "mode": "ai" if API_KEY else "simple"}


@app.post("/api/chat")
def chat(req: ChatRequest):
    messages = [m.model_dump() for m in req.messages][-20:]
    try:
        reply, weather = chat_with_claude(messages) if API_KEY else chat_simple(messages)
    except Exception as exc:  # nu lasam UI-ul fara raspuns
        print("Eroare chat:", exc)
        reply, weather = "A apărut o eroare pe server. Încearcă din nou.", None
    return {"reply": reply, "weather": weather}
