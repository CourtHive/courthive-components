import { css } from '@stitches/core';

export const schedulingStyle = css({
  height: '$lineHeights$scheduleInfo',
  borderBottom: '1px solid var(--chc-border-primary)',
  justifyContent: 'space-between',
  backgroundColor: 'var(--chc-bg-secondary)',
  boxSizing: 'border-box',
  paddingRight: '0.2rem',
  paddingLeft: '0.5rem',
  alignItems: 'center',
  cursor: 'pointer',
  color: 'var(--chc-text-muted)',
  display: 'flex',
  width: '100%'
});
