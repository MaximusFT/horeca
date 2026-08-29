import { getDemoPlanningRuntime } from "@/application/demo-runtime";

export async function POST(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await context.params;
    const session = await getDemoPlanningRuntime().supplierOrders.applyCart(orderId);
    return Response.json(session);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to apply supplier cart" },
      { status: 409 },
    );
  }
}
