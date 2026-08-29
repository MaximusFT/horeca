import { getDemoPlanningRuntime } from "@/application/demo-runtime";

export async function POST(_request: Request, context: { params: Promise<{ batchId: string }> }) {
  try {
    const { batchId } = await context.params;
    const session = await getDemoPlanningRuntime().supplierOrders.prepareBatch(batchId);
    return Response.json(session);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to prepare supplier order" },
      { status: 400 },
    );
  }
}
