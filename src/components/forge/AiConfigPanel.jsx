import { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';

const PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', icon: '🌐', baseUrl: 'https://openrouter.ai/api/v1' },
  { id: 'gemini', name: 'Gemini (Google)', icon: '🔷', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  { id: 'groq', name: 'Groq', icon: '⚡', baseUrl: 'https://api.groq.com/openai/v1' },
  { id: 'openai', name: 'OpenAI', icon: '🧠', baseUrl: 'https://api.openai.com/v1' },
];

const DEFAULT_STORAGE_KEY = 'mtg_forge_ai_config';

export default function AiConfigPanel({ onConfigReady, storageKey = DEFAULT_STORAGE_KEY }) {
  const [provider, setProvider] = useState('openrouter');
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [error, setError] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  
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
      } catch (e) {}
    }
  }, [storageKey]);

  // Guardar en localStorage y notificar al padre
  const persist = (newProvider, newKeys) => {
    const providerInfo = PROVIDERS.find(p => p.id === newProvider);
    const config = {
      provider: newProvider,
      apiKey: newKeys[newProvider]?.apiKey || '',
      selectedModel: newKeys[newProvider]?.model || '',
      baseUrl: providerInfo?.baseUrl,
      keys: newKeys
    };
    localStorage.setItem(storageKey, JSON.stringify(config));
    
    if (config.apiKey && config.selectedModel) {
      onConfigReady?.(config);
    }
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
        <span className="text-lg">⚙️</span>
        <h3 className="text-sm font-cinzel text-[#ffca58] uppercase tracking-[0.2em] drop-shadow-[0_0_12px_rgba(255,202,88,0.6)]">
          Configuración de IA
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-[#ffca58]/90 mb-1 uppercase font-bold tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            Proveedor
          </label>
          <select
            value={provider}
            onChange={(e) => {
              handleProviderChange(e.target.value);
            }}
            className="w-full px-3 py-2 bg-black/40 border border-magic-gold/20 rounded-lg 
                       text-[#f4ece0] text-sm focus:border-magic-gold focus:outline-none"
          >
            {PROVIDERS.map(p => (
              <option key={p.id} value={p.id} className="bg-[#1a1612]">
                {p.icon} {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs text-[#ffca58]/90 mb-1 uppercase font-bold tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => updateCurrentProvider({ apiKey: e.target.value })}
            placeholder={provider === 'gemini' ? 'Google AI API Key...' : `${PROVIDERS.find(p => p.id === provider)?.name} API Key...`}
            className="w-full px-3 py-2 bg-black/40 border border-magic-gold/20 rounded-lg 
                       text-[#f4ece0] placeholder-magic-gold/30 text-sm
                       focus:border-magic-gold focus:outline-none"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={fetchModels}
            disabled={loadingModels || !apiKey}
            className="w-full px-4 py-2 btn-stone-secondary flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {loadingModels ? (
              <span className="w-4 h-4 border border-[#ffca58]/30 border-t-[#ffca58] rounded-full animate-spin" />
            ) : (
              <span>🔄</span>
            )}
            <span className="hidden md:inline">Cargar</span>
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[#701b1b] text-xs mt-2">{error}</p>
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
              className="w-full px-3 py-2 mb-2 bg-[#1a1612] border border-grimorio-gold/30 rounded-lg 
                         text-grimorio-parchment placeholder-grimorio-gold/30 text-sm
                         focus:border-grimorio-gold focus:outline-none"
            />
          )}
          <select
            value={selectedModel}
            onChange={(e) => updateCurrentProvider({ model: e.target.value })}
            className="w-full px-3 py-2 bg-black/40 border border-magic-gold/20 rounded-lg 
                       text-[#f4ece0] text-sm focus:border-magic-gold focus:outline-none"
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
    </div>
  );
}