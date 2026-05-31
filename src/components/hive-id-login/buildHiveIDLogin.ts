/**
 * HiveID Login — vanilla-JS DOM factory.
 *
 * Three modes:
 *   - 'signup'      — new public user (email + first/last name)
 *   - 'login'       — existing-account password verification (email + password)
 *   - 'magic-link'  — passwordless email link
 *
 * Emits a `hiveid:authenticated` CustomEvent on success with the
 * `{ token, refreshToken, personId, cached }` detail shape. Errors are
 * surfaced via the in-component message line — the consumer doesn't
 * have to render them.
 *
 * Convention-aligned with the rest of courthive-components: factory
 * function, no framework, no custom-element registration, vanilla
 * `document.createElement` everywhere.
 */
import {
  hilContainerStyle,
  hilFieldStyle,
  hilFormStyle,
  hilHeaderStyle,
  hilInputStyle,
  hilLabelStyle,
  hilMessageErrorStyle,
  hilMessageStyle,
  hilMessageSuccessStyle,
  hilRowStyle,
  hilSubmitStyle,
  hilSwitchModeStyle,
  hilTabActiveStyle,
  hilTabStyle,
  hilTabsStyle,
  hilTitleStyle
} from './styles';
import {
  consumeMagicLink,
  isExistingUserConflict,
  requestMagicLink,
  signup,
  verifyExisting
} from './hiveIDClient';
import type {
  CachedPersonFields,
  HiveIDAuthenticatedDetail,
  HiveIDLoginConfig,
  HiveIDLoginShell,
  HiveIDMode
} from './types';

const MODE_SIGNUP: HiveIDMode = 'signup';
const MODE_LOGIN: HiveIDMode = 'login';
const MODE_MAGIC_LINK: HiveIDMode = 'magic-link';
const ALL_MODES: HiveIDMode[] = [MODE_SIGNUP, MODE_LOGIN, MODE_MAGIC_LINK];

const AUTHENTICATED_EVENT = 'hiveid:authenticated';

const TAB_LABELS: Record<HiveIDMode, string> = {
  [MODE_SIGNUP]: 'Sign up',
  [MODE_LOGIN]: 'Log in',
  [MODE_MAGIC_LINK]: 'Email link'
};

const TITLE_BY_MODE: Record<HiveIDMode, string> = {
  [MODE_SIGNUP]: 'Create your CourtHive identity',
  [MODE_LOGIN]: 'Log in to CourtHive',
  [MODE_MAGIC_LINK]: 'Email me a sign-in link'
};

export function buildHiveIDLogin(config: HiveIDLoginConfig): HiveIDLoginShell {
  if (!config?.cfsBaseUrl) {
    throw new Error('buildHiveIDLogin: cfsBaseUrl is required');
  }

  let currentMode: HiveIDMode = config.mode ?? 'signup';
  let busy = false;

  const root = document.createElement('div');
  root.className = hilContainerStyle();
  root.dataset.hiveidLogin = 'true';

  const header = document.createElement('div');
  header.className = hilHeaderStyle();

  const title = document.createElement('h2');
  title.className = hilTitleStyle();
  header.appendChild(title);

  const tabs = document.createElement('div');
  tabs.className = hilTabsStyle();
  header.appendChild(tabs);
  const tabButtons: Record<HiveIDMode, HTMLButtonElement> = {} as any;
  ALL_MODES.forEach((m) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = hilTabStyle();
    btn.textContent = TAB_LABELS[m];
    btn.dataset.mode = m;
    btn.onclick = () => setMode(m);
    tabs.appendChild(btn);
    tabButtons[m] = btn;
  });

  root.appendChild(header);

  const form = document.createElement('form');
  form.className = hilFormStyle();
  form.noValidate = true;
  root.appendChild(form);

  const message = document.createElement('div');
  message.className = hilMessageStyle();
  message.hidden = true;
  root.appendChild(message);

  function setMessage(text: string, kind: 'info' | 'error' | 'success' = 'info'): void {
    message.textContent = text;
    message.className = hilMessageStyle();
    if (kind === 'error') message.classList.add(hilMessageErrorStyle());
    if (kind === 'success') message.classList.add(hilMessageSuccessStyle());
    message.hidden = !text;
  }

  function clearMessage(): void {
    setMessage('');
  }

  function makeField(name: string, label: string, type = 'text', value = ''): HTMLInputElement {
    const wrap = document.createElement('div');
    wrap.className = hilFieldStyle();
    const lbl = document.createElement('label');
    lbl.className = hilLabelStyle();
    lbl.textContent = label;
    lbl.htmlFor = `chc-hil-${name}`;
    const input = document.createElement('input');
    input.id = `chc-hil-${name}`;
    input.name = name;
    input.type = type;
    input.value = value;
    input.className = hilInputStyle();
    input.required = true;
    wrap.appendChild(lbl);
    wrap.appendChild(input);
    form.appendChild(wrap);
    return input;
  }

  function makeRow(): HTMLDivElement {
    const row = document.createElement('div');
    row.className = hilRowStyle();
    form.appendChild(row);
    return row;
  }

  function makeSubmit(label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.className = hilSubmitStyle();
    btn.textContent = label;
    form.appendChild(btn);
    return btn;
  }

  function makeSwitch(prompt: string, target: HiveIDMode, linkText: string): void {
    const wrap = document.createElement('div');
    wrap.className = hilSwitchModeStyle();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = linkText;
    btn.onclick = () => setMode(target);
    wrap.append(prompt + ' ', btn);
    form.appendChild(wrap);
  }

  function emitAuthenticated(detail: HiveIDAuthenticatedDetail): void {
    root.dispatchEvent(new CustomEvent(AUTHENTICATED_EVENT, { detail, bubbles: true }));
  }

  function withBusy(submit: HTMLButtonElement, fn: () => Promise<void>): (e: Event) => Promise<void> {
    return async (e: Event) => {
      e.preventDefault();
      if (busy) return;
      busy = true;
      submit.disabled = true;
      clearMessage();
      try {
        await fn();
      } finally {
        busy = false;
        submit.disabled = false;
      }
    };
  }

  async function handleSignup(emailInput: HTMLInputElement, firstNameInput: HTMLInputElement, lastNameInput: HTMLInputElement): Promise<void> {
    const email = emailInput.value.trim();
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    if (!email || !firstName || !lastName) {
      setMessage('Email, first name, and last name are required.', 'error');
      return;
    }
    try {
      const resp = await signup(config.cfsBaseUrl, { email, firstName, lastName, federationIds: config.federationIds }, config.fetchImpl);
      if (resp.status === 'candidate') {
        setMessage('We found possible matches — please log in with your existing account.', 'info');
        setMode('login');
        return;
      }
      emitAuthenticated({
        token: resp.token,
        refreshToken: resp.refreshToken,
        personId: resp.personId,
        cached: resp.cached
      });
      setMessage('Welcome to CourtHive.', 'success');
    } catch (err: any) {
      if (isExistingUserConflict(err)) {
        setMessage('That email already has a CourtHive account — please verify your password.', 'info');
        setMode('login');
        return;
      }
      setMessage(extractErrorText(err) ?? 'Sign-up failed. Please try again.', 'error');
    }
  }

  async function handleLogin(emailInput: HTMLInputElement, passwordInput: HTMLInputElement): Promise<void> {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      setMessage('Email and password are required.', 'error');
      return;
    }
    try {
      const resp = await verifyExisting(config.cfsBaseUrl, { email, password }, config.fetchImpl);
      emitAuthenticated({
        token: resp.token,
        refreshToken: resp.refreshToken,
        personId: resp.personId,
        cached: resp.cached ?? emptyCached()
      });
      setMessage('Signed in.', 'success');
    } catch (err: any) {
      setMessage(extractErrorText(err) ?? 'Sign-in failed. Please check your password.', 'error');
    }
  }

  async function handleMagicLink(emailInput: HTMLInputElement): Promise<void> {
    const email = emailInput.value.trim();
    if (!email) {
      setMessage('Email is required.', 'error');
      return;
    }
    try {
      await requestMagicLink(config.cfsBaseUrl, { email }, config.fetchImpl);
      setMessage(`If ${email} is registered, a sign-in link is on its way.`, 'success');
    } catch (err: any) {
      setMessage(extractErrorText(err) ?? 'Could not send link. Please try again.', 'error');
    }
  }

  function renderForm(): void {
    form.replaceChildren();
    title.textContent = TITLE_BY_MODE[currentMode];
    ALL_MODES.forEach((m) => {
      tabButtons[m].classList.toggle(hilTabActiveStyle(), m === currentMode);
    });

    if (currentMode === 'signup') {
      const row = makeRow();
      const firstName = document.createElement('input');
      firstName.id = 'chc-hil-firstName';
      firstName.type = 'text';
      firstName.placeholder = 'First name';
      firstName.required = true;
      firstName.className = hilInputStyle();
      const lastName = document.createElement('input');
      lastName.id = 'chc-hil-lastName';
      lastName.type = 'text';
      lastName.placeholder = 'Last name';
      lastName.required = true;
      lastName.className = hilInputStyle();
      const wrapFirst = document.createElement('div');
      wrapFirst.className = hilFieldStyle();
      const labelFirst = document.createElement('label');
      labelFirst.textContent = 'First name';
      labelFirst.className = hilLabelStyle();
      labelFirst.htmlFor = firstName.id;
      wrapFirst.append(labelFirst, firstName);
      const wrapLast = document.createElement('div');
      wrapLast.className = hilFieldStyle();
      const labelLast = document.createElement('label');
      labelLast.textContent = 'Last name';
      labelLast.className = hilLabelStyle();
      labelLast.htmlFor = lastName.id;
      wrapLast.append(labelLast, lastName);
      row.append(wrapFirst, wrapLast);

      const email = makeField('email', 'Email', 'email', config.defaultEmail ?? '');
      const submit = makeSubmit('Create account');
      form.onsubmit = withBusy(submit, () => handleSignup(email, firstName, lastName));
      makeSwitch('Already have an account?', 'login', 'Log in');
    } else if (currentMode === 'login') {
      const email = makeField('email', 'Email', 'email', config.defaultEmail ?? '');
      const password = makeField('password', 'Password', 'password');
      const submit = makeSubmit('Log in');
      form.onsubmit = withBusy(submit, () => handleLogin(email, password));
      makeSwitch('Forgot your password?', 'magic-link', 'Email me a link');
    } else {
      const email = makeField('email', 'Email', 'email', config.defaultEmail ?? '');
      const submit = makeSubmit('Send link');
      form.onsubmit = withBusy(submit, () => handleMagicLink(email));
      makeSwitch('Have a password?', 'login', 'Log in instead');
    }
  }

  function setMode(mode: HiveIDMode): void {
    if (mode === currentMode) return;
    currentMode = mode;
    clearMessage();
    renderForm();
  }

  function getMode(): HiveIDMode {
    return currentMode;
  }

  function onAuthenticated(handler: (detail: HiveIDAuthenticatedDetail) => void): () => void {
    const listener = (ev: Event) => handler((ev as CustomEvent<HiveIDAuthenticatedDetail>).detail);
    root.addEventListener(AUTHENTICATED_EVENT, listener);
    return () => root.removeEventListener(AUTHENTICATED_EVENT, listener);
  }

  renderForm();

  return {
    root,
    setMode,
    getMode,
    onAuthenticated
  };
}

/** Magic-link consume helper for the courthive-public landing route. */
export async function completeMagicLink(
  cfsBaseUrl: string,
  code: string,
  fetchImpl?: typeof fetch
): Promise<HiveIDAuthenticatedDetail> {
  const resp = await consumeMagicLink(cfsBaseUrl, { code }, fetchImpl);
  return {
    token: resp.token,
    refreshToken: resp.refreshToken,
    personId: resp.personId,
    cached: resp.cached ?? emptyCached()
  };
}

function emptyCached(): CachedPersonFields {
  return {
    standardFamilyName: null,
    standardGivenName: null,
    birthDate: null,
    sex: null,
    nationalityCode: null
  };
}

function extractErrorText(err: any): string | null {
  if (!err || typeof err !== 'object') return null;
  if (err.kind === 'http') {
    const body = err.body;
    if (body?.message && typeof body.message === 'string') return body.message;
    if (typeof body?.status === 'string' && body.status === 'incomplete') return 'We need a bit more information to identify you.';
  }
  if (err.kind === 'network') return 'Could not reach CourtHive. Check your connection.';
  return null;
}
