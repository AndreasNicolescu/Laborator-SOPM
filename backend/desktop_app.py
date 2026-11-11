import customtkinter as ctk

# Setări generale pentru un aspect minimalist și curat
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

app = ctk.CTk()
app.geometry("520x650")
app.title("Weather Chatbot")
app.configure(fg_color="#1a1a1c") # Fundal principal neutru

# --- HEADER (Antet) ---
header_frame = ctk.CTkFrame(app, fg_color="transparent")
header_frame.pack(pady=(25, 10), fill="x", padx=20)

title_label = ctk.CTkLabel(header_frame, text="Weather Chatbot", 
                           font=("Segoe UI", 26, "bold"), text_color="#5a67d8")
title_label.pack()

subtitle_label = ctk.CTkLabel(header_frame, text="Asistent meteo inteligent", 
                              font=("Segoe UI", 14), text_color="#a0aec0")
subtitle_label.pack()

# --- ZONA DE CHAT ---
# Design plat (fără margini desenate), doar o nuanță diferită de fundal
chat_frame = ctk.CTkFrame(app, corner_radius=8, fg_color="#2d3748", border_width=0)
chat_frame.pack(pady=15, padx=20, fill="both", expand=True)

chat_box = ctk.CTkTextbox(chat_frame, font=("Segoe UI", 15), fg_color="transparent", 
                          text_color="#f7fafc", wrap="word", spacing3=12)
chat_box.pack(pady=15, padx=15, fill="both", expand=True)

# Mesajul de întâmpinare
chat_box.insert("0.0", "Bot: Salut! Scrie un oraș din România pentru a afla vremea.\n")
chat_box.configure(state="disabled") # Blocăm editarea manuală

# --- ZONA DE INPUT ---
input_frame = ctk.CTkFrame(app, fg_color="transparent")
input_frame.pack(pady=(5, 25), fill="x", padx=20)

# Căsuța de text mai curată
entry = ctk.CTkEntry(input_frame, placeholder_text="Scrie un mesaj...", 
                     height=45, corner_radius=8, font=("Segoe UI", 15), 
                     fg_color="#2d3748", border_width=0, text_color="#f7fafc")
entry.pack(side="left", fill="x", expand=True, padx=(0, 15))

# Funcția de trimitere
def trimite_mesaj(event=None):
    mesaj = entry.get()
    if mesaj.strip():
        chat_box.configure(state="normal")
        
        # Text simplu, fără iconițe
        chat_box.insert("end", f"Tu: {mesaj}\n")
        chat_box.insert("end", "Bot: [Aici va veni conexiunea cu FastAPI...]\n")
        
        chat_box.configure(state="disabled")
        chat_box.see("end") # Scroll automat
        entry.delete(0, 'end') # Golește inputul

# Butonul de trimitere simplificat
btn = ctk.CTkButton(input_frame, text="Trimite", width=100, height=45, 
                    corner_radius=8, font=("Segoe UI", 15, "bold"), 
                    fg_color="#5a67d8", hover_color="#434ce6", command=trimite_mesaj)
btn.pack(side="right")

# Permite trimiterea cu tasta Enter
app.bind('<Return>', trimite_mesaj)

app.mainloop()