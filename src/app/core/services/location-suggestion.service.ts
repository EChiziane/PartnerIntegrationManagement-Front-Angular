import {Injectable} from '@angular/core';

import {MOZAMBIQUE_LOCATIONS, MozambiqueLocation} from '@shared/data/mozambique-locations';

export interface LocationSuggestion {
  value: string;
  label: string;
  hint: string;
  source: 'base' | 'memory';
}

@Injectable({
  providedIn: 'root'
})
export class LocationSuggestionService {
  private readonly storageKey = 'carload_location_memory_v1';

  search(term: string, limit = 8): LocationSuggestion[] {
    const normalizedTerm = this.normalize(term);
    const base = MOZAMBIQUE_LOCATIONS.map(location => this.toSuggestion(location));
    const memory = this.getMemory().map(value => ({
      value,
      label: value,
      hint: 'Usado anteriormente',
      source: 'memory' as const
    }));

    if (!normalizedTerm) {
      return this.unique([...memory, ...base]).slice(0, limit);
    }

    return this.unique([...memory, ...base])
      .map(suggestion => ({
        suggestion,
        score: this.score(suggestion, normalizedTerm)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.suggestion.label.localeCompare(b.suggestion.label))
      .map(item => item.suggestion)
      .slice(0, limit);
  }

  searchRegions(term: string, limit = 8): LocationSuggestion[] {
    const regions = MOZAMBIQUE_LOCATIONS.flatMap(location => [
      location.province,
      location.district,
      location.administrativePost
    ])
      .filter((value): value is string => !!value)
      .map(value => ({
        value,
        label: value,
        hint: 'Regiao',
        source: 'base' as const
      }));

    const normalizedTerm = this.normalize(term);

    return this.unique(regions)
      .filter(region => !normalizedTerm || this.normalize(region.value).includes(normalizedTerm))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, limit);
  }

  remember(value: string | null | undefined): void {
    const clean = (value || '').toString().trim();
    if (clean.length < 3) return;

    const memory = this.getMemory();
    const exists = memory.some(item => this.normalize(item) === this.normalize(clean));
    const next = exists
      ? [clean, ...memory.filter(item => this.normalize(item) !== this.normalize(clean))]
      : [clean, ...memory];

    this.setMemory(next.slice(0, 40));
  }

  private toSuggestion(location: MozambiqueLocation): LocationSuggestion {
    return {
      value: location.label,
      label: location.label,
      hint: [location.district, location.administrativePost, location.province]
        .filter(Boolean)
        .join(' • '),
      source: 'base'
    };
  }

  private score(suggestion: LocationSuggestion, normalizedTerm: string): number {
    const normalizedLabel = this.normalize(suggestion.label);
    const normalizedHint = this.normalize(suggestion.hint);
    const location = MOZAMBIQUE_LOCATIONS.find(item => item.label === suggestion.value);
    const aliases = location?.aliases || [];

    if (normalizedLabel === normalizedTerm) return 100;
    if (normalizedLabel.startsWith(normalizedTerm)) return 90;
    if (aliases.some(alias => this.normalize(alias).startsWith(normalizedTerm))) return 85;
    if (normalizedLabel.includes(normalizedTerm)) return 75;
    if (aliases.some(alias => this.normalize(alias).includes(normalizedTerm))) return 70;
    if (normalizedHint.includes(normalizedTerm)) return 45;

    return 0;
  }

  private unique(items: LocationSuggestion[]): LocationSuggestion[] {
    const seen = new Set<string>();

    return items.filter(item => {
      const key = this.normalize(item.value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private getMemory(): string[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private setMemory(values: string[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(values));
    } catch {
      // Mantem o autocomplete funcional com a lista estatica quando o storage nao esta disponivel.
    }
  }

  private normalize(value: string): string {
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
}
