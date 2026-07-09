import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Sun, 
  Waves, 
  Landmark, 
  Trees, 
  Camera, 
  Film, 
  Compass, 
  MessageCircle, 
  Send, 
  Clock, 
  Navigation, 
  RefreshCw, 
  User, 
  Plus, 
  Trash2, 
  MapPin, 
  Sparkles, 
  Image as ImageIcon,
  CheckCircle,
  X,
  PlusCircle,
  Video,
  Heart,
  Globe,
  Award,
  Mic,
  MicOff
} from 'lucide-react';

let db = null;
let auth = null;
let appId = 'klingenberg-go-v1';

try {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    const firebaseConfig = JSON.parse(__firebase_config);
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  }
  if (typeof __app_id !== 'undefined' && __app_id) {
    appId = __app_id;
  }
} catch (e) {
  console.warn("Firebase konnte nicht initialisiert werden. Ausweichmodus aktiv.", e);
}

const safeLocalStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }
};

const PRECONFIGURED_API_KEY = "DEIN_API_SCHLÜSSEL_HIER";

// Sichere Normalisierung von Familiendaten zur Vermeidung von Render-Abstürzen
const normalizeFamily = (famArray) => {
  if (!Array.isArray(famArray)) return [];
  return famArray.map(item => {
    if (typeof item === 'string') {
      return { name: item, age: 30 }; // Standard-Alter für konvertierte Strings
    }
    if (item && typeof item === 'object') {
      return {
        name: String(item.name || 'Unbekannt'),
        age: typeof item.age === 'number' ? item.age : parseInt(item.age) || 0
      };
    }
    return { name: 'Reisender', age: 30 };
  });
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('assistant');
  const [location, setLocation] = useState(() => String(safeLocalStorage.getItem('klingenberg_location') || 'Bari'));
  // Separater Entwurfs-State für das Ortsfeld im Settings-Formular. So läuft der
  // Tipps-Reset-Effekt (der an `location` hängt) erst beim tatsächlichen Speichern,
  // nicht bei jedem einzelnen Tastendruck.
  const [draftLocation, setDraftLocation] = useState(() => String(safeLocalStorage.getItem('klingenberg_location') || 'Bari'));
  const [customApiKey, setCustomApiKey] = useState(() => String(safeLocalStorage.getItem('klingenberg_apikey') || ''));

  const [family, setFamily] = useState(() => {
    const saved = safeLocalStorage.getItem('klingenberg_family_v2');
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed) return normalizeFamily(parsed);
    } catch (e) {}
    return [
      { name: 'Papa Elias', age: 36 },
      { name: 'Mama Silja', age: 34 },
      { name: 'Olivia', age: 11 },
      { name: 'Amelia', age: 8 },
      { name: 'Leeni', age: 2 }
    ];
  });

  const [activityLog, setActivityLog] = useState(() => {
    const saved = safeLocalStorage.getItem('klingenberg_log');
    try {
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: '1',
        title: 'Ankunft in Bari',
        desc: 'Wunderschönes blaues Meer und die ersten leckeren Orecchiette-Nudeln in der Altstadt genossen! Die kleine Leeni fand die bunten Gassen toll.',
        emoji: '🍝',
        date: 'Heute',
        image: null
      }
    ];
  });

  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hallo Elias, Silja, Olivia, Amelia und Leeni! 🌟 Ich bin euer smarter Reisebegleiter Klingenbergs GO. Wo soll es heute für euch hingehen?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [bannerMsg, setBannerMsg] = useState(null);

  const [quickLogInput, setQuickLogInput] = useState('');
  const [isMagicGenerating, setIsMagicGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [movieScenes, setMovieScenes] = useState(() => {
    const saved = safeLocalStorage.getItem('klingenberg_movie');
    try {
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: '1', title: 'Intro: Kofferpacken & Abflug', assignedTo: 'Olivia', completed: true, emoji: '✈️' },
      { id: '2', title: 'Erkundung am Strand', assignedTo: 'Leeni & Amelia', completed: false, emoji: '🏖️' },
      { id: '3', title: 'Das größte Eis des Urlaubs essen', assignedTo: 'Papa Elias', completed: false, emoji: '🍦' },
      { id: '4', title: 'Sonnenuntergang am Meer', assignedTo: 'Mama Sil
