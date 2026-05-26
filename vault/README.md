# 🌌 Bienvenidos a la Bóveda de Sinergias - BattleBox Architect

Esta carpeta contiene la base de conocimiento de grafos de Magic: The Gathering para **BattleBox Architect**, alimentada automáticamente en tiempo real por el scraper de **MTGTop8 (Apify)** y las etiquetas mecánicas de **Scryfall Tagger**.

## 📂 Estructura del Vault

- **`Cartas/`**: Contiene fichas individuales de cada carta (`.md`) con su coste de maná, tipo, texto oracle y una sección Frontmatter YAML que detalla la fuerza de sinergia (coocurrencia) con otras cartas en base a torneos reales.
- **`Mazos/`**: Registros de listas de mazos reales de torneos que han hecho Top 8 en eventos competitivos.
- **`Arquetipos/`**: Las directrices de arquetipos competitivos (ej: *Amulet Titan*, *Golgari Yawgmoth*), sus porcentajes de composición de amenazas/respuestas y fuentes de maná óptimas.
- **`Etiquetas/`**: Roles mecánicos abstractos (ej: *[[tag:sacrifice-outlet]]*, *[[tag:reanimator-payoff]]*) que conectan cartas casuales para evitar que la IA pierda poder en estrategias no competitivas.

---

## 🎨 Cómo Visualizar el Grafo Interactivo en 3D

1. Instala **Obsidian.md** en tu PC o móvil.
2. Abre Obsidian y selecciona la opción **"Open folder as vault"** (Abrir carpeta como bóveda).
3. Selecciona esta misma carpeta (`vault/`).
4. Presiona el atajo `Ctrl + G` (o haz clic en el icono del grafo en la barra lateral izquierda).
5. **¡Disfruta viendo la red tridimensional de sinergias competitivas conectadas entre sí!**
