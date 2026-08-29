import { getDemoPlanningRuntime } from "@/application/demo-runtime";

export async function POST(_request: Request, context: { params: Promise<{ previewId: string }> }) {
  try {
    const { previewId } = await context.params;
    const result = getDemoPlanningRuntime().service.applyEventChange(previewId);
    return Response.json({
      event: result.event,
      planVersion: result.plan.version,
      diff: result.diff,
      change: result.change,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to apply event change" },
      { status: 409 },
    );
  }
}
