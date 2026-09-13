import type { Client } from '@libsql/client';
import type {
  EventChangePreview,
  PlanningRepository,
  PlanningState,
} from '@/application/planning-repository';

const STATE_ID = 'demo';

export class TursoPlanningRepository implements PlanningRepository {
  private schemaReady?: Promise<void>;

  constructor(
    private readonly client: Client,
    private readonly initialState: PlanningState,
  ) {}

  async getState(): Promise<PlanningState> {
    await this.ensureSchema();
    const result = await this.client.execute({
      sql: 'SELECT state_json FROM demo_planning_state WHERE id = ?',
      args: [STATE_ID],
    });
    const value = result.rows[0]?.state_json;
    if (typeof value !== 'string') throw new Error('Demo planning state is unavailable');
    return JSON.parse(value) as PlanningState;
  }

  async saveState(state: PlanningState): Promise<void> {
    await this.ensureSchema();
    await this.client.execute({
      sql: 'UPDATE demo_planning_state SET state_json = ?, updated_at = ? WHERE id = ?',
      args: [JSON.stringify(state), new Date().toISOString(), STATE_ID],
    });
  }

  async savePreview(preview: EventChangePreview): Promise<void> {
    await this.ensureSchema();
    await this.client.execute({
      sql: `
        INSERT INTO event_change_previews (id, status, preview_json, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          preview_json = excluded.preview_json,
          updated_at = excluded.updated_at
      `,
      args: [preview.id, preview.status, JSON.stringify(preview), new Date().toISOString()],
    });
  }

  async getPreview(id: string): Promise<EventChangePreview | undefined> {
    await this.ensureSchema();
    const result = await this.client.execute({
      sql: 'SELECT status, preview_json FROM event_change_previews WHERE id = ?',
      args: [id],
    });
    const row = result.rows[0];
    if (typeof row?.preview_json !== 'string' || typeof row.status !== 'string') return undefined;
    return { ...(JSON.parse(row.preview_json) as EventChangePreview), status: row.status as EventChangePreview['status'] };
  }

  async savePreviewStatus(id: string, status: EventChangePreview['status']): Promise<void> {
    await this.ensureSchema();
    const result = await this.client.execute({
      sql: 'UPDATE event_change_previews SET status = ?, updated_at = ? WHERE id = ?',
      args: [status, new Date().toISOString(), id],
    });
    if (result.rowsAffected !== 1) throw new Error(`Unknown event change preview ${id}`);
  }

  async reset(state: PlanningState): Promise<void> {
    await this.ensureSchema();
    await this.client.batch(
      [
        {
          sql: 'UPDATE demo_planning_state SET state_json = ?, updated_at = ? WHERE id = ?',
          args: [JSON.stringify(state), new Date().toISOString(), STATE_ID],
        },
        'DELETE FROM event_change_previews',
      ],
      'write',
    );
  }

  private async ensureSchema(): Promise<void> {
    this.schemaReady ??= this.client
      .batch(
        [
          `
            CREATE TABLE IF NOT EXISTS demo_planning_state (
              id TEXT PRIMARY KEY,
              state_json TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `,
          `
            CREATE TABLE IF NOT EXISTS event_change_previews (
              id TEXT PRIMARY KEY,
              status TEXT NOT NULL,
              preview_json TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )
          `,
          {
            sql: `
              INSERT OR IGNORE INTO demo_planning_state (id, state_json, updated_at)
              VALUES (?, ?, ?)
            `,
            args: [STATE_ID, JSON.stringify(this.initialState), new Date().toISOString()],
          },
        ],
        'write',
      )
      .then(() => undefined);
    await this.schemaReady;
  }
}