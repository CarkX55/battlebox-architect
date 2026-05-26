/**
 * Generates an Obsidian Markdown string for a Magic: The Gathering deck,
 * formatted with YAML frontmatter compatible with the Dataview plugin.
 */
export function generateObsidianMarkdown(deckData) {
  const {
    name = "Sin Título",
    archetype = "unknown",
    format = "Modern",
    strategy = "General",
    colors = [],
    cards = [],
    sideboard = []
  } = deckData;

  const dateStr = new Date().toISOString().split('T')[0];
  const colorString = colors.length > 0 ? `[${colors.join(', ')}]` : "[]";

  const totalCards = cards.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const totalSideboard = sideboard.reduce((sum, c) => sum + (c.quantity || 1), 0);

  let markdown = `---
type: mtg-deck
date: ${dateStr}
name: "${name.replace(/"/g, '\\"')}"
format: ${format}
archetype: ${archetype}
strategy: ${strategy}
colors: ${colorString}
total_main: ${totalCards}
total_sideboard: ${totalSideboard}
winrate: 0
matches_played: 0
tier: "Pending"
---

# ${name}

## 📋 Resumen del Mazo
**Arquetipo:** ${archetype}
**Estrategia:** ${strategy}
**Formato:** ${format}
**Colores:** ${colors.join(', ')}

## 🃏 Main Deck (${totalCards})

`;

  // Sort cards by category
  const categories = {
    "Creature": [],
    "Planeswalker": [],
    "Instant": [],
    "Sorcery": [],
    "Artifact": [],
    "Enchantment": [],
    "Land": []
  };

  cards.forEach(card => {
    const cat = card.category || "Creature";
    if (categories[cat]) {
      categories[cat].push(card);
    } else {
      categories["Creature"].push(card);
    }
  });

  for (const [catName, catCards] of Object.entries(categories)) {
    if (catCards.length > 0) {
      const catCount = catCards.reduce((sum, c) => sum + (c.quantity || 1), 0);
      markdown += `### ${catName} (${catCount})\n`;
      catCards.forEach(card => {
        markdown += `- ${card.quantity}x [[${card.name}]]\n`;
      });
      markdown += `\n`;
    }
  }

  markdown += `## 🛡️ Sideboard (${totalSideboard})\n\n`;
  if (sideboard && sideboard.length > 0) {
    sideboard.forEach(card => {
      markdown += `- ${card.quantity}x [[${card.name}]]\n`;
    });
  } else {
    markdown += `*Sideboard no generado o vacío.*\n`;
  }

  markdown += `\n## 📝 Notas de Partida\n\n`;
  markdown += `- *Añade tus notas de enfrentamientos (matchups) aquí.*\n`;

  return markdown;
}

/**
 * Triggers a download of the Obsidian markdown file.
 */
export function downloadObsidianFile(deckData) {
  const markdown = generateObsidianMarkdown(deckData);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `${deckData.name || 'Mazo_MTG'}_${new Date().toISOString().split('T')[0]}.md`.replace(/\s+/g, '_');
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
