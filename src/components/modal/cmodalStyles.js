import { css } from '@stitches/core';

export const backdropStyle = css({
  willChange: 'opacity',
  position: 'fixed',
  zIndex: 9998,
  bottom: 0,
  right: 0,
  left: 0,
  top: 0
});

export const modalStyle = css({
  display: 'block'
});

export const bodyFreeze = css({
  position: 'fixed',
  right: 0,
  left: 0
});

export const modalContainerStyle = css({
  paddingRight: '15px',
  alignItems: 'center',
  margin: '30px auto',
  paddingLeft: '15px',
  position: 'fixed',
  height: '100vh',
  display: 'flex',
  width: '100%',
  zIndex: 9999,
  bottom: 0,
  right: 0,
  left: 0,
  top: 0
});

export const modalDialogStyle = css({
  boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
  backgroundColor: 'white',
  position: 'relative',
  borderRadius: '3px',
  minHeight: 'auto',
  width: '100%'
});

export const modalHeaderStyle = css({
  borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
  alignItems: 'center',
  position: 'relative',
  display: 'flex'
});

export const modalTitleStyle = css({
  fontWeight: '600',
  fontSize: '20px'
});

export const modalFooterStyle = css({
  borderTop: '1px solid rgba(0, 0, 0, 0.1)',
  justifyContent: 'right',
  alignItems: 'center',
  position: 'relative',
  display: 'flex'
});
