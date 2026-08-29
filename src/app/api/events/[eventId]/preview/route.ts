import { z } from "zod";
import { getDemoPlanningRuntime } from "@/application/demo-runtime";
import { toEventChangePreviewDto } from "@/application/event-change-dto";

const requestSchema = z.object({ guestCount: z.number().int().nonnegative() });

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await context.params;
    const body = requestSchema.parse(await request.json());
    const preview = getDemoPlanningRuntime().service.previewEventChange(eventId, body.guestCount);
    return Response.json(toEventChangePreviewDto(preview));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to preview event change" },
      { status: 400 },
    );
  }
}
