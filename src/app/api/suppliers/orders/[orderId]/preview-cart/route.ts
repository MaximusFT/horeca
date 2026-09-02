import { getServerLocale } from '@/i18n';
import { getSupplierRequestRuntime } from '../../../request-runtime';

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
	try {
		const { orderId } = await context.params;
		const locale = await getServerLocale();
		const session = await (await getSupplierRequestRuntime(request)).supplierOrders.previewCart(orderId, locale);
		return Response.json(session);
	} catch (error) {
		return Response.json(
			{ error: error instanceof Error ? error.message : 'Unable to preview supplier cart' },
			{ status: 409 },
		);
	}
}
