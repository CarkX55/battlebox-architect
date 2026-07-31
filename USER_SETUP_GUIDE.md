# Guía Paso a Paso para la Configuración del Conocimiento (USER_SETUP_GUIDE.md)

Esta guía te explicará detalladamente los pasos a seguir para conectar las fuentes de datos reales e hidratar la base de conocimiento SQLite (`knowledge.db`) del **Strategic Knowledge Engine (SKE v8.0)** y del **Strategic Reasoning Engine (SRE v9.0)**.

---

## 📋 Paso 1: Descargar los Archivos ZIP de MTGJSON

Accede a la web oficial de [MTGJSON Downloads](https://mtgjson.com/downloads/all-files/) y descarga los siguientes 3 archivos JSON/ZIP:

1. `AllPrintings.json.zip`
2. `AtomicCards.json.zip`
3. `CardIdentifiers.json.zip`

---

## 📁 Paso 2: Ubicación de Copia de Archivos

Descomprime los archivos anteriores y cópialos en la carpeta `data/mtgjson/` dentro del proyecto:

```text
PROYECTODATABASE/
└── data/
    └── mtgjson/
        ├── AllPrintings.json
        ├── AtomicCards.json
        └── CardIdentifiers.json
```

---

## 🔑 Paso 3: Crear Cuenta en Apify

1. Ve a [https://apify.com](https://apify.com) y crea una cuenta gratuita.
2. Inicia sesión en tu panel de control de Apify.

---

## 🔑 Paso 4: Generar API Token en Apify

1. En Apify, dirígete a **Settings ➔ API Tokens**.
2. Haz clic en **Generate New Token** y copia tu token personal (ej. `apify_api_XXXXXX`).

---

## ⚙️ Paso 5: Pegar el Token en `.env`

Abre el archivo `.env` en la raíz de tu proyecto y pega tu token en la variable `APIFY_TOKEN`:

```env
SCRYFALL_BASE=https://api.scryfall.com
APIFY_TOKEN=apify_api_tu_token_aqui
MTGTOP8_URL=https://www.mtgtop8.com
SPICERACK_URL=https://spicerack.gg
DATABASE_PATH=data/knowledge/knowledge.db
CACHE_PATH=data/cache/
```

---

## 🌐 Paso 6: Configuración de Servicios Adicionales

Asegúrate de que tu conexión a Internet permita acceder libremente a:
- Scryfall API (`https://api.scryfall.com`)
- MTGTop8 (`https://www.mtgtop8.com`)
- SpiceRack (`https://spicerack.gg`)

---

## 🚀 Paso 7: Ejecutar "Actualizar Conocimiento"

1. Inicia la aplicación web (`npm run dev`).
2. Ve al **Panel de Admin** en la interfaz.
3. Haz clic en la pestaña **"Conocimiento SKE"**.
4. Pulsa el botón dorado **"Actualizar Conocimiento"**.

---

## ⏳ Paso 8: Esperar la Ingestión y Fusión

El pipeline automático `KnowledgeUpdatePipeline` ejecutará en segundo plano las siguientes fases:
1. **Sync**: Recopilación desde todos los plugins (MTGJSON, Scryfall, EDHREC, MTGTop8, SpiceRack, Simulador).
2. **Fuse**: Resolución de conflictos multifuente y cálculo de confianza dinámica.
3. **Validate**: Verificación de reglas y frescura de datos.
4. **Store**: Guardado persistente en SQLite `data/knowledge/knowledge.db`.
5. **Reindex**: Construcción de índices rápidos por carta, motor, capacidad y conceptos.

---

## ✅ Paso 9: Verificación Automática del Sistema

Una vez finalizado, el sistema verificará automáticamente el estado de todos los componentes:

```text
✓ MTGJSON Provider (Static Facts)
✓ Scryfall Provider (Primary Capabilities & Oracle)
✓ EDHREC Provider (Co-occurrence & Synergy Networks)
✓ MTGTop8 Provider (Competitive Metagame Decks)
✓ SpiceRack Provider (Archetypes & Ratios)
✓ Knowledge DB (SQLite persistent engine)
✓ Causal Knowledge Graph (Layer 6 Concepts & Causal Edges)
✓ Strategic Reasoning Engine (SRE Inferences & Trade-Offs)
```

---

## 📊 Paso 10: Resumen de Conocimiento Cargado

El panel de la interfaz mostrará la tarjeta de confirmación con los objetos procesados:

```text
Knowledge actualizado correctamente
----------------------------------------
Cartas: Sincronizadas
Capacidades: 5 Motores Fundamentales
Motores: Ramp, Midrange, Control, Reanimator
Conceptos: Tempo, Initiative, Inevitability, VirtualCardAdvantage
Meta: Patrones de Metajuego Standard/Modern
Experiencias: Traza Empírica de Simulaciones Integrada
```
