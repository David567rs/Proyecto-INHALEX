import type { OrderAttemptStore, SavedOrderAttempt } from '../../presentation/viewModels/OrdersController';

export interface AttemptStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

type Manifest = { revision: string; count: number };

/** Commit the manifest last: an interrupted save must keep the previous recoverable attempt. */
export class ChunkedOrderAttemptStore implements OrderAttemptStore {
  private readonly prefix: string;
  constructor(userId: string, private readonly storage: AttemptStorage, private readonly createRevision: () => string) {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(userId)) throw new Error('Invalid order owner');
    this.prefix = `inhalex.order.${userId}`;
  }

  async load(): Promise<SavedOrderAttempt | null> {
    const manifest = await this.readManifest();
    if (!manifest) return null;
    const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, i) => this.storage.get(this.partKey(manifest, i))));
    if (chunks.some(chunk => chunk === null)) throw new Error('Incomplete saved order');
    // The controller validates the recovered payload before allowing a replay.
    return JSON.parse(chunks.join('')) as SavedOrderAttempt;
  }

  async save(attempt: SavedOrderAttempt): Promise<void> {
    const previous = await this.readManifest();
    // Preserve surrogate pairs; at most 450 code points keeps every UTF-8 value
    // within 1800 bytes while avoiding invalid halves at SecureStore boundaries.
    const text = Array.from(JSON.stringify(attempt));
    const count = Math.ceil(text.length / 450);
    if (count < 1 || count > 1000) throw new Error('Saved order exceeds storage limit');
    const manifest = { revision: this.createRevision(), count };
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(manifest.revision)) throw new Error('Invalid order revision');
    for (let i = 0; i < count; i += 1) await this.storage.set(this.partKey(manifest, i), text.slice(i * 450, (i + 1) * 450).join(''));
    await this.storage.set(this.prefix, JSON.stringify(manifest));
    if (previous) await this.removeParts(previous);
  }

  async clear(): Promise<void> {
    const previous = await this.readManifest();
    await this.storage.remove(this.prefix);
    if (previous) await this.removeParts(previous);
  }

  private async readManifest(): Promise<Manifest | null> {
    const text = await this.storage.get(this.prefix);
    if (text === null) return null;
    const value = JSON.parse(text) as Manifest;
    if (!value || !/^[a-zA-Z0-9_-]{1,100}$/.test(value.revision) || !Number.isInteger(value.count) || value.count < 1 || value.count > 1000) {
      throw new Error('Invalid saved order manifest');
    }
    return value;
  }

  private partKey(manifest: Manifest, index: number): string { return `${this.prefix}.${manifest.revision}.${index}`; }

  private async removeParts(manifest: Manifest): Promise<void> {
    // A failed orphan cleanup must not invalidate the newly committed manifest.
    await Promise.allSettled(Array.from({ length: manifest.count }, (_, i) => this.storage.remove(this.partKey(manifest, i))));
  }
}
