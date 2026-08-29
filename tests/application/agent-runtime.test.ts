import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRuntime } from "@/application/agent-runtime";
import { MemoryAgentApprovalRepository } from "@/application/agent-approval-repository";
import { AgentToolService, agentToolDefinitions } from "@/application/agent-tools";
import { createDemoPlanning } from "@/application/demo-planning";
import { LocalAgentModel } from "@/application/local-agent-model";
import { demoIngredients } from "@/data/demo/ingredients";
import { OpenAIResponsesAgentModel } from "@/infrastructure/openai-responses-agent-model";

describe("single procurement agent", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("stores a Wedding 220 preview backend-side and cannot mutate before human approval", async () => {
    const { planning, tools, agent } = createAgent();
    const turn = await agent.run("Increase Wedding to 220 guests");

    expect(turn.mode).toBe("local");
    expect(turn.trace.map((item) => item.name)).toEqual(["get_event", "preview_event_change"]);
    expect(turn.approval?.status).toBe("pending");
    expect(turn.approval?.preview.afterGuestCount).toBe(220);
    expect(planning.repository.getState().events.find((event) => event.id === "wedding")?.guestCount).toBe(180);
    expect(planning.repository.getState().activePlan.version).toBe(1);

    await expect(tools.execute("apply_event_change", { approvalId: turn.approval!.id }))
      .rejects.toThrow(/Mutation blocked/);
    expect(planning.repository.getState().activePlan.version).toBe(1);
  });

  it("applies the stored candidate only through the explicit approval endpoint use case", async () => {
    const { planning, agent } = createAgent();
    const turn = await agent.run("Increase Wedding to 220 guests");
    const result = await agent.approveAndApply(turn.approval!.id);

    expect(result.approval.status).toBe("applied");
    expect(result.trace.name).toBe("apply_event_change");
    expect(result.trace.group).toBe("MUTATE");
    expect(planning.repository.getState().events.find((event) => event.id === "wedding")?.guestCount).toBe(220);
    expect(planning.repository.getState().activePlan.version).toBe(2);
    await expect(agent.approveAndApply(turn.approval!.id)).rejects.toThrow(/already applied/);
  });

  it("explains chicken only from deterministic provenance", async () => {
    const { planning, agent } = createAgent();
    const before = planning.repository.getState();
    const turn = await agent.run("Why do we need so much chicken?");

    expect(turn.trace.map((item) => item.name)).toEqual(["explain_requirement"]);
    expect(turn.message).toContain("Chicken breast");
    expect(turn.message).toContain("gross covered demand");
    expect(turn.approval).toBeUndefined();
    expect(planning.repository.getState()).toEqual(before);
  });

  it("exposes exactly the five Stage 8 application tools with strict schemas", () => {
    expect(agentToolDefinitions.map((tool) => tool.name)).toEqual([
      "get_event",
      "get_procurement_plan",
      "explain_requirement",
      "preview_event_change",
      "apply_event_change",
    ]);
    expect(agentToolDefinitions.every((tool) => tool.parameters.additionalProperties === false)).toBe(true);
  });

  it("runs a Responses API function-call loop through the same guarded tool service", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "resp-1",
        output: [{ type: "function_call", call_id: "call-1", name: "get_event", arguments: "{\"eventId\":\"wedding\"}" }],
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "resp-2",
        output_text: "Wedding currently has 180 guests.",
        output: [],
      }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const planning = createDemoPlanning(undefined, idSequence());
    const tools = createTools(planning);
    const agent = new AgentRuntime(new OpenAIResponsesAgentModel("test-key", "gpt-5.4-mini"), tools, idSequence());

    const turn = await agent.run("How many guests are at the Wedding?");
    expect(turn.mode).toBe("openai");
    expect(turn.message).toBe("Wedding currently has 180 guests.");
    expect(turn.trace.map((item) => item.name)).toEqual(["get_event"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(firstBody.parallel_tool_calls).toBe(false);
    expect(firstBody.reasoning).toEqual({ effort: "low" });
    expect(firstBody.tools).toHaveLength(5);
    expect(secondBody.previous_response_id).toBe("resp-1");
    expect(secondBody.input[0]).toEqual(expect.objectContaining({ type: "function_call_output", call_id: "call-1" }));
  });
});

function createAgent() {
  const ids = idSequence();
  const planning = createDemoPlanning(undefined, ids);
  const tools = createTools(planning, ids);
  const agent = new AgentRuntime(new LocalAgentModel(demoIngredients), tools, ids);
  return { planning, tools, agent };
}

function createTools(planning: ReturnType<typeof createDemoPlanning>, generateId = idSequence()) {
  return new AgentToolService({
    repository: planning.repository,
    planningService: planning.service,
    approvals: new MemoryAgentApprovalRepository(),
    ingredients: demoIngredients,
    clock: planning.clock,
    generateId,
  });
}

function idSequence(): () => string {
  let value = 0;
  return () => `agent-test-id-${++value}`;
}
