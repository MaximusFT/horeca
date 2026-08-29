import type { AgentToolDefinition, AgentToolName } from '@/domain/agent';
import type { AgentModelGateway, AgentModelResult, AgentToolInvoker } from '@/application/agent-model';
import type { Locale } from '@/i18n/locale';

const SYSTEM_INSTRUCTIONS = `You are the single orchestration agent for Misto Kitchen procurement.
Use only the supplied application tools for business facts, calculations, previews, and mutations.
Never calculate procurement quantities yourself. Never invent event, plan, inventory, or supplier facts.
For event changes, read the event and call preview_event_change. Explain that human approval is required.
Never call apply_event_change unless an explicit backend approval ID is supplied after human approval.
Keep answers concise and operational. Do not expose raw internal data beyond what is needed.`;

interface ResponsesApiOutputItem {
  type: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  content?: Array<{ type: string; text?: string }>;
}

interface ResponsesApiResponse {
  id: string;
  output_text?: string;
  output: ResponsesApiOutputItem[];
}

export class OpenAIResponsesAgentModel implements AgentModelGateway {
  readonly mode = 'openai' as const;

  constructor(
    private readonly apiKey: string,
    readonly model = process.env.OPENAI_MODEL ?? 'gpt-5.4-mini',
  ) {}

  async run(
    message: string,
    tools: AgentToolDefinition[],
    invoke: AgentToolInvoker,
    locale: Locale,
  ): Promise<AgentModelResult> {
    const localizedInstructions = `${SYSTEM_INSTRUCTIONS}\nReply to the user in ${locale === 'uk' ? 'Ukrainian' : 'English'}.`;
    let response = await this.create({ input: message, tools, instructions: localizedInstructions });
    for (let step = 0; step < 6; step += 1) {
      const calls = response.output.filter((item) => item.type === 'function_call');
      if (calls.length === 0) return { message: response.output_text || extractText(response.output) || 'Done.' };

      const outputs = [];
      for (const call of calls) {
        if (!call.call_id || !call.name || !isToolName(call.name)) continue;
        let output: unknown;
        try {
          output = (await invoke(call.name, JSON.parse(call.arguments ?? '{}'))).output;
        } catch (error) {
          output = { error: error instanceof Error ? error.message : 'Tool execution failed' };
        }
        outputs.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(output) });
      }
      if (outputs.length === 0) throw new Error('The model returned no executable application tool calls');
      response = await this.create({ input: outputs, tools, previousResponseId: response.id });
    }
    throw new Error('Agent exceeded the six-step application tool limit');
  }

  private async create({
    input,
    tools,
    previousResponseId,
    instructions,
  }: {
    input: unknown;
    tools: AgentToolDefinition[];
    previousResponseId?: string;
    instructions?: string;
  }) {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        instructions: instructions ?? SYSTEM_INSTRUCTIONS,
        input,
        previous_response_id: previousResponseId,
        tools: tools.map((tool) => ({
          type: 'function',
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          strict: true,
        })),
        tool_choice: 'auto',
        parallel_tool_calls: false,
        reasoning: { effort: 'low' },
        max_output_tokens: 800,
      }),
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`OpenAI Responses API failed (${response.status}): ${details.slice(0, 240)}`);
    }
    return (await response.json()) as ResponsesApiResponse;
  }
}

function extractText(items: ResponsesApiOutputItem[]): string {
  return items
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === 'output_text')
    .map((item) => item.text ?? '')
    .join('\n');
}

function isToolName(value: string): value is AgentToolName {
  return [
    'get_event',
    'get_procurement_plan',
    'explain_requirement',
    'preview_event_change',
    'apply_event_change',
    'prepare_supplier_order',
  ].includes(value);
}
