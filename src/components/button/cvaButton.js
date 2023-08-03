import { cva } from 'class-variance-authority';
import 'bulma/css/bulma.css';

export function renderButton({ intent = 'primary', size = 'medium', label, onClick } = {}) {
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
    compoundVariants: [{ intent: 'primary', size: 'medium', textTransform: 'uppercase' }],
    defaultVariants: {
      intent: 'primary',
      size: 'medium'
    }
  });

  const button = document.createElement('button');
  button.className = buttonStyle({ intent, size });
  button.innerHTML = label;

  button.onclick = () => {
    if (typeof onClick === 'function') onClick();
  };

  return button;
}
