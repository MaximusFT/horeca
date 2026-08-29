import { createDemoPlanning } from './demo-planning';
import { MockSupplierOrderService } from './mock-supplier-order-service';
import { createSupplierGateway } from '@/infrastructure/supplier-runtime';
import { demoIngredients } from '@/data/demo/ingredients';
import { preferredMockProductByIngredient } from '@/data/demo/mock-supplier-catalog';
import { MemoryAgentApprovalRepository } from './agent-approval-repository';
import { AgentToolService } from './agent-tools';
import { AgentRuntime } from './agent-runtime';
import { LocalAgentModel } from './local-agent-model';
import { OpenAIResponsesAgentModel } from '@/infrastructure/openai-responses-agent-model';

function createDemoRuntime() {
  const planning = createDemoPlanning();
  const supplierGateway = createSupplierGateway();
  const supplierOrders = new MockSupplierOrderService({
    repository: planning.repository,
    gateway: supplierGateway,
    ingredients: demoIngredients,
    preferredProductByIngredient: preferredMockProductByIngredient,
  });
  const approvals = new MemoryAgentApprovalRepository();
  const agentTools = new AgentToolService({
    repository: planning.repository,
    planningService: planning.service,
    approvals,
    ingredients: demoIngredients,
    clock: planning.clock,
  });
  const agentModel =
    process.env.AGENT_MODE === 'openai' && process.env.OPENAI_API_KEY
      ? new OpenAIResponsesAgentModel(process.env.OPENAI_API_KEY)
      : new LocalAgentModel(demoIngredients);
  const agent = new AgentRuntime(agentModel, agentTools);
  return { ...planning, supplierGateway, supplierOrders, approvals, agentTools, agent };
}

type DemoPlanningRuntime = ReturnType<typeof createDemoRuntime>;

declare global {
  var __mistoPlanningRuntime: DemoPlanningRuntime | undefined;
}

export function getDemoPlanningRuntime(): DemoPlanningRuntime {
  if (!globalThis.__mistoPlanningRuntime) {
    globalThis.__mistoPlanningRuntime = createDemoRuntime();
  }
  return globalThis.__mistoPlanningRuntime;
}

// Rebuilds the shared demo runtime from scratch so a public demo link can always return to Wedding 180 / Plan v1.
export function resetDemoPlanningRuntime(): DemoPlanningRuntime {
  globalThis.__mistoPlanningRuntime = createDemoRuntime();
  return globalThis.__mistoPlanningRuntime;
}
