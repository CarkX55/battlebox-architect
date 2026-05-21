import { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';

const PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', icon: '🌐', baseUrl: 'https://openrouter.ai/api/v1' },
  { id: 'gemini', name: 'Gemini (Google)', icon: '🔷', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  { id: 'groq', name: 'Groq', icon: '⚡', baseUrl: 'https://api.groq.com/openai/v1' },
  { id: 'openai', name: 'OpenAI', icon: '🧠', baseUrl: 'https://api.openai.com/v1' },
];

const RARITY_MODES = [
  { value: 'standard', label: 'Estándar (Equilibrado)' },
  { value: 'high-power', label: 'Poder de Legacy (Sin límites de rareza, pero Justo)' },
  { value: 'pauper', label: 'Pauper (Solo Comunes)' },
  { value: 'artisan', label: 'Artisan (Comunes e Infrecuentes)' }
];

const DEFAULT_STORAGE_KEY = 'mtg_forge_ai_config';

export default function AiConfigPanel({ onConfigReady, storageKey = DEFAULT_STORAGE_KEY }) {
  const [provider, setProvider] = useState('openrouter');
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [error, setError] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [rarityMode, setRarityMode] = useState('high-power');
  
  // Mapa maestro: { openrouter: { apiKey, model }, gemini: { ... } }
  const [providerKeys, setProviderKeys] = useState({});

  // Valores para el proveedor actual (derivados del estado maestro)
  const currentConfig = providerKeys[provider] || { apiKey: '', model: '' };
  const apiKey = currentConfig.apiKey;
  const selectedModel = currentConfig.model;

  // Cargar al inicio
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.keys) {
          setProviderKeys(config.keys);
        } else if (config.apiKey) {
          // Migración de formato viejo
          setProviderKeys({ [config.provider || 'openrouter']: { apiKey: config.apiKey, model: config.selectedModel || '' } });
        }
        setProvider(config.provider || 'openrouter');
        setRarityMode(config.rarityMode || 'high-power');
      } catch (e) {}
    }
  }, [storageKey]);

  // Guardar en localStorage y notificar al padre
  const persist = (newProvider, newKeys, newRarityMode = rarityMode) => {
    const providerInfo = PROVIDERS.find(p => p.id === newProvider);
    const config = {
      provider: newProvider,
      apiKey: newKeys[newProvider]?.apiKey || '',
      selectedModel: newKeys[newProvider]?.model || '',
      baseUrl: providerInfo?.baseUrl,
      rarityMode: newRarityMode,
      keys: newKeys
    };
    localStorage.setItem(storageKey, JSON.stringify(config));
    
    // Notificar al padre siempre
    onConfigReady?.(config);
  };

  const updateCurrentProvider = (updates) => {
    setProviderKeys(prev => {
      const next = {
        ...prev,
        [provider]: { ...currentConfig, ...updates }
      };
      persist(provider, next);
      return next;
    });
  };

  const handleRarityChange = (newMode) => {
    setRarityMode(newMode);
    persist(provider, providerKeys, newMode);
  };

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    setModels([]);
    setSearchFilter('');
    // Al cambiar, persistimos el nuevo proveedor seleccionado con las keys que ya tenemos
    persist(newProvider, providerKeys);
  };

  const fetchModels = async () => {
    if (!apiKey) {
      setError('Introduce una API Key primero');
      return;
    }

    setLoadingModels(true);
    setError('');
    setModels([]);

    try {
      if (provider === 'openrouter') {
        const res = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!res.ok) throw new Error('Error en la solicitud');
        const data = await res.json();
        
        const filtered = data.data
          .filter(m => !m.id.includes('image') && !m.id.includes('audio') && !m.id.includes('vision'))
          .sort((a, b) => {
            const freeA = a.id.includes('free') || a.id.includes('qwen') || a.id.includes('llama') ? -1 : 1;
            const freeB = b.id.includes('free') || b.id.includes('qwen') || b.id.includes('llama') ? -1 : 1;
            return freeA - freeB;
          });
        
        setModels(filtered.map(m => ({ id: m.id, name: m.name || m.id })));

      } else if (provider === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!res.ok) throw new Error('Error en la solicitud');
        const data = await res.json();
        
        setModels(data.models
          .filter(m => m.name && !m.name.includes('embed'))
          .map(m => ({ 
            id: m.name.replace('models/', ''), 
            name: m.displayName || m.name 
          })));

      } else if (provider === 'groq') {
        setModels([
          { id: 'llama-3.3-70b-specdec', name: 'Llama 3.3 70B (Free)' },
          { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B' },
          { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
          { id: 'gemma-2-9b-8192', name: 'Gemma 2 9B' },
        ]);

      } else if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!res.ok) throw new Error('Error en la solicitud');
        const data = await res.json();
        
        setModels(data.data
          .filter(m => m.id.startsWith('gpt-'))
          .map(m => ({ id: m.id, name: m.id })));
      }

      if (models.length === 0) {
        setError('No se encontraron modelos');
      }
    } catch (e) {
      setError(e.message || 'Error al cargar modelos');
    } finally {
      setLoadingModels(false);
    }
  };

  const filteredModels = searchFilter 
    ? models.filter(m => 
        m.name?.toLowerCase().includes(searchFilter.toLowerCase()) || 
        m.id.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : models;

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 mb-6 w-full">
        <img src="/ASSETS/Engranaje.webp" alt="Config" className="w-12 h-12 object-contain drop-shadow-[0_0_12px_rgba(255,202,88,0.5)]" />
        <h3 className="text-sm font-cinzel text-magic-gold uppercase tracking-[0.2em]">
          Configuración de IA
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-3">
          <label className="block text-[10px] text-[#ffca58] mb-1 uppercase font-black tracking-[0.2em] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            Proveedor
          </label>
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-magic-gold/20 rounded-lg 
                       text-[#f4ece0] text-xs focus:border-magic-gold focus:outline-none backdrop-blur-md"
          >
            {PROVIDERS.map(p => (
              <option key={p.id} value={p.id} className="bg-[#1a1612]">
                {p.icon} {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-6">
          <label className="block text-[10px] text-[#ffca58] mb-1 uppercase font-black tracking-[0.2em] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => updateCurrentProvider({ apiKey: e.target.value })}
            placeholder="Introduce tu llave..."
            className="w-full px-3 py-2 bg-white/10 border border-magic-gold/20 rounded-lg 
                       text-[#f4ece0] placeholder-magic-gold/30 text-xs
                       focus:border-magic-gold focus:outline-none backdrop-blur-md"
          />
        </div>

        <div className="md:col-span-3">
          <button
            onClick={fetchModels}
            disabled={loadingModels || !apiKey}
            className="w-full h-[38px] relative overflow-hidden group
                       bg-white/10 backdrop-blur-md border border-white/20 rounded-lg
                       text-[#ffca58] font-cinzel font-bold tracking-widest text-[10px]
                       hover:bg-white/20 transition-all duration-300 disabled:opacity-30"
          >
            <div className="relative flex items-center justify-center gap-2">
              {loadingModels ? (
                <span className="w-3 h-3 border-2 border-[#ffca58]/20 border-t-[#ffca58] rounded-full animate-spin" />
              ) : (
                <span>🔄</span>
              )}
              <span className="uppercase">Cargar</span>
            </div>
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[#ff4d4d] text-xs mt-2 font-bold drop-shadow-[0_0_5px_rgba(255,77,77,0.3)]">⚠️ {error}</p>
      )}

      {models.length > 0 && (
        <div className="mt-3">
          <label className="block text-xs text-[#ffca58]/90 mb-1 uppercase font-bold tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            Modelo Seleccionado
          </label>
          {models.length > 5 && (
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar modelo por nombre..."
              className="w-full px-3 py-2 mb-2 bg-white/10 border border-magic-gold/20 rounded-lg 
                         text-[#f4ece0] placeholder-magic-gold/30 text-sm
                         focus:border-magic-gold focus:outline-none backdrop-blur-md"
            />
          )}
          <select
            value={selectedModel}
            onChange={(e) => updateCurrentProvider({ model: e.target.value })}
            className="w-full px-3 py-2 bg-white/10 border border-magic-gold/20 rounded-lg 
                       text-[#f4ece0] text-sm focus:border-magic-gold focus:outline-none backdrop-blur-md"
          >
            <option value="" className="bg-[#1a1612]">Selecciona un modelo...</option>
            {filteredModels.map(m => (
              <option key={m.id} value={m.id} className="bg-[#1a1612]">
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4 p-4 rounded-lg bg-black/40 border border-magic-gold/10 shadow-inner">
        <label className="block text-[10px] text-[#ffca58] mb-1.5 uppercase font-black tracking-[0.2em] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          🛡️ MODO DE RAREZA (RESTRICCIÓN GLOBAL)
        </label>
        <select
          value={rarityMode}
          onChange={(e) => handleRarityChange(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-magic-gold/20 rounded-lg 
                     text-[#f4ece0] text-xs focus:border-magic-gold focus:outline-none backdrop-blur-md cursor-pointer"
        >
          {RARITY_MODES.map(r => (
            <option key={r.value} value={r.value} className="bg-[#1a1612] text-[#f4ece0]">
              {r.label}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-[#f4ece0]/40 mt-1.5 font-sans leading-relaxed">
          {rarityMode === 'pauper' && "⚠️ Pauper activado: El Oráculo y el Juez de Estado forzarán exclusivamente cartas Comunes. Cualquier carta que infrinja esta rareza será purgada y transmutada en una Isla Básica de seguridad."}
          {rarityMode === 'artisan' && "⚠️ Artisan activado: El Oráculo y el Juez de Estado forzarán exclusivamente cartas Comunes e Infrecuentes. Rarezas superiores serán purgadas y transmutadas."}
          {rarityMode === 'high-power' && "⚡ Poder de Legacy: Acceso total a cartas raras y míticas sin restricción de rareza, manteniendo la balanza de Battle Box."}
          {rarityMode === 'standard' && "⚖️ Estándar: Equilibrio casual equilibrado general."}
        </p>
      </div>
    </div>
  );
}