import * as fs from 'fs';

export interface ColorData {
  id: string;
  name: string;
  yearIntroduced: number | null;
  yearLastUsed: number | null;
  companyId: string | null;
  pre1925Id: string[] | null;
  manufacturerId: string;
  manufacturerName: string;
}

export interface Database {
  manufacturers: {
    [key: string]: {
      id: string;
      name: string;
      colors: Array<{
        id: string;
        name: string;
        yearIntroduced?: number;
        yearLastUsed?: number;
        companyId?: string;
        pre1925Id?: string[] | null;
      }>;
    };
  };
  indexes?: {
    byId?: { [key: string]: { manufacturerId: string; colorName: string; companyId?: string | null } };
    byCompanyId?: { [key: string]: string[] };
    byYearIntroduced?: { [key: string]: string[] };
    byManufacturer?: { [key: string]: string[] };
  };
}

export class ColorSearchProvider {
  private database: Database | null = null;
  private colorCache: ColorData[] = [];

  constructor(private dataPath: string) {
    this.loadDatabase();
  }

  private loadDatabase(): void {
    try {
      const content = fs.readFileSync(this.dataPath, 'utf-8');
      this.database = JSON.parse(content);
      this.buildColorCache();
    } catch (error) {
      console.error('Failed to load database:', error);
      this.database = null;
      this.colorCache = [];
    }
  }

  private buildColorCache(): void {
    if (!this.database?.manufacturers) {
      return;
    }

    this.colorCache = [];

    for (const [manufacturerId, manufacturer] of Object.entries(this.database.manufacturers)) {
      if (!manufacturer.colors) {
        continue;
      }

      for (const color of manufacturer.colors) {
        this.colorCache.push({
          id: color.id,
          name: color.name,
          yearIntroduced: color.yearIntroduced ?? null,
          yearLastUsed: color.yearLastUsed ?? null,
          companyId: color.companyId ?? null,
          pre1925Id: color.pre1925Id ?? null,
          manufacturerId: manufacturerId,
          manufacturerName: manufacturer.name
        });
      }
    }
  }

  public search(query: string): ColorData[] {
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      return [];
    }

    // Try exact ID match first (using index if available)
    if (this.database?.indexes?.byId?.[lowerQuery]) {
      const exactMatch = this.colorCache.find(c => c.id.toLowerCase() === lowerQuery);
      if (exactMatch) {
        return [exactMatch];
      }
    }

    // Try company ID lookup (using index if available)
    if (this.database?.indexes?.byCompanyId?.[query]) {
      const companyIdMatches = this.database.indexes.byCompanyId[query]
        .map(id => this.colorCache.find(c => c.id === id))
        .filter((c): c is ColorData => c !== undefined);
      
      if (companyIdMatches.length > 0) {
        return companyIdMatches;
      }
    }

    // Fuzzy search across all fields
    const results = this.colorCache.filter(color => {
      // Match by ID
      if (color.id.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Match by name
      if (color.name.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Match by company ID
      if (color.companyId?.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Match by pre-1925 IDs
      if (color.pre1925Id?.some(id => id.toLowerCase().includes(lowerQuery))) {
        return true;
      }

      // Match by manufacturer name
      if (color.manufacturerName.toLowerCase().includes(lowerQuery)) {
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

  public getById(id: string): ColorData | undefined {
    return this.colorCache.find(c => c.id === id);
  }

  public getByCompanyId(companyId: string): ColorData[] {
    return this.colorCache.filter(c => c.companyId === companyId);
  }

  public getAllColors(): ColorData[] {
    return [...this.colorCache];
  }

  public reload(): void {
    this.loadDatabase();
  }
}
