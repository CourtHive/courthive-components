/**
 * renderForm — opt-in `<form>` mode — play-function tests.
 *
 * The DOM/interaction layer for courthive-components is Storybook play
 * functions + `test-storybook` (never happy-dom). Verifies that:
 *   - default (no options) still renders a plain `<div>` container;
 *   - `{ form }` renders a real `<form>` with a visually-hidden submit button;
 *   - native Enter (a password manager's fill-and-submit path) fires onSubmit
 *     with the entered values.
 *
 * Run interactively: `pnpm storybook`
 * Run as tests:      `pnpm storybook` (one terminal) +
 *                    `pnpm test-storybook -- --testPathPatterns RenderFormFormMode`
 */
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { renderForm } from '../components/forms/renderForm';

const meta: Meta = {
  title: 'Renderers/Form/Tests/formMode'
};
export default meta;

const FIELDS = [
  { label: 'Email', field: 'email', type: 'email', autocomplete: 'email', placeholder: 'you@example.com' },
  { label: 'Password', field: 'password', type: 'password', autocomplete: 'current-password' }
];

function mount(options?: any): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding: 24px; max-width: 360px;';
  renderForm(wrap, FIELDS, undefined, options);
  return wrap;
}

export const DefaultRendersDiv: StoryObj = {
  name: 'no options → container is a <div>, no <form> and no submit button',
  render: () => mount(),
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector('form')).toBeNull();
    expect(canvasElement.querySelector('button[type="submit"]')).toBeNull();
  }
};

export const FormModeRendersForm: StoryObj = {
  name: 'form mode → real <form> with a visually-hidden submit button',
  render: () => mount({ form: true }),
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('form');
    expect(form).not.toBeNull();
    expect(form?.classList.contains('flexcol')).toBe(true);

    const submit = form?.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit).not.toBeNull();
    expect(submit.getAttribute('aria-hidden')).toBe('true');
    expect(submit.tabIndex).toBe(-1);
    // Visually clipped — not a visible action (those live in the modal footer).
    expect(submit.style.position).toBe('absolute');
  }
};

export const FormModeSubmitFiresOnSubmit: StoryObj = {
  name: 'native Enter fires onSubmit with the entered inputs',
  args: { onSubmit: fn() },
  render: (args: any) => mount({ form: { onSubmit: args.onSubmit } }),
  play: async ({ canvasElement, args }: any) => {
    const email = canvasElement.querySelector('input[type="email"]') as HTMLInputElement;
    const password = canvasElement.querySelector('input[type="password"]') as HTMLInputElement;

    await userEvent.type(email, 'player@example.com');
    // Enter in a field of a form that has a submit button submits the form.
    await userEvent.type(password, 'secret{Enter}');

    expect(args.onSubmit).toHaveBeenCalledTimes(1);
    const submitted = args.onSubmit.mock.calls[0][0];
    expect(submitted.inputs.email.value).toBe('player@example.com');
    expect(submitted.inputs.password.value).toBe('secret');
  }
};
