import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import capture from '../../silpo-tools-2026-09-01.json';

export interface CapturedSilpoTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export class SilpoToolInputError extends Error {
  constructor(
    readonly toolName: string,
    readonly validationErrors: ErrorObject[],
  ) {
    super(`Invalid ${toolName} arguments: ${formatErrors(validationErrors)}`);
    this.name = 'SilpoToolInputError';
  }
}

const tools = capture.tools as CapturedSilpoTool[];
const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
const validators = new Map<string, ValidateFunction>();

export const capturedSilpoSchemaMetadata = {
  capturedAt: capture.capturedAt,
  toolCount: tools.length,
  uniqueToolCount: toolsByName.size,
} as const;

export function getCapturedSilpoTool(name: string): CapturedSilpoTool | undefined {
  return toolsByName.get(name);
}

export function validateCapturedSilpoToolArguments(name: string, args: unknown): Record<string, unknown> {
  const tool = getCapturedSilpoTool(name);
  if (!tool) throw new Error(`Silpo tool ${name} is absent from the captured tools/list schema`);
  const validate = validators.get(name) ?? ajv.compile(tool.inputSchema);
  validators.set(name, validate);
  if (!validate(args)) throw new SilpoToolInputError(name, validate.errors ?? []);
  return args as Record<string, unknown>;
}

function formatErrors(errors: ErrorObject[]): string {
  return errors
    .map((error) => `${error.instancePath || '/'} ${error.message ?? error.keyword}`)
    .join('; ');
}
