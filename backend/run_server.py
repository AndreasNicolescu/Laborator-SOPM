import uvicorn
from main import app # Importăm direct aplicația FastAPI

if __name__ == "__main__":
    # Rulăm serverul direct pe obiectul app, esențial pentru executabil
    uvicorn.run(app, host="127.0.0.1", port=8000)