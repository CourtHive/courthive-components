import { _ as f } from './index-e42a72ce.js';
import { a as x } from './compositions-b1edfb65.js';
const h = f({
  justifyContent: 'space-around',
  marginInlineStart: '16px',
  marginInlineEnd: '16px',
  flexDirection: 'column',
  display: 'flex',
  width: '370px'
});
function g({
  selectedMatchUpId: e,
  eventHandlers: i,
  searchActive: d,
  composition: s,
  roundFactor: t,
  roundNumber: a,
  matchUps: c,
  isLucky: u
}) {
  const m = c.filter((n) => n.roundNumber === a).sort((n, r) => (n.roundPosition || 0) - (r.roundPosition || 0)),
    o = document.createElement('div');
  return (
    (o.className = h()),
    m.forEach((n, r) => {
      const l = r % 2 === 0;
      t && (n.roundFactor = t);
      const p = x({
        selectedMatchUpId: e,
        eventHandlers: i,
        searchActive: d,
        composition: s,
        matchUp: n,
        isLucky: u,
        moeity: l
      });
      o.appendChild(p);
    }),
    o
  );
}
export { g as r };
//# sourceMappingURL=renderRound-fb085548.js.map
