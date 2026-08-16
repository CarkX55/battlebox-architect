/**
 * STRATEGIC EPISODIC MEMORY (v23.0 Core Memory)
 * 
 * Stores real match outcomes and historical decision episodes.
 * Enables human-like episodic recall: "In Case #4812 with Naya Giants vs Control,
 * 3 removals led to loss; this time increasing to 6 removals."
 */

export class Episode {
  constructor({ episodeId, intent, metaEnvironment, chosenPlan, matchResult, failureReason, episodicLesson }) {
    this.episodeId = episodeId || `EP_${Math.floor(Math.random() * 9000) + 1000}`;
    this.intent = intent;
    this.metaEnvironment = metaEnvironment;
    this.chosenPlan = chosenPlan;
    this.matchResult = matchResult; // e.g. 'WIN_BY_TEMPO', 'LOSS_BY_TEMPO', 'LOSS_BY_WIPE'
    this.failureReason = failureReason;
    this.episodicLesson = episodicLesson;
    this.recordedAt = new Date().toISOString();
    Object.freeze(this);
  }
}

export class StrategicEpisodicMemory {
  constructor() {
    this.episodes = [];
    
    // Seed initial historical match episodes
    this.recordEpisode({
      episodeId: 'EP_4812',
      intent: { archetype: 'Aggro', tribe: 'Giant', colors: ['R', 'W', 'G'] },
      metaEnvironment: 'Control Heavy',
      chosenPlan: 'Plan A: Ramp T1-T2 into Giants T4',
      matchResult: 'LOSS_BY_TEMPO',
      failureReason: 'Densidad insuficiente de remoción barata (3 copias) causó derrota por tempo',
      episodicLesson: 'En Naya Giants vs Control, incrementar la remoción barata Stomp a 6 copias'
    });
  }

  recordEpisode(data) {
    const episode = new Episode(data);
    this.episodes.push(episode);
    return episode;
  }

  recallSimilarEpisodes(intent, metaEnvironment = 'Control Heavy') {
    const matched = this.episodes.filter(ep => {
      const matchTribe = !intent.tribe || ep.intent.tribe === intent.tribe;
      const matchArchetype = !intent.archetype || ep.intent.archetype === intent.archetype;
      return matchTribe || matchArchetype;
    });

    return matched.length > 0 ? matched : this.episodes;
  }
}

export const strategicEpisodicMemory = new StrategicEpisodicMemory();
