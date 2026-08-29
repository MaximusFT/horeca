import type {
  OAuthClientInformationMixed,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import type { OAuthDiscoveryState } from '@modelcontextprotocol/sdk/client/auth.js';

export interface SilpoOAuthRecord {
  clientInformation?: OAuthClientInformationMixed;
  tokens?: OAuthTokens;
  codeVerifier?: string;
  authorizationUrl?: string;
  discoveryState?: OAuthDiscoveryState;
}

export interface SilpoOAuthStore {
  get(sessionId: string): Promise<SilpoOAuthRecord | undefined>;
  set(sessionId: string, record: SilpoOAuthRecord): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

declare global {
  var __mistoSilpoOAuthRecords: Map<string, SilpoOAuthRecord> | undefined;
}

export class MemorySilpoOAuthStore implements SilpoOAuthStore {
  private get records(): Map<string, SilpoOAuthRecord> {
    globalThis.__mistoSilpoOAuthRecords ??= new Map();
    return globalThis.__mistoSilpoOAuthRecords;
  }

  async get(sessionId: string): Promise<SilpoOAuthRecord | undefined> {
    const record = this.records.get(sessionId);
    return record ? structuredClone(record) : undefined;
  }

  async set(sessionId: string, record: SilpoOAuthRecord): Promise<void> {
    this.records.set(sessionId, structuredClone(record));
  }

  async delete(sessionId: string): Promise<void> {
    this.records.delete(sessionId);
  }
}
