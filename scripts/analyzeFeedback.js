// scripts/analyzeFeedback.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'public/data/feedback_boosts.json');

// 1. Cargar variables de entorno desde .env manualmente
const parseEnv = () => {
  const envPath = path.resolve(PROJECT_ROOT, '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index === -1) return;
    const key = trimmed.substring(0, index).trim();
    let val = trimmed.substring(index + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  });
  return env;
};

const env = parseEnv();

// 2. Intentar inicializar Firebase
let db = null;
const isFirebaseConfigured = env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_API_KEY !== 'tu_api_key';

if (isFirebaseConfigured) {
  try {
    const firebaseConfig = {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID
    };
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('🔥 [RLHF Analyzer] Conectado exitosamente a Firebase Firestore.');
  } catch (err) {
    console.warn('⚠️ [RLHF Analyzer] Falló la inicialización de Firebase:', err.message);
  }
} else {
  console.log('🔌 [RLHF Analyzer] Firebase no está configurado. Se usará el generador de semillas local.');
}

// 3. Obtener feedbacks
async function fetchFeedbacks() {
  const feedbacks = [];
  
  if (db) {
    try {
      console.log('📥 [RLHF Analyzer] Consultando feedbacks en la nube...');
      const querySnapshot = await getDocs(collection(db, 'deck_feedback'));
      querySnapshot.forEach(doc => {
        feedbacks.push({ id: doc.id, ...doc.data() });
      });
      console.log(`✅ [RLHF Analyzer] Descargados ${feedbacks.length} registros de Firebase.`);
    } catch (err) {
      console.error('❌ [RLHF Analyzer] Error al obtener datos de Firebase:', err);
    }
  }

  // Si no hay feedbacks en la nube o no está configurado, intentar leer de un backup local
  const backupPath = path.join(PROJECT_ROOT, 'database/feedback_backup.json');
  if (fs.existsSync(backupPath)) {
    try {
      const localFeedbacks = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      console.log(`📦 [RLHF Analyzer] Encontrados ${localFeedbacks.length} registros en el backup local.`);
      feedbacks.push(...localFeedbacks);
    } catch (err) {
      console.warn('⚠️ [RLHF Analyzer] Error al leer el backup local:', err.message);
    }
  }

  return feedbacks;
}

// 4. Semilla por defecto si no hay ningún feedback
function getSeedBoosts() {
  console.log('🌱 [RLHF Analyzer] Sin datos suficientes. Generando semillas de feedback predeterminadas...');
  return {
    "modern_control": {
      "supreme verdict": { "feedbackBoost": 80, "avgRating": 4.5, "winRateScore": 0.75 },
      "teferi, time raveler": { "feedbackBoost": 90, "avgRating": 4.8, "winRateScore": 0.85 },
      "the wandering emperor": { "feedbackBoost": 75, "avgRating": 4.3, "winRateScore": 0.65 }
    },
    "modern_aggro": {
      "goblin guide": { "feedbackBoost": 85, "avgRating": 4.6, "winRateScore": 0.8 },
      "monastery swiftspear": { "feedbackBoost": 95, "avgRating": 4.9, "winRateScore": 0.9 },
      "lightning bolt": { "feedbackBoost": 90, "avgRating": 4.7, "winRateScore": 0.85 }
    },
    "modern_combo": {
      "lotus petal": { "feedbackBoost": 95, "avgRating": 4.9, "winRateScore": 0.95 },
      "underworld breach": { "feedbackBoost": 90, "avgRating": 4.8, "winRateScore": 0.85 },
      "grapeshot": { "feedbackBoost": 80, "avgRating": 4.4, "winRateScore": 0.75 }
    }
  };
}

async function run() {
  const feedbacks = await fetchFeedbacks();
  
  if (feedbacks.length === 0) {
    const seed = getSeedBoosts();
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(seed, null, 2), 'utf8');
    console.log(`✨ [RLHF Analyzer] Creado archivo de semillas en: ${OUTPUT_PATH}`);
    return;
  }

  console.log('📊 [RLHF Analyzer] Agrupando y analizando feedbacks...');
  const groups = {}; // { archetypeKey: { cardName: { ratings: [], wins: 0, totalMatches: 0 } } }

  feedbacks.forEach(entry => {
    const format = (entry.format || 'MODERN').toLowerCase();
    const archetype = (entry.archetype || 'midrange').toLowerCase();
    const key = `${format}_${archetype}`;

    if (!groups[key]) {
      groups[key] = {};
    }

    const rating = Number(entry.rating || 0);
    const win = entry.winRate === 'Gané';
    const hasPlayed = entry.winRate !== 'No jugué';
    const cardList = entry.cardList || [];

    cardList.forEach(card => {
      if (!card.name) return;
      const cardName = card.name.toLowerCase();

      if (!groups[key][cardName]) {
        groups[key][cardName] = {
          ratings: [],
          wins: 0,
          totalMatches: 0
        };
      }

      if (rating > 0) {
        groups[key][cardName].ratings.push(rating);
      }
      
      if (hasPlayed) {
        groups[key][cardName].totalMatches += 1;
        if (win) {
          groups[key][cardName].wins += 1;
        }
      }
    });
  });

  const boostsOutput = {};

  Object.entries(groups).forEach(([archetypeKey, cards]) => {
    boostsOutput[archetypeKey] = {};

    Object.entries(cards).forEach(([cardName, stats]) => {
      const totalRatings = stats.ratings.length;
      if (totalRatings === 0) return;

      const avgRating = stats.ratings.reduce((a, b) => a + b, 0) / totalRatings;
      const winRateScore = stats.totalMatches > 0 ? (stats.wins / stats.totalMatches) : 0.5;

      // Fórmula del boost: Puntuación de valoración general + éxito en partidas (Win Rate)
      // Escala máx de 100 puntos.
      const rawBoost = Math.round(avgRating * 14 + winRateScore * 30);
      const feedbackBoost = Math.max(10, Math.min(95, rawBoost));

      // Solo impulsar si la valoración promedio es decente (>= 3.0)
      if (avgRating >= 3.0) {
        boostsOutput[archetypeKey][cardName] = {
          feedbackBoost,
          avgRating: parseFloat(avgRating.toFixed(2)),
          winRateScore: parseFloat(winRateScore.toFixed(2))
        };
      }
    });

    // Si para este arquetipo no quedaron cartas válidas, remover la llave
    if (Object.keys(boostsOutput[archetypeKey]).length === 0) {
      delete boostsOutput[archetypeKey];
    }
  });

  // Guardar el archivo en public/data/feedback_boosts.json
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(boostsOutput, null, 2), 'utf8');
  console.log(`✨ [RLHF Analyzer] Archivo analizado y exportado a: ${OUTPUT_PATH}`);
  
  // Guardar copia local de backup por seguridad
  const backupPath = path.join(PROJECT_ROOT, 'database/feedback_backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(feedbacks, null, 2), 'utf8');
  console.log(`💾 [RLHF Analyzer] Backup local de feedbacks actualizado.`);
}

run().catch(err => {
  console.error("❌ [RLHF Analyzer] Error crítico en el análisis:", err);
});
