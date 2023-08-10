import{c as N,r as R}from"./compositions-b1edfb65.js";import{g as U}from"./generateMatchUps-b96e6c58.js";import{r as B}from"./renderRound-fb085548.js";import"./index-e42a72ce.js";import"./renderFrill-fd8ed9a8.js";import"./_commonjsHelpers-725317a4.js";import"./renderFlag-e247062b.js";import"./renderSide-267726cb.js";import"./renderTick-623d7066.js";import"./renderParticipant-ac38c69b.js";import"./renderIndividual-753eabfa.js";import"./renderStatusPill-1bd9396c.js";import"./scoreStyles-36a1f551.js";const E={composition:{options:Object.keys(N),control:{type:"select"}}},I={title:"Draws/Rounds",tags:["autodocs"],render:({roundNumber:F=1,roundFactor:L,eventType:k,outcomes:D,randomWinningSide:f,...t})=>{const n=N[t.composition||"Basic"],{matchUps:h}=U({...t,randomWinningSide:f,drawSize:16,eventType:k,outcomes:D}),O=B({...t,roundFactor:L,roundNumber:F,composition:n,matchUps:h});return R({theme:n.theme,content:O})},argTypes:E},r={args:{roundNumber:2,roundFactor:1}},o={args:{roundNumber:1}},e={args:{roundNumber:2,isLucky:!0}},s={args:{eventType:"DOUBLES",roundNumber:2,roundFactor:1}};var a,c,m;r.parameters={...r.parameters,docs:{...(a=r.parameters)==null?void 0:a.docs,source:{originalSource:`{
  args: {
    roundNumber: 2,
    roundFactor: 1
  }
}`,...(m=(c=r.parameters)==null?void 0:c.docs)==null?void 0:m.source}}};var u,p,i;o.parameters={...o.parameters,docs:{...(u=o.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    roundNumber: 1
  }
}`,...(i=(p=o.parameters)==null?void 0:p.docs)==null?void 0:i.source}}};var d,g,l;e.parameters={...e.parameters,docs:{...(d=e.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    roundNumber: 2,
    isLucky: true
  }
}`,...(l=(g=e.parameters)==null?void 0:g.docs)==null?void 0:l.source}}};var b,y,S;s.parameters={...s.parameters,docs:{...(b=s.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    eventType: 'DOUBLES',
    roundNumber: 2,
    roundFactor: 1
  }
}`,...(S=(y=s.parameters)==null?void 0:y.docs)==null?void 0:S.source}}};const J=["Singles","FirstRound","Lucky","Doubles"];export{s as Doubles,o as FirstRound,e as Lucky,r as Singles,J as __namedExportsOrder,I as default};
//# sourceMappingURL=round.stories-f08567ec.js.map
