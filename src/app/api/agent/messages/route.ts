import { z } from "zod";
import { getDemoPlanningRuntime } from "@/application/demo-runtime";

const requestSchema = z.object({ message: z.string().trim().min(1).max(2_000) });

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const turn = await getDemoPlanningRuntime().agent.run(body.message);
    return Response.json(turn);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to run procurement agent" },
      { status: 400 },
    );
  }
}
