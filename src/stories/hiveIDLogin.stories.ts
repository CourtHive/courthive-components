import { buildHiveIDLogin } from '../components/hive-id-login/buildHiveIDLogin';
import type {
  DobSexCaptureConfig,
  FederationIdCaptureConfig,
  HiveIDAuthenticatedDetail,
  HiveIDMode
} from '../components/hive-id-login/types';

interface StoryExtras {
  federationIdCapture?: FederationIdCaptureConfig;
  dobSexCapture?: DobSexCaptureConfig;
  provider?: string;
}

export default {
  title: 'Components/HiveIDLogin',
  tags: ['autodocs']
};

/**
 * Mock fetch for Storybook — keeps stories self-contained (no CFS
 * dependency to render). Returns deterministic responses for each
 * `/auth/hiveid/*` endpoint so the success / error paths are
 * demonstrable in isolation.
 */
function mockFetch(scenario: 'success' | 'existing-user' | 'incomplete' | 'wrong-password' = 'success'): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString();
    await new Promise((r) => setTimeout(r, 300));

    if (url.endsWith('/auth/hiveid/signup')) {
      if (scenario === 'existing-user') {
        return new Response(
          JSON.stringify({ code: 'EXISTING_USER', message: 'An account exists.' }),
          { status: 409, headers: { 'content-type': 'application/json' } }
        );
      }
      if (scenario === 'incomplete') {
        return new Response(
          JSON.stringify({ status: 'incomplete', missingFields: ['birthDate'] }),
          { status: 422, headers: { 'content-type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          status: 'created',
          token: 'mock-hiveid-jwt',
          refreshToken: 'rtok_mock',
          personId: 'p-demo',
          personRevision: 1,
          cached: {
            standardFamilyName: 'Doe',
            standardGivenName: 'Jane',
            birthDate: '1990-04-12',
            sex: 'F',
            nationalityCode: 'USA'
          }
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }

    if (url.endsWith('/auth/hiveid/verify-existing')) {
      if (scenario === 'wrong-password') {
        return new Response(JSON.stringify({ message: 'Invalid credentials' }), {
          status: 401,
          headers: { 'content-type': 'application/json' }
        });
      }
      return new Response(
        JSON.stringify({
          status: 'verified',
          token: 'mock-admin-hiveid-jwt',
          refreshToken: 'rtok_mock',
          personId: 'p-demo',
          personRevision: 2,
          cached: null
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }

    if (url.endsWith('/auth/hiveid/magic-link')) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }

    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}

function buildStory(
  mode: HiveIDMode,
  scenario: Parameters<typeof mockFetch>[0] = 'success',
  extras: StoryExtras = {}
): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText = 'padding: 24px; background: var(--chc-bg-secondary, #f3f4f6); min-height: 100vh;';

  const shell = buildHiveIDLogin({
    cfsBaseUrl: 'https://courthive.test',
    mode,
    fetchImpl: mockFetch(scenario),
    federationIdCapture: extras.federationIdCapture,
    dobSexCapture: extras.dobSexCapture,
    provider: extras.provider
  });
  container.appendChild(shell.root);

  const log = document.createElement('pre');
  log.style.cssText = 'margin-top: 1rem; padding: 0.75rem; background: var(--chc-bg-primary, #fff); border: 1px solid var(--chc-border-primary, #dbdbdb); font-size: 0.75rem; max-width: 24rem;';
  log.textContent = 'hiveid:authenticated events appear here.';
  container.appendChild(log);

  shell.onAuthenticated((detail: HiveIDAuthenticatedDetail) => {
    log.textContent = JSON.stringify(detail, null, 2);
  });

  return container;
}

export const Signup = {
  name: 'Signup (happy path)',
  render: () => buildStory('signup', 'success')
};

export const SignupExistingUser = {
  name: 'Signup — 409 swaps to Login',
  render: () => buildStory('signup', 'existing-user')
};

export const SignupIncomplete = {
  name: 'Signup — 422 incomplete',
  render: () => buildStory('signup', 'incomplete')
};

export const SignupFederationId = {
  name: 'Signup — federation-id capture (claim identity)',
  render: () =>
    buildStory('signup', 'success', {
      federationIdCapture: {
        providers: [
          { value: 'BOBOCA', label: 'BOBOCA' },
          { value: 'HTS', label: 'HTS' },
          { value: 'CTS', label: 'CTS' }
        ],
        idLabel: 'Player ID',
        note: 'Already have a player ID from your club or federation? Enter it to link your existing record.'
      }
    })
};

export const SignupDobSex = {
  name: 'Signup — DOB + sex capture (mint-on-signup)',
  render: () =>
    buildStory('signup', 'success', {
      provider: 'BOBOCA',
      dobSexCapture: {
        note: 'Your date of birth and sex let us find or create your player record.'
      },
      federationIdCapture: {
        providers: [{ value: 'BOBOCA', label: 'BOBOCA' }],
        idLabel: 'Player ID (optional)',
        note: 'Already have a BOBOCA player ID? Enter it to link your existing record instead.'
      }
    })
};

export const Login = {
  name: 'Login (verify-existing)',
  render: () => buildStory('login', 'success')
};

export const LoginWrongPassword = {
  name: 'Login — wrong password',
  render: () => buildStory('login', 'wrong-password')
};

export const MagicLink = {
  name: 'Magic-link request',
  render: () => buildStory('magic-link', 'success')
};
