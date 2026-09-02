import { AgentRuntime } from './agent-runtime';
import { AgentToolService } from './agent-tools';
import { getDemoPlanningRuntime } from './demo-runtime';
import { LocalAgentModel } from './local-agent-model';
import { SupplierOrderService } from './supplier-order-service';
import { demoIngredients } from '@/data/demo/ingredients';
import { OpenAIResponsesAgentModel } from '@/infrastructure/openai-responses-agent-model';
import { SilpoOAuthCoordinator } from '@/infrastructure/silpo-oauth-client';
import { SilpoSupplierGateway } from '@/infrastructure/silpo-supplier-gateway';
import { getSupplierOrderSessionStore } from '@/infrastructure/create-supplier-order-session-store';

interface SilpoSupplierRuntime {
  supplierOrders: SupplierOrderService;
  agent: AgentRuntime;
}

export function getSilpoSupplierRuntime(sessionId: string, redirectUrl: URL): SilpoSupplierRuntime {
  const planning = getDemoPlanningRuntime();
  const coordinator = new SilpoOAuthCoordinator();
  const gateway = new SilpoSupplierGateway(
    (name, args) => coordinator.callReadTool(sessionId, redirectUrl, name, args),
    (_name, args) => coordinator.callApprovedProductAdd(sessionId, redirectUrl, args),
    demoIngredients,
  );
  const preferredProductByIngredient = Object.fromEntries(
    demoIngredients.map((ingredient) => [ingredient.id, `silpo-search:${ingredient.id}`]),
  ) as Record<string, string>;
  const supplierOrders = new SupplierOrderService({
    repository: planning.repository,
    gateway,
    ingredients: demoIngredients,
    preferredProductByIngredient,
    sessionStore: getSupplierOrderSessionStore(),
    sessionScope: sessionId,
  });
  const tools = new AgentToolService({
    repository: planning.repository,
    planningService: planning.service,
    approvals: planning.approvals,
    ingredients: demoIngredients,
    clock: planning.clock,
    supplierOrders,
  });
  const model =
    process.env.AGENT_MODE === 'openai' && process.env.OPENAI_API_KEY
      ? new OpenAIResponsesAgentModel(process.env.OPENAI_API_KEY)
      : new LocalAgentModel(demoIngredients);
  const runtime = { supplierOrders, agent: new AgentRuntime(model, tools) };
  return runtime;
}