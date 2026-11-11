# Weather Chatbot România

Chatbot care răspunde la întrebări despre vreme pentru orice oraș din România.

- **Frontend:** React (Vite)
- **Backend:** Python (FastAPI)
- **Date meteo:** [Open-Meteo](https://open-meteo.com) (gratuit, fără cheie API)
- **AI (opțional):** Claude, prin Anthropic API (tool use)

## Cum funcționează

```
React UI  →  POST /api/chat  →  FastAPI  →  Claude (decide când are nevoie de vreme)
                                              ↓ get_weather(city, days)
                                          Open-Meteo (geocoding + prognoză)
```

Dacă nu setezi `ANTHROPIC_API_KEY`, backend-ul rulează în **mod simplu**: extrage orașul
din mesaj și răspunde direct cu datele meteo, fără AI. Totul funcționează oricum.

## Pornire

Ai nevoie de Python 3.10+ și Node.js 18+.

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # opțional: adaugă ANTHROPIC_API_KEY în .env
uvicorn main:app --reload --port 8000
```

### 2. Frontend (alt terminal)

```bash
cd frontend
npm install
npm run dev
```

Deschide http://localhost:5173

## Exemple de întrebări

- Ce temperatură e în Brașov?
- Cum va fi vremea mâine în București?
- Prognoza pe săptămână pentru Cluj-Napoca
- Plouă azi la Timișoara?  (cu AI activ)

## Structură

```
weather-chatbot/
├── backend/
│   ├── main.py             # API, integrare Open-Meteo, logică chatbot
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js      # proxy /api -> localhost:8000
    └── src/
        ├── main.jsx
        ├── App.jsx         # chat UI + card meteo
        └── App.css
```
