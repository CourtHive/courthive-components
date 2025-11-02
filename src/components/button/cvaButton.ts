import { cva } from 'class-variance-authority';
import 'bulma/css/bulma.css';

export function renderButton({ 
  intent = 'primary', 
  size = 'medium', 
  label, 
  onClick 
}: {
  intent?: 'primary' | 'secondary';
  size?: 'medium';
  label?: string;
  onClick?: (args: { pointerEvent: MouseEvent }) => void;
} = {}): HTMLButtonElement {
  const buttonStyle = cva('button', {
    variants: {
      intent: {
        primary: ['is-info'],
        secondary: ['is-success']
      },
      size: {
        medium: ['font-medium']
      }
    },
    compoundVariants: [{ intent: 'primary', size: 'medium', class: 'uppercase' }],
    defaultVariants: {
      intent: 'primary',
      size: 'medium'
    }
  });

  const button = document.createElement('button');
  button.className = buttonStyle({ intent, size });
  button.innerHTML = label || '';

  button.onclick = (pointerEvent: MouseEvent) => {
    if (typeof onClick === 'function') onClick({ pointerEvent });
  };

  return button;
}
