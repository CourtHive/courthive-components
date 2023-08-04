import { renderButton } from '../components/button/cvaButton';
import { cModal } from '../components/modal/cmodal';

export default {
  title: 'Forms/Modal',
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

export const Update = {
  args: {
    onClick: () => {
      let update, buttons;
      const changeButtons = () => update({ buttons: [{ label: 'Ok' }] });
      const changeContent = () => {
        buttons = buttons.filter(({ label }) => label !== 'Content');
        update({ content: 'Like magic', buttons });
      };
      const changeTitle = () => {
        buttons = buttons.filter(({ label }) => label !== 'Title');
        update({ title: 'Something new', buttons });
      };

      buttons = [
        { label: 'Title', onClick: changeTitle, close: false },
        { label: 'Content', onClick: changeContent, close: false },
        { label: 'Buttons', onClick: changeButtons, close: false },
        { label: 'Close' }
      ];

      ({ update } = cModal.open({
        content: (elem) => {
          const div = document.createElement('div');
          div.innerHTML = 'Content';
          elem.appendChild(div);
          return elem;
        },
        title: 'Modal title',
        buttons
      }));
    },
    label: 'Modal updates'
  }
};

export const Title = {
  args: {
    onClick: () => {
      let update;
      const changeTitle = () => update({ title: 'Something new', buttons: [{ label: 'Ok' }] });

      ({ update } = cModal.open({
        buttons: [{ label: 'Add title', onClick: changeTitle, close: false }, { label: 'Close' }],
        content: (elem) => {
          const div = document.createElement('div');
          div.innerHTML = 'Begin with no title';
          elem.appendChild(div);
          return elem;
        }
      }));
    },
    label: 'Add title'
  }
};

export const Config = {
  args: {
    intent: 'secondary',
    label: 'Config',
    onClick: () => {
      let buttons, update;
      let config = { title: { padding: '1' }, content: { padding: '2' }, footer: { padding: '0' } };

      const addPadding = () => {
        config.footer.padding = '1';
        update({ buttons: [{ label: 'Ok' }], config });
      };

      buttons = [{ label: 'Add padding', onClick: addPadding, close: false }, { label: 'Close' }];
      ({ update } = cModal.open({
        config: { title: { padding: '1' }, content: { padding: '2' }, footer: { padding: '0' } },
        content: 'Content has 2em padding<p>Footer has no padding!',
        title: 'Title has 1em padding',
        buttons
      }));
    }
  }
};
