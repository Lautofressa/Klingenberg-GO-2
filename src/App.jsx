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

const normalizeFamily = (famArray) => {
  if (!Array.isArray(famArray)) return [];
  return famArray.map(item => {
    if (typeof item === 'string') {
      return { name: item, age: 30 };
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
      { id: '4', title: 'Sonnenuntergang am Meer', assignedTo: 'Mama Silja', completed: false, emoji: '🌅' }
    ];
  });
  const [newSceneTitle, setNewSceneTitle] = useState('');
  const [newSceneActor, setNewSceneActor] = useState('');

  const [isPlayingMovie, setIsPlayingMovie] = useState(false);
  const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
  
  const completedMediaScenes = movieScenes.filter(s => s.completed);

  const getDefaultTips = (city) => {
    const lowerCity = String(city || '').toLowerCase().trim();
    if (lowerCity.includes('bari')) {
      return [
        { id: 'def1', title: 'Altstadt & Orecchiette-Gasse', cat: 'Erlebnis', desc: 'Beobachtet die freundlichen Nonnas beim Nudelrollen! Kinderwagen-geeignet für Leeni (2) und hochspannend für Olivia (11) & Amelia (8).', emoji: '🍝' },
        { id: 'def2', title: 'Hausstrand Pane e Pomodoro', cat: 'Strand', desc: 'Flacher Sandstrand, perfekt für die kleine Leeni zum sicheren Planschen und Amelia zum Sandburgenbauen.', emoji: '🏖️' },
        { id: 'def3', title: 'Basilica San Nicola', cat: 'Kultur', desc: 'Kühle, eindrucksvolle Ritterkirche im Schatten der Altstadt. Bietet Elias & Silja eine entspannte Pause vom Spaziergang.', emoji: '🏰' },
        { id: 'def4', title: 'Parco Largo Due Giugno', cat: 'Spielplatz', desc: 'Riesiger grüner Park mit tollem Spielplatz für alle Altersklassen, Enten-Teich und viel Schatten zum Erholen.', emoji: '🌳' }
      ];
    } else if (lowerCity.includes('zürich') || lowerCity.includes('zurich')) {
      return [
        { id: 'def1', title: 'Zürichhorn & Seebecken', cat: 'Natur', desc: 'Wunderschöner Seespaziergang mit großem Spielplatz für Leeni und Wiesen zum Picknicken für Silja & Elias.', emoji: '🇨🇭' },
        { id: 'def2', title: 'Zoologischer Garten Zürich', cat: 'Tiere', desc: 'Der spektakuläre Regenwald begeistert Olivia & Amelia, während Leeni die Tiere im Streichelzoo liebt.', emoji: '🦁' },
        { id: 'def3', title: 'Pedalo-Miete am Zürichsee', cat: 'Aktivität', desc: 'Gemeinsam ein Tretboot mieten und den See unsicher machen – ein Riesenspaß für die ganze fünfköpfige Familie!', emoji: '⚓' },
        { id: 'def4', title: 'Gelateria di Berna', cat: 'Essen', desc: 'Das cremigste und leckerste Eis der Stadt. Ein absoluter Motivationsschub für alle drei Mädels.', emoji: '🍦' }
      ];
    } else {
      return [
        { id: 'def1', title: `Historische Entdeckungstour in ${city}`, cat: 'Erkundung', desc: 'Schlendert gemütlich durch die Fußgängerzone – absolut kinderwagenfreundlich und voller Entdeckungen für die Großen.', emoji: '🗺️' },
        { id: 'def2', title: 'Lokaler Stadtpark & Abenteuerspielplatz', cat: 'Natur', desc: 'Auszeit im Grünen: Schaukeln für Baby Leeni, Klettergerüste für Amelia & Olivia, sowie Schattenplätze für Elias & Silja.', emoji: '🌳' },
        { id: 'def3', title: 'Beste lokale Eisdiele vor Ort', cat: 'Genuss', desc: 'Sucht nach der bestbewerteten Eisdiele der Stadt – ein süßer Stopp bringt der ganzen Familie direkt gute Laune.', emoji: '🍦' },
        { id: 'def4', title: 'Interaktives Familien-Erlebnis', cat: 'Freizeit', desc: 'Ein kinderfreundliches Museum oder eine Aktivität, die Groß und Klein gleichermaßen begeistert und ablenkt.', emoji: '🧩' }
      ];
    }
  };

  const getBackgroundForLocation = (city) => {
    const lowerCity = String(city || '').toLowerCase().trim();
    const base = 'auto=format&fit=crop&w=1200&q=80';
    if (lowerCity.includes('bari') || lowerCity.includes('italien') || lowerCity.includes('italy')) {
      return `https://images.unsplash.com/photo-1516483638261-f4dbaf036963?${base}`; 
    }
    if (lowerCity.includes('zürich') || lowerCity.includes('zurich') || lowerCity.includes('schweiz') || lowerCity.includes('switzerland')) {
      return `https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?${base}`; 
    }
    if (lowerCity.includes('strand') || lowerCity.includes('beach') || lowerCity.includes('meer')) {
      return `https://images.unsplash.com/photo-1507525428034-b723cf961d3e?${base}`; 
    }
    return `https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?${base}`; 
  };

  const [localTips, setLocalTips] = useState(() => {
    const saved = safeLocalStorage.getItem('klingenberg_tips_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) return parsed;
      } catch (e) {}
    }
    return getDefaultTips('Bari');
  });
  const [isLoadingTips, setIsLoadingTips] = useState(false);

  const [customBackground, setCustomBackground] = useState(() => safeLocalStorage.getItem('klingenberg_bg') || null);
  const [unsplashBg, setUnsplashBg] = useState(`https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80`);

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const photoCaptureInputRef = useRef(null);
  const videoCaptureInputRef = useRef(null);
  const profilePhotoInputRef = useRef(null);
  const backgroundPhotoInputRef = useRef(null);

  const [profilePhoto, setProfilePhoto] = useState(() => safeLocalStorage.getItem('klingenberg_profile') || null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const rotatingPlaceholders = [
    "Wie geht es dir heute?",
    "Was brauchst du gerade für die Familie?",
    "Soll ich ein Abenteuer für Olivia, Amelia und Leeni planen?",
    "Worauf habt ihr heute Lust?",
    "Suche nach kinderfreundlichen Cafés..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % rotatingPlaceholders.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isPlayingMovie && completedMediaScenes.length > 0) {
      const currentScene = completedMediaScenes[currentMovieIndex];
      if (!currentScene.video) {
        const timer = setTimeout(() => {
          if (currentMovieIndex < completedMediaScenes.length - 1) {
            setCurrentMovieIndex(prev => prev + 1);
          } else {
            setIsPlayingMovie(false);
            setCurrentMovieIndex(0);
          }
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [isPlayingMovie, currentMovieIndex, completedMediaScenes]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlKey = params.get('key') || params.get('apikey') || params.get('api_key');
      
      if (urlKey && urlKey.startsWith('AIzaSy')) {
        safeLocalStorage.setItem('klingenberg_apikey', urlKey);
        setCustomApiKey(urlKey);
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        triggerBanner("🔑 API-Schlüssel automatisch aus Link importiert & gespeichert!");
      }
    } catch (e) {
      console.warn("URL-Parameter konnten nicht gelesen werden", e);
    }
  }, []);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth-Fehler", e);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db || !user) return;
    
    const unsub = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'klingenberg_data'), 
      (snapshot) => {
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.type === 'settings') {
            if (data.location) {
              setLocation(String(data.location));
              setDraftLocation(String(data.location));
              safeLocalStorage.setItem('klingenberg_location', String(data.location));
            }
            if (data.family) {
              const normalized = normalizeFamily(data.family);
              setFamily(normalized);
              safeLocalStorage.setItem('klingenberg_family_v2', JSON.stringify(normalized));
            }
            if (data.profilePhoto) {
              setProfilePhoto(data.profilePhoto);
              safeLocalStorage.setItem('klingenberg_profile', data.profilePhoto);
            }
            if (data.customBackground) {
              setCustomBackground(data.customBackground);
              safeLocalStorage.setItem('klingenberg_bg', data.customBackground);
            }
          }
          if (data.type === 'log') {
            if (data.entries) {
              setActivityLog(data.entries);
              safeLocalStorage.setItem('klingenberg_log', JSON.stringify(data.entries));
            }
          }
          if (data.type === 'movie') {
            if (data.scenes) {
              setMovieScenes(data.scenes);
              safeLocalStorage.setItem('klingenberg_movie', JSON.stringify(data.scenes));
            }
          }
          if (data.type === 'tips') {
            if (data.tipsList && data.tipsList.length === 4) {
              setLocalTips(data.tipsList);
              safeLocalStorage.setItem('klingenberg_tips_list', JSON.stringify(data.tipsList));
            }
          }
        });
      },
      (error) => console.warn("Firestore Sync Error (Local-Modus aktiv)", error)
    );
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (location) {
      setUnsplashBg(getBackgroundForLocation(location));

      const savedTipsRaw = safeLocalStorage.getItem('klingenberg_tips_list');
      const savedForLocation = safeLocalStorage.getItem('klingenberg_tips_location');
      if (savedForLocation !== location || !savedTipsRaw) {
        const freshDefaults = getDefaultTips(location);
        setLocalTips(freshDefaults);
        safeLocalStorage.setItem('klingenberg_tips_list', JSON.stringify(freshDefaults));
        safeLocalStorage.setItem('klingenberg_tips_location', location);
      }
    }
  }, [location]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('###')) {
        return (
          <h4 key={i} className="text-base font-black text-orange-400 mt-3 mb-1 flex items-center gap-1">
            {line.replace('###', '').trim()}
          </h4>
        );
      }
      if (line.startsWith('-') || line.startsWith('*')) {
        const content = line.substring(1).trim();
        return (
          <div key={i} className="flex items-start gap-2 text-xs text-slate-200 pl-2 py-0.5 leading-relaxed">
            <span className="text-orange-500 mt-1">•</span>
            <span>{parseInlineStyles(content)}</span>
          </div>
        );
      }
      return (
        <p key={i} className="text-xs text-slate-200 leading-relaxed mb-1.5">
          {parseInlineStyles(line)}
        </p>
      );
    });
  };

  const parseInlineStyles = (text) => {
    const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
    if (parts.length <= 1) return text;
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="text-amber-300 font-extrabold">{part}</strong>;
      }
      return part;
    });
  };

  const triggerBanner = (msg) => {
    setBannerMsg(msg);
    setTimeout(() => {
      setBannerMsg(null);
    }, 4000);
  };

  const toggleSpeechInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      triggerBanner("🎙️ Spracheingabe wird von diesem Browser leider nicht unterstützt.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn("Speech stop warning", e);
        }
      }
      setIsListening(false);
    } else {
      setIsListening(true);
      try {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.lang = 'de-DE';
        rec.interimResults = false;

        rec.onstart = () => {
          triggerBanner("🎙️ Ich höre zu... Bitte sprechen!");
        };

        rec.onresult = (event) => {
          const text = event.results[0][0].transcript;
          if (text) {
            setQuickLogInput(prev => (prev + " " + text).trim());
            triggerBanner("🎙️ Sprache erfolgreich erkannt!");
          }
        };

        rec.onerror = (event) => {
          console.error("Speech Error:", event.error);
          if (event.error === 'not-allowed') {
            triggerBanner("🎙️ Mikrofon-Zugriff blockiert. Bitte in den Handyeinstellungen erlauben.");
          } else if (event.error === 'no-speech') {
            triggerBanner("🎙️ Keine Sprache erkannt. Bitte deutlicher sprechen.");
          } else {
            triggerBanner(`🎙️ Fehler bei Spracheingabe: ${event.error}`);
          }
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (e) {
        console.error("Speech Init Error", e);
        triggerBanner("🎙️ Fehler beim Starten des Mikrofons.");
        setIsListening(false);
      }
    }
  };

  const handleProfilePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      setProfilePhoto(base64);
      safeLocalStorage.setItem('klingenberg_profile', base64);
      triggerBanner("📸 Profilbild aktualisiert!");
      
      if (db && user) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'klingenberg_data', 'settings'), {
          type: 'settings',
          location,
          family,
          profilePhoto: base64,
          customBackground
        }, { merge: true });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBackgroundPhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      setCustomBackground(base64);
      safeLocalStorage.setItem('klingenberg_bg', base64);
      triggerBanner("🌅 Hintergrundfoto aktualisiert!");

      if (db && user) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'klingenberg_data', 'settings'), {
          type: 'settings',
          location,
          family,
          profilePhoto,
          customBackground: base64
        }, { merge: true });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDiaryPhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const formattedDate = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
      
      // Verwendet den Text aus dem Eingabefeld, falls vorhanden
      const customDesc = quickLogInput.trim() !== '' ? quickLogInput.trim() : 'Ein magischer Augenblick aus dem Urlaub direkt vor der Kamera festgehalten!';
      const customTitle = quickLogInput.trim() !== '' ? 'Foto-Erinnerung' : 'Schnappschuss';

      const newEntry = {
        id: Date.now().toString(),
        title: customTitle,
        desc: customDesc,
        emoji: '📸',
        date: formattedDate,
        image: event.target.result,
        type: 'photo'
      };
      const updated = [newEntry, ...activityLog];
      setActivityLog(updated);
      safeLocalStorage.setItem('klingenberg_log', JSON.stringify(updated));

      const newScene = {
        id: newEntry.id + "-mov",
        title: customTitle,
        desc: customDesc,
        emoji: '📸',
        date: formattedDate,
        image: event.target.result,
        assignedTo: 'Alle',
        completed: true
      };
      const updatedScenes = [...movieScenes, newScene];
      setMovieScenes(updatedScenes);
      safeLocalStorage.setItem('klingenberg_movie', JSON.stringify(updatedScenes));

      setQuickLogInput(''); // Setzt das Eingabefeld nach dem Speichern wieder zurück
      triggerBanner("📸 Foto mit Text gesichert!");

      if (db && user) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'klingenberg_data', 'log'), {
          type: 'log',
          entries: updated
        });
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'klingenberg_data', 'movie'), {
          type: 'movie',
          scenes: updatedScenes
        }).catch(() => {
          console.warn("Firestore-Video-Sync fehlgeschlagen (Dokument evtl. > 1 MiB). Bleibt lokal gespeichert.");
          triggerBanner("⚠️ Foto lokal gesichert, Cloud-Sync evtl. fehlgeschlagen (Datei zu groß).");
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDiaryVideoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const formattedDate = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
      
      // Verwendet den Text aus dem Eingabefeld, falls vorhanden
      const customDesc = quickLogInput.trim() !== '' ? quickLogInput.trim() : 'Ein toller, gefilmter Moment der Familie im Reisetagebuch.';
      const customTitle = quickLogInput.trim() !== '' ? 'Video-Erinnerung' : 'Urlaubsvideo';

      const newEntry = {
        id: Date.now().toString(),
        title: customTitle,
        desc: customDesc,
        emoji: '🎥',
        date: formattedDate,
        video: event.target.result,
        type: 'video'
      };
      const updated = [newEntry, ...activityLog];
      setActivityLog(updated);
      safeLocalStorage.setItem('klingenberg_log', JSON.stringify(updated));

      const newScene = {
        id: newEntry.id + "-mov",
        title: customTitle,
        desc: customDesc,
        emoji: '🎥',
        date: formattedDate,
        video: event.target.result,
        assignedTo: 'Alle',
        completed: true
      };
      const updatedScenes = [...movieScenes, newScene];
      setMovieScenes(updatedScenes);
      safeLocalStorage.setItem('klingenberg_movie', JSON.stringify(updatedScenes));

      setQuickLogInput(''); // Setzt das Eingabefeld nach dem Speichern wieder zurück
      triggerBanner("🎥 Video mit Text gesichert!");

      if (db && user) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'klingenberg_data', 'log'), {
          type: 'log',
          entries: updated
        }).catch(() => {
          console.warn("Firestore-Video-Sync fehlgeschlagen (Dokument evtl. > 1 MiB). Bleibt lokal gespeichert.");
          triggerBanner("⚠️ Video lokal gesichert, Cloud-Sync evtl. fehlgeschlagen (Datei zu groß).");
        });
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'klingenberg_data', 'movie'), {
          type: 'movie',
          scenes: updatedScenes
        }).catch(() => {});
      }
    };
    reader.readAsDataURL(file);
  };

  const getActiveApiKey = () => {
    const activeKey = customApiKey.trim() || PRECONFIGURED_API_KEY.trim();
    return activeKey === "DEIN_API_SCHLÜSSEL_HIER" ? "" : activeKey;
  };

  const generateGeminiContent = async (payload, systemInstruction = null, mimeType = null) => {
    const activeKey = getActiveApiKey();
    if (!activeKey) {
      throw new Error("Bitte trage zuerst deinen eigenen Google Gemini API-Schlüssel in den Profileinstellungen ein, um den Live-Assistenten auf dem Handy zu nutzen! 🌟");
    }

    const models = [
      'gemini-2.5-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-1.5-flash'
    ];

    let lastError = null;

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
      try {
        const body = { contents: payload };
        if (systemInstruction) {
          body.systemInstruction = { parts: [{ text: systemInstruction }] };
        }
        if (mimeType) {
          body.generationConfig = { responseMimeType: mimeType };
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${response.status}`;
          throw new Error(`[${model}] ${errMsg}`);
        }

        const result = await response.json();
        const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText) {
          return generatedText;
        }
      } catch (err) {
        console.warn(`Fehler bei Modell ${model}:`, err.message);
        lastError = err;
      }
    }

    throw lastError || new Error("Alle Gemini-Verbindungen sind derzeit überlastet.");
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = { role: 'user', text: chatInput };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsTyping(true);

    const historyPayload = updatedMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const familyDetails = family.map(f => `${f.name} (${f.age} Jahre)`).join(', ');

    const systemPrompt = `Du bist "Klingenbergs GO", der intelligente und überaus herzliche Reise- und Urlaubsassistent für Familie Klingenberg. 
Aktueller Urlaubsort: ${location}. 
Reisegruppe an Bord: ${familyDetails}.
WICHTIGSTE REGEL: Halte deine Antworten extrem kurz, prägnant, inhaltsreich und frei von umschweifenden Floskeln. Komm sofort auf den Punkt. Benutze Strukturierungen mit Überschriften (###) und Stichpunkten (-).
Nutze passende Emojis und passe alle Tipps immer speziell an das Alter der Kinder an (z.B. Aktivitäten für Olivia (11), Amelia (8) und absolut babygerecht für Leeni (2)).`;

    try {
      const aiReply = await generateGeminiContent(historyPayload, systemPrompt);
      setChatMessages(prev => [...prev, { role: 'assistant', text: aiReply }]);
    } catch (error) {
      console.error("Gemini Assistant Error:", error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        text: `Ich konnte gerade keine Verbindung herstellen. (${error.message}). Bitte überprüfe deinen API-Schlüssel oder versuche es gleich noch einmal. 🌊` 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleMagicLogCreation = async () => {
    if (!quickLogInput.trim()) return;
    setIsMagicGenerating(true);
    triggerBanner("🪄 Der KI-Zauberer verarbeitet euren Moment...");

    const activeKey = getActiveApiKey();
    const formattedDate = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });

    if (!activeKey) {
      const fallbackEntry = {
        id: Date.now().toString(),
        title: 'Tagebucheintrag',
        desc: quickLogInput,
        emoji: '📝',
        date: formattedDate,
        image: null
      };
      const updated = [fallbackEntry, ...activityLog];
      setActivityLog(updated);
      safeLocalStorage.setItem('klingenberg_log', JSON.stringify(updated));

      const fallbackScene = {
        id: fallbackEntry.id + "-mov",
        title: 'Tagebucheintrag verfasst',
        desc: quickLogInput,
        emoji: '📝',
        date: formattedDate,
        image: null,
        assignedTo: 'Alle',
        completed: true
      };
      const updatedScenes = [...movieScenes, fallbackScene];
      setMovieScenes(updatedScenes);
      safeLocalStorage.setItem('klingenberg_movie', JSON.stringify(updatedScenes));

      setQuickLogInput('');
      setIsMagicGenerating(false);
      triggerBanner("📝 Eintrag im Tagebuch & Kinoplaner gesichert (Lokal)!");
      return;
    }

    const payload = [{ 
      parts: [{ 
        text: `Analysiere folgende Urlaubsnotiz der Familie: "${quickLogInput}".
Erstelle daraus einen fesselnden Reisetagebucheintrag im JSON-Format.
{
  "title": "Kurzer packender Titel (max 5 Wörter)",
  "desc": "Ausführliche, emotionale Urlaubsstory auf Deutsch geschrieben, die auch die Stimmung der Kinder einfängt.",
  "emoji": "Passendes einzelnes Emoji",
  "imagePrompt": "A detailed illustration prompt to paint a cozy, Pixar-style postcard of this specific moment in English."
}` 
      }] 
    }];

    try {
      const textRaw = await generateGeminiContent(payload, null, "application/json");
      const parsed = JSON.parse(textRaw);

      if (parsed) {
        let generatedImage = null;
        try {
          const imgUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${activeKey}`;
          const imgResponse = await fetch(imgUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instances: { prompt: parsed.imagePrompt },
              parameters: { sampleCount: 1 }
            })
          });
          const imgResult = await imgResponse.json();
          if (imgResult.predictions?.[0]?.bytesBase64Encoded) {
            generatedImage = `data:image/png;base64,${imgResult.predictions[0].bytesBase64Encoded}`;
          }
        } catch (imgErr) {
          console.warn("Imagen-Generierung fehlgeschlagen, fahre ohne Bild fort.");
        }

        const newEntry = {
          id: Date.now().toString(),
          title: parsed.title,
          desc: parsed.desc,
          emoji: parsed.emoji,
          date: formattedDate,
          image: generatedImage
        };

        const updated = [newEntry, ...activityLog];
        setActivityLog(updated);
        safeLocalStorage.setItem('klingenberg_log', JSON.stringify(updated));

        const newScene = {
          id: newEntry.id + "-mov",
          title: parsed.title,
          desc: parsed.desc,
          emoji: parsed.emoji,
          date: formattedDate,
          image: generatedImage,
          assignedTo: 'Alle',
          completed: true
        };
        const updatedScenes = [...movieScenes, newScene];
        setMovieScenes(updatedScenes);
        safeLocalStorage.setItem('klingenberg_movie', JSON.stringify(updatedScenes));
        
        if (db && user) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'klingenberg_data', 'log'), {
            type: 'log',
            entries: updated
          }).catch(() => {
            console.warn("Firestore-Sync fehlgeschlagen (Dokument evtl. > 1 MiB). Bleibt lokal gespeichert.");
          });
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'klingenberg_data', 'movie'), {
            type: 'movie',
            scenes: updatedScenes
          }).catch(() => {});
        }

        setQuickLogInput('');
        triggerBanner("✨ Magischer Eintrag im Tagebuch & Kinoplaner angelegt!");
      }
    } catch (e) {
      console.error(e);
      triggerBanner(`Fehler beim Zaubern: ${e.message}`);
    } finally {
      setIsMagicGenerating(false);
    }
  };

  const handleGenerateAiTips = async () => {
    setIsLoadingTips(true);
    triggerBanner(`🔍 Suche echte Reiseempfehlungen für ${location}...`);
    
    const activeKey = getActiveApiKey();
    if (!activeKey) {
      setIsLoadingTips(false);
      triggerBanner("Bitte trage zuerst deinen API-Key in den Profileinstellungen ein.");
      return;
    }

    const payload = [{ 
      parts: [{ 
        text: `Erstelle eine Liste mit exakt 4 abwechslungsreichen Ausflugstipps für die fünfköpfige Familie Klingenberg am Urlaubsort "${location}". 
Berücksichtige unbedingt das Alter: Papa Elias (36), Mama Silja (34), Olivia (11), Amelia (8) und die kleine Leeni (2). Es müssen baby- und kindersichere, aber auch für die Größeren spannende Orte sein.
Gib die Antwort im exakten JSON-Format aus.
{
  "tips": [
    {
      "id": "string",
      "title": "Name der Sehenswürdigkeit",
      "cat": "Kategorie z.B. Abenteuer, Strand, Essen, Kultur",
      "desc": "Tolle kurze Beschreibung, warum das perfekt für alle fünf Altersgruppen ist.",
      "emoji": "Passendes Emoji"
    }
  ]
}` 
      }] 
    }];

    try {
      const textRaw = await generateGeminiContent(payload, null, "application/json");
      const parsed = JSON.parse(textRaw);

      if (parsed && parsed.tips && parsed.tips.length === 4) {
        setLocalTips(parsed.tips);
        safeLocalStorage.setItem('klingenberg_tips_list', JSON.stringify(parsed.tips));
        if (db && user) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'klingenberg_data', 'tips'), {
            type: 'tips',
            tipsList: parsed.tips
          });
        }
        triggerBanner(`🗺️ 4 neue Geheimtipps für ${location} geladen!`);
      } else {
        throw new Error("Ungültiges Antwortformat erhalten");
      }
    } catch (e) {
      console.error(e);
      triggerBanner(`Fehler beim Abrufen der Tipps: ${e.message}`);
    } finally {
      setIsLoadingTips(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    safeLocalStorage.setItem('klingenberg_apikey', customApiKey);
    safeLocalStorage.setItem('klingenberg_location', draftLocation);
    safeLocalStorage.setItem('klingenberg_family_v2', JSON.stringify(family));

    setLocation(draftLocation);

    if (db && user) {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'klingenberg_data', 'settings'), {
        type: 'settings',
        location: draftLocation,
        family,
        profilePhoto,
        customBackground
      });
    }

    setShowSettings(false);
    triggerBanner("💾 Einstellungen erfolgreich gespeichert!");
  };

  const handleAddMovieScene = async () => {
    if (!newSceneTitle.trim()) return;
    const newScene = {
      id: Date.now().toString(),
      title: newSceneTitle,
      assignedTo: newSceneActor || 'Alle',
      completed: false,
      emoji: '🎬'
    };
    const updated = [...movieScenes, newScene];
    setMovieScenes(updated);
    safeLocalStorage.setItem('klingenberg_movie', JSON.stringify(updated));

    if (db && user) {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'klingenberg_data', 'movie'), {
        type: 'movie',
        scenes: updated
      });
    }
    setNewSceneTitle('');
    setNewSceneActor('');
    triggerBanner("🎬 Neue Filmszene eingeplant!");
  };

  const handleToggleScene = async (id) => {
    const updated = movieScenes.map(scene => 
      scene.id === id ? { ...scene, completed: !scene.completed } : scene
    );
    setMovieScenes(updated);
    safeLocalStorage.setItem('klingenberg_movie', JSON.stringify(updated));

    if (db && user) {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'klingenberg_data', 'movie'), {
        type: 'movie',
        scenes: updated
      });
    }
  };

  const handleDeleteScene = async (id) => {
    const updated = movieScenes.filter(scene => scene.id !== id);
    setMovieScenes(updated);
    safeLocalStorage.setItem('klingenberg_movie', JSON.stringify(updated));

    if (db && user) {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'klingenberg_data', 'movie'), {
        type: 'movie',
        scenes: updated
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex items-center justify-center p-0 md:p-4 selection:bg-orange-500 selection:text-white">
      
      <input 
        type="file" 
        accept="image/*" 
        ref={profilePhotoInputRef}
        className="hidden" 
        onChange={handleProfilePhotoSelect} 
      />
      <input 
        type="file" 
        accept="image/*" 
        ref={backgroundPhotoInputRef}
        className="hidden" 
        onChange={handleBackgroundPhotoSelect} 
      />
      <input 
        type="file" 
        accept="image/*" 
        ref={photoCaptureInputRef}
        capture="environment"
        className="hidden" 
        onChange={handleDiaryPhotoSelect} 
      />
      <input 
        type="file" 
        accept="video/*" 
        ref={videoCaptureInputRef}
        capture="environment"
        className="hidden" 
        onChange={handleDiaryVideoSelect} 
      />

      <div className="w-full max-w-md h-screen md:h-[880px] bg-slate-950 flex flex-col shadow-2xl relative overflow-hidden md:rounded-[2.5rem] border-0 md:border-8 border-slate-800">
        
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 z-0"
          style={{ 
            backgroundImage: `url(${customBackground || unsplashBg})`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/85 to-slate-950 z-0 backdrop-blur-[6px]" />

        {bannerMsg && (
          <div className="absolute top-12 left-4 right-4 bg-orange-500/95 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 z-50 animate-in slide-in-from-top duration-300">
            <Sparkles size={14} className="animate-pulse" />
            <span>{bannerMsg}</span>
          </div>
        )}

        <div className="text-[11px] text-white/60 px-6 pt-2 pb-1 flex justify-between font-medium tracking-widest z-20">
          <span>Klingenbergs GO v1.2</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live GPS</span>
          </div>
        </div>

        <header className="p-5 text-white z-10 shrink-0">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-xl font-extrabold tracking-tight italic flex items-center gap-2 drop-shadow-md">
              <Sun className="animate-spin text-orange-400" style={{ animationDuration: '25s' }} size={24} /> 
              <span>Klingenbergs GO</span>
            </h1>
            
            <button 
              onClick={() => { setDraftLocation(location); setShowSettings(true); }}
              className="relative w-10 h-10 rounded-full border-2 border-orange-500 overflow-hidden active:scale-95 transition-transform flex items-center justify-center bg-slate-900 shadow-lg"
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                <User size={18} className="text-slate-400" />
              )}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border border-slate-950"></span>
            </button>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md rounded-2.5xl p-3.5 flex items-center justify-between border border-white/10 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="relative group">
                <button 
                  onClick={() => backgroundPhotoInputRef.current?.click()}
                  className="bg-orange-500 text-slate-900 p-2.5 rounded-xl shadow-md hover:bg-orange-600 transition-colors flex items-center justify-center"
                  title="Eigenes Foto vom Ort schießen"
                >
                  <MapPin size={18} className="animate-bounce" />
                </button>
                <span className="absolute -bottom-1 -right-1 bg-slate-900 border border-white/10 rounded-full p-0.5 text-orange-400">
                  <Camera size={8} />
                </span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-orange-300 font-extrabold">Aktuelles Reiseziel</p>
                <p className="text-base font-black text-white">{location}</p>
              </div>
            </div>
            
            <div className="flex -space-x-2 overflow-hidden bg-slate-950/40 p-1.5 rounded-xl border border-white/5">
              {family.map((member, i) => (
                <div 
                  key={i} 
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-rose-600 text-[11px] font-black flex items-center justify-center border-2 border-slate-950 uppercase shadow shrink-0"
                  title={`${member.name} (${member.age} J.)`}
                >
                  {member.name.charAt(0)}
                </div>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-2 space-y-4 z-10 pb-28">
          
          {activeTab === 'assistant' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              
              <div className="space-y-3 pb-4">
                {chatMessages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex flex-col max-w-[85%] rounded-2xl p-3.5 shadow-md transition-all ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white ml-auto rounded-tr-none' 
                        : 'bg-slate-900/90 backdrop-blur border border-slate-800/80 mr-auto rounded-tl-none'
                    }`}
                  >
                    <p className="text-[10px] font-bold text-white/60 mb-1 flex items-center gap-1">
                      {msg.role === 'user' ? <User size={10} /> : <Sparkles size={10} className="text-orange-400" />}
                      {msg.role === 'user' ? 'Klingenberg Family' : 'Klingenbergs GO'}
                    </p>
                    <div className="space-y-1">
                      {msg.role === 'user' ? (
                        <p className="text-xs text-white leading-relaxed">{msg.text}</p>
                      ) : (
                        renderMarkdown(msg.text)
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="bg-slate-900/90 border border-slate-800/80 mr-auto rounded-2xl rounded-tl-none p-4 max-w-[85%] flex items-center gap-2 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    <span className="text-xs text-slate-400 ml-1">Klingenbergs GO recherchiert...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="absolute bottom-20 left-4 right-4 bg-slate-900/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white/10 flex items-center gap-2 z-20">
                <input 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-transparent px-3 text-base text-slate-100 outline-none placeholder:text-slate-500 py-1" 
                  placeholder={rotatingPlaceholders[placeholderIndex]} 
                />
                <button 
                  onClick={handleSendMessage} 
                  disabled={!chatInput.trim()}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 p-2 rounded-xl text-white active:scale-95 disabled:opacity-40"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'tipps' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-black tracking-tight flex items-center gap-1">
                    <Compass size={18} className="text-orange-500" /> Ausflugstipps
                  </h2>
                  <p className="text-[11px] text-slate-400">Perfekt für Silja, Elias & Kinder</p>
                </div>
                <button 
                  onClick={handleGenerateAiTips} 
                  disabled={isLoadingTips}
                  className="bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px] font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-lg"
                >
                  {isLoadingTips ? (
                    <RefreshCw className="animate-spin" size={12} />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  <span>KI-Suche starten</span>
                </button>
              </div>

              <div className="space-y-3">
                {localTips.map((tip, idx) => (
                  <div key={idx} className="bg-slate-900/85 border border-white/5 p-3.5 rounded-2.5xl flex gap-3 shadow-md">
                    <span className="text-2xl self-start bg-slate-950/60 p-2 rounded-xl">{tip.emoji}</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
                          {tip.cat}
                        </span>
                      </div>
                      <h3 className="text-xs font-black text-slate-100">{tip.title}</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{tip.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'log' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div>
                <h2 className="text-base font-black tracking-tight flex items-center gap-1">
                  <Camera size={18} className="text-orange-500" /> Digitales Reisetagebuch
                </h2>
                <p className="text-[11px] text-slate-400">Sprich oder tippe eure Erinnerungen ein</p>
              </div>

              <div className="bg-slate-900/95 border border-white/10 p-4 rounded-2xl space-y-3 shadow-md">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs uppercase tracking-wider font-extrabold text-amber-400 flex items-center gap-1">
                    <Sparkles size={12} /> Magischer Schnellschreiber
                  </h3>
                  
                  <button 
                    onClick={toggleSpeechInput}
                    className={`p-1.5 rounded-full flex items-center justify-center transition-all ${
                      isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-950 text-slate-300 hover:text-white'
                    }`}
                    title="Spracheingabe starten"
                  >
                    {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                  </button>
                </div>

                <textarea 
                  placeholder={isListening ? "Sprich jetzt... Ich höre dir zu!" : "Erzähl mir vom Tag... (z.B: Olivia, Amelia und Leeni haben am Wasser gespielt und leckeres Erdbeereis gegessen!)"} 
                  value={quickLogInput}
                  onChange={(e) => setQuickLogInput(e.target.value)}
                  className="w-full bg-slate-950 text-base p-3 rounded-xl border border-white/5 text-slate-100 outline-none min-h-[70px] placeholder:text-slate-600 resize-none"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => photoCaptureInputRef.current?.click()}
                    className="bg-slate-950 hover:bg-slate-900 text-xs py-2 px-3 rounded-xl border border-white/5 text-slate-300 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Camera size={12} className="text-orange-500" />
                    <span>📸 Foto aufnehmen</span>
                  </button>
                  <button 
                    onClick={() => videoCaptureInputRef.current?.click()}
                    className="bg-slate-950 hover:bg-slate-900 text-xs py-2 px-3 rounded-xl border border-white/5 text-slate-300 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Video size={12} className="text-rose-500" />
                    <span>🎥 Video aufnehmen</span>
                  </button>
                </div>

                <button 
                  onClick={handleMagicLogCreation}
                  disabled={isMagicGenerating || !quickLogInput.trim()}
                  className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  {isMagicGenerating ? <RefreshCw className="animate-spin" size={14} /> : 'Eintrag zaubern! 🪄'}
                </button>
              </div>

              <div className="space-y-4 pb-20">
                {activityLog.map((log) => (
                  <div key={log.id} className="bg-slate-900/90 border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                    
                    {log.image && (
                      <div className="w-full h-44 overflow-hidden relative">
                        <img src={log.image} alt={log.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                      </div>
                    )}

                    {log.video && (
                      <div className="w-full h-44 bg-slate-950 relative">
                        <video src={log.video} controls className="w-full h-full object-contain" />
                      </div>
                    )}

                    <div className="p-4 relative">
                      <button 
                        onClick={async () => {
                          const updated = activityLog.filter(l => l.id !== log.id);
                          setActivityLog(updated);
                          safeLocalStorage.setItem('klingenberg_log', JSON.stringify(updated));
                          
                          const updatedScenes = movieScenes.filter(s => s.id !== log.id + "-mov");
                          setMovieScenes(updatedScenes);
                          safeLocalStorage.setItem('klingenberg_movie', JSON.stringify(updatedScenes));

                          if (db && user) {
                            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'klingenberg_data', 'log'), {
                              type: 'log',
                              entries: updated
                            });
                            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'klingenberg_data', 'movie'), {
                              type: 'movie',
                              scenes: updatedScenes
                            });
                          }
                          triggerBanner("🗑️ Eintrag & Kinoplaner-Szene gelöscht!");
                        }}
                        className="absolute top-3.5 right-3.5 text-slate-500 hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-2xl">{log.emoji}</span>
                        <div>
                          <p className="text-[10px] text-orange-400 font-extrabold">{log.date}</p>
                          <h3 className="text-xs font-black text-white">{log.title}</h3>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{log.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'film' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-base font-black tracking-tight flex items-center gap-1">
                    <Film size={18} className="text-rose-500" /> Klingenberg Kinoplaner
                  </h2>
                  <p className="text-[11px] text-slate-400">Storyboard, Regie & Synchron-Erlebnisse</p>
                </div>
                
                <button 
                  onClick={() => {
                    if (completedMediaScenes.length === 0) {
                      triggerBanner("🎬 Keine fertigen Szenen vorhanden!");
                      return;
                    }
                    setCurrentMovieIndex(0);
                    setIsPlayingMovie(true);
                  }}
                  className="bg-gradient-to-r from-rose-500 to-orange-500 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                >
                  <Film size={14} /> Film abspielen
                </button>
              </div>

              <div className="bg-slate-900/95 border border-white/10 p-4 rounded-2xl space-y-3 shadow-md">
                <h3 className="text-xs uppercase tracking-wider font-extrabold text-rose-500">Neue Filmszene</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Szenen-Idee..." 
                    value={newSceneTitle}
                    onChange={(e) => setNewSceneTitle(e.target.value)}
                    className="flex-1 bg-slate-950 text-xs px-3 py-1.5 rounded-xl border border-white/5 text-slate-100 outline-none"
                  />
                  <select 
                    value={newSceneActor}
                    onChange={(e) => setNewSceneActor(e.target.value)}
                    className="bg-slate-950 text-xs px-2 rounded-xl border border-white/5 text-slate-300 outline-none"
                  >
                    <option value="">Wer filmt?</option>
                    {family.map((f, idx) => (
                      <option key={idx} value={f.name}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={handleAddMovieScene}
                  className="w-full bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-bold py-2 rounded-xl text-xs active:scale-95"
                >
                  Szene einplanen
                </button>
              </div>

              <div className="space-y-3 pb-20">
                {movieScenes.map((scene) => {
                  const hasMedia = scene.image || scene.video || scene.desc;

                  return (
                    <div 
                      key={scene.id}
                      className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${
                        scene.completed 
                          ? 'bg-emerald-950/25 border-emerald-900/30 text-emerald-100/95' 
                          : 'bg-slate-900/80 border-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleToggleScene(scene.id)}
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              scene.completed ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-700'
                            }`}
                          >
                            {scene.completed && <CheckCircle size={14} className="stroke-[3]" />}
                          </button>
                          <div>
                            <p className={`text-xs font-black flex items-center gap-1.5 ${scene.completed ? 'text-emerald-400' : 'text-slate-200'}`}>
                              <span className="text-sm">{scene.emoji || '🎬'}</span>
                              <span>{scene.title}</span>
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <span className="text-[9px] uppercase tracking-wider font-extrabold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full inline-block">
                                🎬 {scene.assignedTo}
                              </span>
                              {scene.date && (
                                <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full inline-block">
                                  📅 {scene.date}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button onClick={() => handleDeleteScene(scene.id)} className="text-slate-500 hover:text-rose-500">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {hasMedia && (
                        <div className="mt-1 pl-8 border-l border-white/5 space-y-2.5">
                          {scene.desc && (
                            <p className="text-[11px] text-slate-400 italic leading-relaxed">
                              "{scene.desc}"
                            </p>
                          )}

                          {scene.image && (
                            <div className="w-full h-32 rounded-xl overflow-hidden relative border border-white/5">
                              <img src={scene.image} alt={scene.title} className="w-full h-full object-cover" />
                              <div className="absolute top-2 right-2 bg-slate-950/70 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-bold text-amber-400 flex items-center gap-1 border border-white/10">
                                <Sparkles size={8} /> Tagebuch Foto
                              </div>
                            </div>
                          )}

                          {scene.video && (
                            <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-950 border border-white/5 relative">
                              <video src={scene.video} controls className="w-full h-full object-contain" />
                              <div className="absolute top-2 right-2 bg-slate-950/70 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-bold text-rose-400 flex items-center gap-1 border border-white/10">
                                <Video size={8} /> Live Clip
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        <nav className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-white/5 p-4 flex justify-around rounded-t-[2.2rem] z-20">
          {[
            { id: 'assistant', icon: <MessageCircle size={18} />, label: 'Assistent' },
            { id: 'tipps', icon: <Compass size={18} />, label: 'Tipps' },
            { id: 'log', icon: <Camera size={18} />, label: 'Logbuch' },
            { id: 'film', icon: <Film size={18} />, label: 'Kino' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`flex flex-col items-center gap-1.5 p-1 rounded-xl transition-all ${
                activeTab === tab.id 
                  ? 'text-orange-400 scale-110 font-bold' 
                  : 'text-slate-500'
              }`}
            >
              {tab.icon}
              <span className="text-[9px] font-bold">{tab.label}</span>
            </button>
          ))}
        </nav>

        {showSettings && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex items-end justify-center animate-in slide-in-from-bottom duration-300">
            <div className="w-full bg-slate-900 border-t border-white/10 rounded-t-[2.2rem] p-6 space-y-4 max-h-[85%] overflow-y-auto">
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-extrabold flex items-center gap-1.5 text-white">
                    <User className="text-orange-500" /> Profileinstellungen
                  </h3>
                  <p className="text-[10px] text-slate-400">Passe eure Reisegruppe und euren API-Key an</p>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                
                <div className="flex flex-col items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-full border-4 border-orange-500 overflow-hidden bg-slate-950 flex items-center justify-center shadow-inner"
                  >
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Profil" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={24} className="text-slate-600" />
                    )}
                  </button>
                  <span className="text-[10px] text-slate-400">Tippe auf das Bild, um ein neues Foto aufzunehmen</span>
                </div>

                <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                  <label className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                    <Sparkles size={11} /> Google Gemini API-Schlüssel
                  </label>
                  <input 
                    type="password" 
                    value={customApiKey} 
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 px-3 text-base text-white outline-none focus:border-orange-500 transition-colors placeholder:text-slate-700"
                  />
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Trage hier deinen persönlichen Schlüssel ein, um die KI-Routen und den Chatbot uneingeschränkt auf allen Mobilgeräten zu nutzen. Den Schlüssel erhältst du kostenlos im <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-orange-400 underline hover:text-orange-300">Google AI Studio</a>.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 font-bold">Aktueller Urlaubsort</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 text-orange-500" size={14} />
                    <input 
                      type="text" 
                      value={draftLocation} 
                      onChange={(e) => setDraftLocation(e.target.value)}
                      className="w-full bg-slate-950 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-base text-white outline-none focus:border-orange-500"
                    />
                  </div>
                  <p className="text-[9px] text-slate-500">Wird erst beim Speichern übernommen, damit eure KI-Tipps nicht vorzeitig überschrieben werden.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] text-slate-400 font-bold">Familienmitglieder & Alter</label>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {family.map((member, idx) => (
                      <span 
                        key={idx} 
                        className="bg-slate-950 border border-white/5 text-[11px] px-2.5 py-1 rounded-full text-slate-200 flex items-center gap-1"
                      >
                        <span>{member.name} ({member.age} J.)</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            const updated = family.filter(f => f.name !== member.name);
                            setFamily(updated);
                          }} 
                          className="text-rose-500 ml-1 font-bold"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      id="newFamilyMemberInput"
                      placeholder="Name..." 
                      className="flex-1 bg-slate-950 border border-white/5 rounded-xl px-3 py-1.5 text-base text-white outline-none"
                    />
                    <input 
                      type="number" 
                      id="newFamilyMemberAge"
                      placeholder="Alter..." 
                      className="w-16 bg-slate-950 border border-white/5 rounded-xl px-2 py-1.5 text-base text-white outline-none"
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        const nameEl = document.getElementById('newFamilyMemberInput');
                        const ageEl = document.getElementById('newFamilyMemberAge');
                        if (nameEl && nameEl.value) {
                          const updated = [...family, { name: nameEl.value, age: parseInt(ageEl.value) || 0 }];
                          setFamily(updated);
                          nameEl.value = '';
                          ageEl.value = '';
                        }
                      }}
                      className="bg-slate-800 text-xs text-slate-200 px-3.5 rounded-xl font-bold"
                    >
                      Hinzufügen
                    </button>
                  </div>
                </div>

                {customBackground && (
                  <button 
                    type="button"
                    onClick={() => {
                      setCustomBackground(null);
                      safeLocalStorage.setItem('klingenberg_bg', '');
                      triggerBanner("🌅 Hintergrundfoto zurückgesetzt.");
                    }}
                    className="w-full py-1.5 text-xs text-rose-500 hover:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl"
                  >
                    Selbstgeschossenes Hintergrundbild löschen
                  </button>
                )}

                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold py-3 rounded-xl text-xs"
                >
                  Einstellungen speichern
                </button>

              </form>
            </div>
          </div>
        )}

        {/* KINO MODUS OVERLAY */}
        {isPlayingMovie && completedMediaScenes.length > 0 && (
          <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center animate-in fade-in duration-700">
            {/* Schließen-Button */}
            <button 
              onClick={() => { setIsPlayingMovie(false); setCurrentMovieIndex(0); }}
              className="absolute top-8 right-6 bg-slate-900/50 p-2 rounded-full text-white/70 hover:text-white z-50 backdrop-blur"
            >
              <X size={20} />
            </button>
            
            <div className="w-full h-full flex flex-col items-center justify-center relative bg-black">
              {completedMediaScenes[currentMovieIndex].video ? (
                <video 
                  src={completedMediaScenes[currentMovieIndex].video} 
                  autoPlay 
                  playsInline
                  controls
                  onEnded={() => {
                    if (currentMovieIndex < completedMediaScenes.length - 1) {
                      setCurrentMovieIndex(prev => prev + 1);
                    } else {
                      setIsPlayingMovie(false);
                      setCurrentMovieIndex(0);
                    }
                  }}
                  className="w-full h-full object-contain"
                />
              ) : completedMediaScenes[currentMovieIndex].image ? (
                <img 
                  src={completedMediaScenes[currentMovieIndex].image} 
                  alt="Szene" 
                  className="w-full h-full object-contain animate-in zoom-in duration-1000"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 px-8 text-center animate-in zoom-in duration-1000">
                  <span className="text-6xl mb-6">{completedMediaScenes[currentMovieIndex].emoji || '📝'}</span>
                  <h3 className="text-2xl font-black text-amber-400 mb-4 uppercase tracking-widest leading-snug">{completedMediaScenes[currentMovieIndex].title}</h3>
                  <p className="text-lg text-slate-200 italic leading-relaxed">"{completedMediaScenes[currentMovieIndex].desc}"</p>
                </div>
              )}
              
              {/* Filmuntertitel nur für Bilder und Videos anzeigen */}
              {(completedMediaScenes[currentMovieIndex].image || completedMediaScenes[currentMovieIndex].video) && (
                <div className="absolute bottom-16 left-4 right-4 p-4 bg-slate-950/80 backdrop-blur-md rounded-2xl text-center border border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-500">
                  <p className="text-amber-400 font-extrabold text-xs mb-1 uppercase tracking-widest flex justify-center items-center gap-2">
                    <span className="text-lg">{completedMediaScenes[currentMovieIndex].emoji || '🎬'}</span> 
                    {completedMediaScenes[currentMovieIndex].title}
                  </p>
                  {completedMediaScenes[currentMovieIndex].desc && (
                    <p className="text-slate-200 text-[11px] italic leading-relaxed">
                      "{completedMediaScenes[currentMovieIndex].desc}"
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
