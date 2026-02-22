const CENTER = 'center';
const EMPTY_STRING = '';
const FLEX = 'flex';
const LEFT = 'left';
const NONE = 'none';
const OVERLAY = 'overlay';
const RIGHT = 'right';

export const toggleOverlay =
  ({ target }: { target: HTMLElement }) =>
  (rows: any[] = []): void => {
    target.style.backgroundColor = rows?.length ? 'lightgray' : EMPTY_STRING;
    const toggleOption = (option: string, hasRows: string, noRows: string) => {
      const element = target.getElementsByClassName(`options_${option}`)[0] as HTMLElement;
      if (element) element.style.display = rows?.length ? hasRows : noRows;
    };
    toggleOption(OVERLAY, FLEX, NONE);
    toggleOption(LEFT, NONE, FLEX);
    toggleOption(CENTER, NONE, FLEX);
    toggleOption(RIGHT, NONE, FLEX);
  };
