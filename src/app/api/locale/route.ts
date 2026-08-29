import { z } from 'zod';
import { LOCALE_COOKIE } from '@/i18n';

const bodySchema = z.object({ locale: z.enum(['uk', 'en']) });

export async function POST(request: Request) {
  try {
    const { locale } = bodySchema.parse(await request.json());
    const response = Response.json({ ok: true, locale });
    response.headers.append('set-cookie', `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`);
    return response;
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to set locale' }, { status: 400 });
  }
}
