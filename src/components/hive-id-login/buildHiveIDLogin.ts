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
  DobSexCaptureConfig,
  FederationIdCaptureConfig,
  HiveIDAuthenticatedDetail,
  HiveIDFederationId,
  HiveIDLoginConfig,
  HiveIDLoginShell,
  HiveIDMode,
  SignupSexOption
} from './types';

const DEFAULT_SEX_OPTIONS: SignupSexOption[] = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' }
];

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

interface SignupExtras {
  federationIds?: HiveIDFederationId[];
  birthDate?: string;
  sex?: string;
  provider?: string;
  requirePii?: boolean;
}

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

  // Optional signup federation-id capture. Renders an id field (+ a provider
  // select when >1 provider) and returns a getter for the entered id, so a
  // person can quote an existing provider id and be RESOLVED to their canonical
  // person at signup. Returns null when the id is left blank.
  function renderFederationCapture(capture: FederationIdCaptureConfig): () => HiveIDFederationId | null {
    if (capture.note) {
      const note = document.createElement('p');
      note.className = hilLabelStyle();
      note.textContent = capture.note;
      form.appendChild(note);
    }
    let providerSelect: HTMLSelectElement | null = null;
    if (capture.providers.length > 1) {
      const wrap = document.createElement('div');
      wrap.className = hilFieldStyle();
      const lbl = document.createElement('label');
      lbl.className = hilLabelStyle();
      lbl.textContent = 'Provider';
      lbl.htmlFor = 'chc-hil-fedProvider';
      const sel = document.createElement('select');
      sel.id = 'chc-hil-fedProvider';
      sel.className = hilInputStyle();
      capture.providers.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.value;
        opt.textContent = p.label;
        sel.appendChild(opt);
      });
      wrap.append(lbl, sel);
      form.appendChild(wrap);
      providerSelect = sel;
    }
    const idWrap = document.createElement('div');
    idWrap.className = hilFieldStyle();
    const idLbl = document.createElement('label');
    idLbl.className = hilLabelStyle();
    idLbl.textContent = capture.idLabel ?? 'Player ID';
    idLbl.htmlFor = 'chc-hil-federationId';
    const idInput = document.createElement('input');
    idInput.id = 'chc-hil-federationId';
    idInput.type = 'text';
    idInput.className = hilInputStyle();
    idWrap.append(idLbl, idInput);
    form.appendChild(idWrap);
    const singleProvider = capture.providers[0]?.value ?? '';
    return () => {
      const externalId = idInput.value.trim();
      if (!externalId) return null;
      const provider = providerSelect ? providerSelect.value : singleProvider;
      return provider ? { provider, externalId } : null;
    };
  }

  // Optional signup DOB + sex capture. Renders a date input + a sex select and
  // returns a getter for the entered values (trimmed; empty → undefined), so a
  // brand-new person can be deduped-or-MINTED. The consumer gates collection
  // behind a consent notice (decision #4) before mounting this component.
  function renderDobSexCapture(capture: DobSexCaptureConfig): () => { birthDate?: string; sex?: string } {
    if (capture.note) {
      const note = document.createElement('p');
      note.className = hilLabelStyle();
      note.textContent = capture.note;
      form.appendChild(note);
    }
    const required = capture.required !== false;

    const dobWrap = document.createElement('div');
    dobWrap.className = hilFieldStyle();
    const dobLbl = document.createElement('label');
    dobLbl.className = hilLabelStyle();
    dobLbl.textContent = capture.dobLabel ?? 'Date of birth';
    dobLbl.htmlFor = 'chc-hil-birthDate';
    const dobInput = document.createElement('input');
    dobInput.id = 'chc-hil-birthDate';
    dobInput.type = 'date';
    dobInput.required = required;
    dobInput.className = hilInputStyle();
    dobWrap.append(dobLbl, dobInput);
    form.appendChild(dobWrap);

    const sexWrap = document.createElement('div');
    sexWrap.className = hilFieldStyle();
    const sexLbl = document.createElement('label');
    sexLbl.className = hilLabelStyle();
    sexLbl.textContent = capture.sexLabel ?? 'Sex';
    sexLbl.htmlFor = 'chc-hil-sex';
    const sexSelect = document.createElement('select');
    sexSelect.id = 'chc-hil-sex';
    sexSelect.required = required;
    sexSelect.className = hilInputStyle();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select…';
    sexSelect.appendChild(placeholder);
    (capture.sexOptions ?? DEFAULT_SEX_OPTIONS).forEach((o) => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      sexSelect.appendChild(opt);
    });
    sexWrap.append(sexLbl, sexSelect);
    form.appendChild(sexWrap);

    return () => normalizeSignupPii({ birthDate: dobInput.value, sex: sexSelect.value });
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

  async function handleSignup(
    emailInput: HTMLInputElement,
    firstNameInput: HTMLInputElement,
    lastNameInput: HTMLInputElement,
    extras: SignupExtras = {}
  ): Promise<void> {
    const email = emailInput.value.trim();
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    if (!email || !firstName || !lastName) {
      setMessage('Email, first name, and last name are required.', 'error');
      return;
    }
    const { federationIds, birthDate, sex, provider, requirePii } = extras;
    if (requirePii && (!birthDate || !sex)) {
      setMessage('Date of birth and sex are required.', 'error');
      return;
    }
    try {
      const resp = await signup(
        config.cfsBaseUrl,
        { email, firstName, lastName, federationIds, birthDate, sex, provider },
        config.fetchImpl
      );
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
      const getFederationId = config.federationIdCapture
        ? renderFederationCapture(config.federationIdCapture)
        : () => null;
      const getPii = config.dobSexCapture ? renderDobSexCapture(config.dobSexCapture) : () => ({});
      const requirePii = !!config.dobSexCapture && config.dobSexCapture.required !== false;
      const submit = makeSubmit('Create account');
      form.onsubmit = withBusy(submit, () =>
        handleSignup(email, firstName, lastName, {
          federationIds: mergeFederationIds(getFederationId(), config.federationIds),
          ...getPii(),
          provider: config.provider,
          requirePii
        })
      );
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

/**
 * Merge a user-entered federation id (from the signup capture field) with any
 * consumer-supplied `config.federationIds`, de-duped by `provider::externalId`.
 * Returns undefined when there is nothing to send (so the signup fragment stays
 * name-only, matching prior behavior).
 */
export function mergeFederationIds(
  entered: HiveIDFederationId | null,
  configIds?: HiveIDFederationId[]
): HiveIDFederationId[] | undefined {
  const merged: HiveIDFederationId[] = [];
  const seen = new Set<string>();
  const add = (f?: HiveIDFederationId | null): void => {
    if (!f?.provider || !f?.externalId) return;
    const key = `${f.provider}::${f.externalId}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push({ provider: f.provider, externalId: f.externalId });
  };
  (configIds ?? []).forEach(add);
  add(entered);
  return merged.length ? merged : undefined;
}

/**
 * Normalize the raw DOB + sex captured on the signup form: trim, and drop empty
 * values (so an untouched field stays `undefined` and the signup fragment omits
 * it rather than sending an empty string). Pure — unit-tested without the DOM.
 */
export function normalizeSignupPii(raw: { birthDate?: string; sex?: string }): { birthDate?: string; sex?: string } {
  const out: { birthDate?: string; sex?: string } = {};
  const birthDate = raw.birthDate?.trim();
  const sex = raw.sex?.trim();
  if (birthDate) out.birthDate = birthDate;
  if (sex) out.sex = sex;
  return out;
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
