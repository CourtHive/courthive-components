import { operatorMatchFixture } from './fixtures';
import { expect, within } from 'storybook/test';
import { renderOperatorMatch } from './render';

// constants and types
import type { Meta, StoryObj } from '@storybook/html-vite';
const meta: Meta = { title: 'Operator/Tests/Text safety', tags: ['!dev'] };
export default meta;
export const HtmlLikeNameIsLiteral: StoryObj = {
  render: () => {
    const host = document.createElement('section');
    const explanation = document.createElement('p');
    explanation.textContent =
      'Security test: this deliberately hostile name must remain plain text. It is not an example participant.';
    host.append(
      explanation,
      renderOperatorMatch({
        ...operatorMatchFixture,
        sides: [
          { ...operatorMatchFixture.sides[0], name: '<img src=x onerror="alert(1)">' },
          operatorMatchFixture.sides[1]
        ]
      })
    );
    return host;
  },
  play: async ({ canvasElement }) => {
    expect(within(canvasElement).getByText('<img src=x onerror="alert(1)">')).toBeVisible();
    expect(canvasElement.querySelector('img')).toBeNull();
  }
};
