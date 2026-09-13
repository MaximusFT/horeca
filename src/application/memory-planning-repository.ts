import type {
  EventChangePreview,
  PlanningRepository,
  PlanningState,
} from "./planning-repository";

export class MemoryPlanningRepository implements PlanningRepository {
  private state: PlanningState;
  private readonly previews = new Map<string, EventChangePreview>();

  constructor(initialState: PlanningState) {
    this.state = structuredClone(initialState);
  }

  async getState(): Promise<PlanningState> {
    return structuredClone(this.state);
  }

  async saveState(state: PlanningState): Promise<void> {
    this.state = structuredClone(state);
  }

  async savePreview(preview: EventChangePreview): Promise<void> {
    this.previews.set(preview.id, structuredClone(preview));
  }

  async getPreview(id: string): Promise<EventChangePreview | undefined> {
    const preview = this.previews.get(id);
    return preview ? structuredClone(preview) : undefined;
  }

  async savePreviewStatus(id: string, status: EventChangePreview["status"]): Promise<void> {
    const preview = this.previews.get(id);
    if (!preview) throw new Error(`Unknown event change preview ${id}`);
    this.previews.set(id, { ...preview, status });
  }

  async reset(state: PlanningState): Promise<void> {
    this.state = structuredClone(state);
    this.previews.clear();
  }
}
