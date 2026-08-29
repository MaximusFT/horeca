import { resetDemoPlanningRuntime } from '@/application/demo-runtime';

export async function POST() {
  try {
    resetDemoPlanningRuntime();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to reset the demo' },
      { status: 500 },
    );
  }
}
