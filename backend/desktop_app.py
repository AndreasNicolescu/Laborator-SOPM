import customtkinter as ctk
import requests
import threading

# Setări generale UI
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

app = ctk.CTk()
app.geometry("520x700")
app.title("Weather Chatbot")
app.configure(fg_color="#18181b")

# --- HEADER ---
header_frame = ctk.CTkFrame(app, fg_color="transparent")
header_frame.pack(pady=(20, 5), fill="x", padx=20)

title_label = ctk.CTkLabel(header_frame, text="Weather Chatbot", font=("Segoe UI", 22, "bold"), text_color="#646cff")
title_label.pack()

# --- ZONA DE CHAT (Acum folosim ScrollableFrame pentru Bule de Chat) ---
chat_container = ctk.CTkScrollableFrame(app, fg_color="transparent", border_width=0)
chat_container.pack(pady=10, padx=20, fill="both", expand=True)

# --- ZONA DE INPUT ---
input_frame = ctk.CTkFrame(app, fg_color="transparent")
input_frame.pack(pady=(5, 20), fill="x", padx=20)

entry = ctk.CTkEntry(input_frame, placeholder_text="Scrie un mesaj...", height=45, corner_radius=22, font=("Segoe UI", 14), fg_color="#27272a", border_width=1, border_color="#3f3f46", text_color="#f7fafc")
entry.pack(side="left", fill="x", expand=True, padx=(0, 15))

# --- LOGICA DE BACKEND ---
istoric_mesaje = [{"role": "assistant", "content": "Salut! Scrie un oraș din România pentru a afla vremea."}]

def adauga_bula_chat(text, este_utilizator=False):
    # Setăm alinierea și culorile în funcție de cine trimite mesajul
    ancora = "e" if este_utilizator else "w"
    culoare_fundal = "#646cff" if este_utilizator else "#27272a"
    culoare_text = "#ffffff" if este_utilizator else "#e4e4e7"
    
    # Bula în sine
    bula = ctk.CTkFrame(chat_container, fg_color=culoare_fundal, corner_radius=18)
    bula.pack(pady=8, padx=5, anchor=ancora)
    
    # Textul din interiorul bulei (wraplength previne ieșirea textului din ecran)
    lbl = ctk.CTkLabel(bula, text=text, font=("Segoe UI", 14), text_color=culoare_text, wraplength=320, justify="left")
    lbl.pack(pady=10, padx=15)
    
    # Forțăm scroll-ul la ultimul mesaj
    chat_container.update_idletasks()
    chat_container._parent_canvas.yview_moveto(1.0)

# Afișăm mesajul de întâmpinare
adauga_bula_chat("Salut! Scrie un oraș din România pentru a afla vremea.", este_utilizator=False)

def finalizare_cerere(raspuns_text):
    adauga_bula_chat(raspuns_text, este_utilizator=False)
    btn.configure(state="normal", text="Trimite")
    entry.configure(state="normal")

def proceseaza_cererea():
    try:
        raspuns = requests.post("http://localhost:8000/api/chat", json={"messages": istoric_mesaje})
        date = raspuns.json()
        text_bot = date.get("reply", "Eroare: Nu am primit răspuns.")
        istoric_mesaje.append({"role": "assistant", "content": text_bot})
        app.after(0, finalizare_cerere, text_bot)
    except Exception:
        app.after(0, finalizare_cerere, "[Eroare] Verifică dacă serverul FastAPI (uvicorn) este pornit pe portul 8000.")

def trimite_mesaj(event=None):
    mesaj = entry.get()
    if mesaj.strip():
        adauga_bula_chat(mesaj, este_utilizator=True)
        istoric_mesaje.append({"role": "user", "content": mesaj})
        entry.delete(0, 'end')
        
        entry.configure(state="disabled")
        btn.configure(state="disabled", text="...")
        
        thread = threading.Thread(target=proceseaza_cererea)
        thread.start()

btn = ctk.CTkButton(input_frame, text="Trimite", width=90, height=45, corner_radius=22, font=("Segoe UI", 14, "bold"), fg_color="#646cff", hover_color="#535bf2", command=trimite_mesaj)
btn.pack(side="right")

app.bind('<Return>', trimite_mesaj)
app.mainloop()