import { afterEach, describe, expect, it } from 'vitest';
import { SilpoOAuthClientProvider, summarizeToolResult } from '@/infrastructure/silpo-oauth-client';
import { MemorySilpoOAuthStore } from '@/infrastructure/silpo-oauth-store';
import { isSilpoReadToolName } from '@/infrastructure/silpo-tool-policy';
import {
  capturedSilpoSchemaMetadata,
  getCapturedSilpoTool,
  validateCapturedSilpoToolArguments,
} from '@/infrastructure/silpo-live-schema';

describe('Silpo OAuth client provider', () => {
  const sessionId = 'oauth-test-session';
  const store = new MemorySilpoOAuthStore();

  afterEach(async () => {
    await store.delete(sessionId);
  });

  it('persists DCR client info, PKCE verifier, tokens and authorization redirect by session', async () => {
    const redirectUrl = new URL('http://localhost:3000/api/silpo/oauth/callback');
    const provider = new SilpoOAuthClientProvider(sessionId, redirectUrl, store);

    await provider.saveClientInformation({ client_id: 'silpo-test-client' });
    await provider.saveCodeVerifier('pkce-verifier');
    await provider.saveTokens({ access_token: 'access-token', token_type: 'Bearer', refresh_token: 'refresh-token' });
    await provider.redirectToAuthorization(new URL('https://auth.silpo.ua/authorize?state=oauth-test-session'));

    expect(provider.state()).toBe(sessionId);
    expect(provider.clientMetadata.redirect_uris).toEqual([redirectUrl.toString()]);
    expect(await provider.clientInformation()).toEqual({ client_id: 'silpo-test-client' });
    expect(await provider.codeVerifier()).toBe('pkce-verifier');
    expect(await provider.tokens()).toEqual({
      access_token: 'access-token',
      token_type: 'Bearer',
      refresh_token: 'refresh-token',
    });
    expect((await store.get(sessionId))?.authorizationUrl).toContain('https://auth.silpo.ua/authorize');
  });

  it('invalidates only the requested credential scope', async () => {
    const provider = new SilpoOAuthClientProvider(
      sessionId,
      new URL('http://localhost:3000/api/silpo/oauth/callback'),
      store,
    );
    await provider.saveClientInformation({ client_id: 'silpo-test-client' });
    await provider.saveCodeVerifier('pkce-verifier');
    await provider.saveTokens({ access_token: 'access-token', token_type: 'Bearer' });

    await provider.invalidateCredentials('tokens');

    expect(await provider.tokens()).toBeUndefined();
    expect(await provider.clientInformation()).toEqual({ client_id: 'silpo-test-client' });
    expect(await provider.codeVerifier()).toBe('pkce-verifier');
  });

  it('allows required Stage 9 reads and blocks cart mutations', () => {
    expect(isSilpoReadToolName('silpo_get_my_shopping_cart')).toBe(true);
    expect(isSilpoReadToolName('silpo_find_products_batch')).toBe(true);
    expect(isSilpoReadToolName('silpo_find_address')).toBe(true);
    expect(isSilpoReadToolName('silpo_add_or_update_cart_products')).toBe(false);
    expect(isSilpoReadToolName('silpo_create_shopping_cart')).toBe(false);
    expect(isSilpoReadToolName('silpo_clear_shopping_cart')).toBe(false);
  });

  it('uses the unique 40-tool live capture and validates exact Stage 9 inputs', () => {
    expect(capturedSilpoSchemaMetadata).toEqual({
      capturedAt: '2026-09-01T14:14:25.057Z',
      toolCount: 40,
      uniqueToolCount: 40,
    });
    expect(getCapturedSilpoTool('silpo_create_shopping_cart')).toBeDefined();
    expect(validateCapturedSilpoToolArguments('silpo_get_my_shopping_cart', {})).toEqual({});
    expect(() => validateCapturedSilpoToolArguments('silpo_get_shopping_cart_by_id', {})).toThrow(/shoppingCartId/);
    expect(() =>
      validateCapturedSilpoToolArguments('silpo_find_products_batch', {
        branchId: 'branch',
        deliveryType: 'B2B',
        timeslotStart: '2026-09-01T10:00:00Z',
        timeslotEnd: '2026-09-01T12:00:00Z',
        products: Array.from({ length: 31 }, (_, index) => `product-${index}`),
      }),
    ).toThrow(/30/);
  });

  it('records product candidate key paths and types without values', () => {
    const summary = summarizeToolResult('silpo_find_products_batch', {
      structuredContent: {
        queries: [
          {
            products: [
              {
                productId: 'private-product-id',
                companyId: 'private-company-id',
                name: 'private-product-name',
                stock: 12,
                step: 1,
              },
            ],
          },
        ],
      },
      content: [{ type: 'text', text: 'private-raw-result' }],
    });

    expect(summary).toContain('$.structuredContent.queries[0].products[0].productId:string');
    expect(summary).toContain('$.structuredContent.queries[0].products[0].stock:number');
    expect(summary).not.toContain('private-product-id');
    expect(summary).not.toContain('private-product-name');
    expect(summary).not.toContain('private-raw-result');
  });
});
