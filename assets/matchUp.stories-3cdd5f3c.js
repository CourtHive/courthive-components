import{c as m,a as y,r as U}from"./compositions-b1edfb65.js";import{g as S}from"./generateMatchUps-b96e6c58.js";import"./index-e42a72ce.js";import"./renderFrill-fd8ed9a8.js";import"./_commonjsHelpers-725317a4.js";import"./renderFlag-e247062b.js";import"./renderSide-267726cb.js";import"./renderTick-623d7066.js";import"./renderParticipant-ac38c69b.js";import"./renderIndividual-753eabfa.js";import"./renderStatusPill-1bd9396c.js";import"./scoreStyles-36a1f551.js";const L={composition:{options:Object.keys(m),control:{type:"select"}}},j={title:"MatchUps/MatchUp",tags:["autodocs"],render:({eventType:u,outcomes:d,randomWinningSide:g,...r})=>{const o=m[r.composition||"Basic"],{matchUps:l}=S({...r,randomWinningSide:g,drawSize:16,eventType:u,outcomes:d}),h=y({...r,matchUp:l[0],composition:o});return U({theme:o.theme,content:h})},argTypes:L},e={args:{isLucky:!0}},t={args:{eventType:"DOUBLES",isLucky:!0}};var s,a,c;e.parameters={...e.parameters,docs:{...(s=e.parameters)==null?void 0:s.docs,source:{originalSource:`{
  args: {
    isLucky: true
  }
}`,...(c=(a=e.parameters)==null?void 0:a.docs)==null?void 0:c.source}}};var n,p,i;t.parameters={...t.parameters,docs:{...(n=t.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    eventType: "DOUBLES",
    isLucky: true
  }
}`,...(i=(p=t.parameters)==null?void 0:p.docs)==null?void 0:i.source}}};const w=["Singles","Doubles"];export{t as Doubles,e as Singles,w as __namedExportsOrder,j as default};
//# sourceMappingURL=matchUp.stories-3cdd5f3c.js.map
