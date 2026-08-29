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

  getState(): PlanningState {
    return structuredClone(this.state);
  }

  saveState(state: PlanningState): void {
    this.state = structuredClone(state);
  }

  savePreview(preview: EventChangePreview): void {
    this.previews.set(preview.id, structuredClone(preview));
  }

  getPreview(id: string): EventChangePreview | undefined {
    const preview = this.previews.get(id);
    return preview ? structuredClone(preview) : undefined;
  }

  savePreviewStatus(id: string, status: EventChangePreview["status"]): void {
    const preview = this.previews.get(id);
    if (!preview) throw new Error(`Unknown event change preview ${id}`);
    this.previews.set(id, { ...preview, status });
  }
}
