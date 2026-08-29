import { getDemoPlanningRuntime } from "@/application/demo-runtime";

export async function POST(_request: Request, context: { params: Promise<{ approvalId: string }> }) {
  try {
    const { approvalId } = await context.params;
    const result = await getDemoPlanningRuntime().agent.approveAndApply(approvalId);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to apply approved agent action" },
      { status: 409 },
    );
  }
}
