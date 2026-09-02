import { z } from 'zod';
import { getServerLocale } from '@/i18n';
import { getSupplierRequestRuntime } from '../../../request-runtime';

const requestSchema = z.object({ ingredientId: z.string().min(1), productId: z.string().min(1) });

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
	try {
		const { orderId } = await context.params;
		const body = requestSchema.parse(await request.json());
		const locale = await getServerLocale();
		const session = await (await getSupplierRequestRuntime(request)).supplierOrders.approveSubstitution(
			orderId,
			body.ingredientId,
			body.productId,
			locale,
		);
		return Response.json(session);
	} catch (error) {
		return Response.json(
			{ error: error instanceof Error ? error.message : 'Unable to approve substitution' },
			{ status: 409 },
		);
	}
}
