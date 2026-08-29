import { getDemoPlanningRuntime } from "@/application/demo-runtime";
import { getServerLocale } from "@/i18n";

export async function POST(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await context.params;
    const locale = await getServerLocale();
    const session = await getDemoPlanningRuntime().supplierOrders.previewCart(orderId, locale);
    return Response.json(session);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to preview supplier cart" },
      { status: 409 },
    );
  }
}
