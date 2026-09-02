import { getServerLocale } from '@/i18n';
import { getSupplierRequestRuntime } from '../../../request-runtime';

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
	const origin = request.headers.get('origin');
	if (!origin || origin !== new URL(request.url).origin) {
		return Response.json({ error: 'Cart approval requires a same-origin request' }, { status: 403 });
	}
	try {
		const { orderId } = await context.params;
		const locale = await getServerLocale();
		const session = await (await getSupplierRequestRuntime(request)).supplierOrders.applyCart(orderId, locale);
		return Response.json(session);
	} catch (error) {
		return Response.json(
			{ error: error instanceof Error ? error.message : 'Unable to apply supplier cart' },
			{ status: 409 },
		);
	}
}
