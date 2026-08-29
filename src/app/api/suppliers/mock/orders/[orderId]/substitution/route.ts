import { z } from "zod";
import { getDemoPlanningRuntime } from "@/application/demo-runtime";

const requestSchema = z.object({ ingredientId: z.string().min(1), productId: z.string().min(1) });

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await context.params;
    const body = requestSchema.parse(await request.json());
    const session = await getDemoPlanningRuntime().supplierOrders.approveSubstitution(
      orderId,
      body.ingredientId,
      body.productId,
    );
    return Response.json(session);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to approve substitution" },
      { status: 409 },
    );
  }
}
