import { afterEach, describe, expect, it } from 'vitest';
import { SilpoOAuthClientProvider } from '@/infrastructure/silpo-oauth-client';
import { MemorySilpoOAuthStore } from '@/infrastructure/silpo-oauth-store';
import { isSilpoReadToolName } from '@/infrastructure/silpo-tool-policy';

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
    expect(isSilpoReadToolName('silpo_add_or_update_cart_products')).toBe(false);
    expect(isSilpoReadToolName('silpo_clear_shopping_cart')).toBe(false);
  });
});
