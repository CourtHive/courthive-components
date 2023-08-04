import { renderButton } from '../components/button/cvaButton';
import { cModal } from '../components/modal/cmodal';

export default {
  title: 'Forms/Button',
  tags: ['autodocs'],
  render: ({ ...args }) => {
    return renderButton({ ...args });
  },
  argTypes: {
    name: { control: 'text' },
    seedNumber: { control: 'text' },
    address: { control: 'text' }
  }
};

export const Primary = {
  args: {
    onClick: () => {
      let update;
      const changeContent = () => update({ content: 'Like magic' });
      const changeButtons = () => update({ buttons: [{ label: 'Ok' }] });

      ({ update } = cModal.open({
        buttons: [
          { label: 'Content', onClick: changeContent, close: false },
          { label: 'Buttons', onClick: changeButtons, close: false },
          { label: 'Close', onClick: (p) => console.log(p) }
        ],
        content: (elem) => {
          const div = document.createElement('div');
          div.innerHTML = 'Content';
          elem.appendChild(div);
          return elem;
        },
        title: 'Modal title'
      }));
    },
    label: 'Primary'
  }
};

export const Secondary = {
  args: {
    intent: 'secondary',
    label: 'Secondary',
    onClick: () => {
      cModal.open({
        buttons: [{ label: 'Close', onClick: (p) => console.log(p) }],
        config: { title: { padding: '1' }, content: { padding: '2' }, footer: { padding: '0' } },
        content: 'Content has 2em padding<p>Footer has no padding!',
        title: 'Title has 1em padding'
      });
    }
  }
};
