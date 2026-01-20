import * as fs from 'fs';

export interface LureData {
  name: string;
  number: number | string;
  yearIntroduced?: number;
  yearLastMfg?: number;
  colors?: string[];
  rare_colors?: string[];
  pre1925codes?: Array<{ [colorId: string]: number }>;
  notes?: string;
  manufacturerId: string;
  manufacturerName: string;
}

export interface LureDatabase {
  manufacturers: {
    [key: string]: {
      id: string;
      name: string;
      lures?: Array<{
        name: string;
        number: number | string;
        yearIntroduced?: number;
        yearLastMfg?: number;
        length?: string;
        weight?: string;
        eyes?: string;
        colors?: string[];
        rare_colors?: string[];
        pre1925codes?: Array<{ [colorId: string]: number }>;
        notes?: string;
      }>;
    };
  };
}

export class LureSearchProvider {
  private database: LureDatabase | null = null;
  private lureCache: LureData[] = [];

  constructor(private dataPath: string) {
    this.loadDatabase();
  }

  private loadDatabase(): void {
    try {
      const content = fs.readFileSync(this.dataPath, 'utf-8');
      this.database = JSON.parse(content);
      this.buildLureCache();
    } catch (error) {
      console.error('Failed to load lure database:', error);
      this.database = null;
      this.lureCache = [];
    }
  }

  private buildLureCache(): void {
    if (!this.database?.manufacturers) {
      return;
    }

    this.lureCache = [];

    for (const [manufacturerId, manufacturer] of Object.entries(this.database.manufacturers)) {
      if (!manufacturer.lures || manufacturer.lures.length === 0) {
        continue;
      }

      for (const lure of manufacturer.lures) {
        this.lureCache.push({
          name: lure.name,
          number: lure.number,
          yearIntroduced: lure.yearIntroduced,
          yearLastMfg: lure.yearLastMfg,
          colors: lure.colors,
          rare_colors: lure.rare_colors,
          pre1925codes: (lure as any).pre1925codes,
          notes: lure.notes,
          manufacturerId: manufacturerId,
          manufacturerName: manufacturer.name
        });
      }
    }
  }

  public search(query: string): LureData[] {
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      return [];
    }

    // Try exact number match first
    const numberMatch = this.lureCache.filter(l => l.number.toString() === query);
    if (numberMatch.length > 0) {
      return numberMatch;
    }

    // Fuzzy search across all fields
    const results = this.lureCache.filter(lure => {
      // Match by name
      if (lure.name.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Match by number
      if (lure.number.toString().includes(query)) {
        return true;
      }

      // Match by manufacturer name
      if (lure.manufacturerName.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      return false;
    });

    // Sort results: exact name matches first, then by name
    return results.sort((a, b) => {
      const aExactName = a.name.toLowerCase() === lowerQuery;
      const bExactName = b.name.toLowerCase() === lowerQuery;

      if (aExactName && !bExactName) {
        return -1;
      }
      if (!aExactName && bExactName) {
        return 1;
      }

      const aStartsWith = a.name.toLowerCase().startsWith(lowerQuery);
      const bStartsWith = b.name.toLowerCase().startsWith(lowerQuery);

      if (aStartsWith && !bStartsWith) {
        return -1;
      }
      if (!aStartsWith && bStartsWith) {
        return 1;
      }

      return a.name.localeCompare(b.name);
    });
  }

  public getByName(name: string): LureData | undefined {
    return this.lureCache.find(l => l.name.toLowerCase() === name.toLowerCase());
  }

  public getByNumber(number: number | string): LureData[] {
    return this.lureCache.filter(l => l.number.toString() === number.toString());
  }

  public getAllLures(): LureData[] {
    return [...this.lureCache];
  }

  public reload(): void {
    this.loadDatabase();
  }
}
