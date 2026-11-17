import { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  FlatList, KeyboardAvoidingView, Platform, StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 

export default function App() {
  const [mesaj, setMesaj] = useState('');
  const [istoric, setIstoric] = useState([
    { id: '1', text: 'Salut! Sunt asistentul tău meteo. Te pot ajuta cu prognoza pentru orice oraș.', sender: 'bot' }
  ]);

const trimiteMesaj = async () => {
    if (mesaj.trim() === '') return;
    
    const textUtilizator = mesaj;
    
    // 1. Salvăm noul istoric incluzând mesajul curent
    const istoricNou = [...istoric, { id: Date.now().toString(), text: textUtilizator, sender: 'user' }];
    setIstoric(istoricNou);
    setMesaj('');

    try {
      // 2. Transformăm istoricul pentru a corespunde perfect cu Pydantic-ul din Python
      const formatarePentruPython = istoricNou.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      const raspuns = await fetch(`http://192.168.1.11:8000/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: formatarePentruPython })
      });

      const data = await raspuns.json();
      
      // 3. Aici citim cheia "reply" (pe baza `return {"reply": reply, "weather": weather}`)
      setIstoric(prev => [...prev, { 
        id: Date.now().toString(), 
        text: data.reply || "Nu am primit un răspuns text din backend.", 
        sender: 'bot' 
      }]);
      
    } catch (error) {
      console.error("Eroare de rețea:", error);
      setIstoric(prev => [...prev, { 
        id: Date.now().toString(), 
        text: "Eroare de conexiune. Verifică IP-ul și dacă backend-ul rulează.", 
        sender: 'bot' 
      }]);
    }
  };

  const renderMesaj = ({ item }) => (
    <View style={[
      styles.bulaMesaj, 
      item.sender === 'user' ? styles.mesajUser : styles.mesajBot
    ]}>
      <Text style={item.sender === 'user' ? styles.textMesajUser : styles.textMesajBot}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#121214" />
      
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header Curățat și Diferențiat prin Culoare */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Weather AI</Text>
            <View style={styles.statusDot} />
          </View>
        </View>

        <FlatList
          data={istoric}
          renderItem={renderMesaj}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
        />

        {/* Zona Inferioară Simplificată */}
        <View style={styles.footerContainer}>
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputField}
                placeholder="Scrie un oraș..."
                placeholderTextColor="#71717A"
                value={mesaj}
                onChangeText={setMesaj}
              />
              <TouchableOpacity 
                style={[styles.butonTrimite, mesaj.trim() ? styles.butonActiv : styles.butonInactiv]} 
                onPress={trimiteMesaj}
                activeOpacity={0.8}
              >
                <Text style={styles.textButon}>Trimite</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121214', // Culoarea zonei de sus (creează contrast)
  },
  container: {
    flex: 1,
    backgroundColor: '#000000', // Fundalul listei de mesaje pe negru pur
  },
  // --- HEADER ---
  header: {
    alignItems: 'center',
    paddingVertical: 18,
    backgroundColor: '#121214', // Diferit de restul ecranului
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FAFAFA',
    fontSize: 20, // Font mărit
    fontWeight: '700',
    letterSpacing: 0.5,
    marginRight: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981', 
  },
  // --- CHAT ---
  chatList: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  bulaMesaj: {
    maxWidth: '82%',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginBottom: 18,
  },
  mesajBot: {
    backgroundColor: '#1E1E24', // Gri subtil modificat față de cel vechi
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2A2A35', 
  },
  mesajUser: {
    backgroundColor: '#2563EB', // Royal Blue (ușor schimbat față de Sky Blue)
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  textMesajBot: {
    color: '#F4F4F5',
    fontSize: 16, // Font mărit
    lineHeight: 24,
  },
  textMesajUser: {
    color: '#FFFFFF',
    fontSize: 16, // Font mărit
    lineHeight: 24,
    fontWeight: '500',
  },
  // --- FOOTER & INPUT ---
  footerContainer: {
    backgroundColor: '#000000', // La fel cu fundalul chatului
    borderTopWidth: 1,
    borderTopColor: '#1E1E24',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 10 : 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E24',
    borderRadius: 26,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2A2A35',
  },
  inputField: {
    flex: 1,
    minHeight: 46, // Mărit pentru text mai mare
    color: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 16, // Font mărit
  },
  butonTrimite: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  butonActiv: {
    backgroundColor: '#F59E0B',
  },
  butonInactiv: {
    backgroundColor: '#27272A',
  },
  textButon: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15, // Font mărit
    letterSpacing: 0.5,
  },
});