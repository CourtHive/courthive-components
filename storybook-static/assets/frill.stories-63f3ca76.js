import{r as S}from"./renderFrill-fd8ed9a8.js";import"./index-e42a72ce.js";import"./_commonjsHelpers-725317a4.js";import"./renderFlag-e247062b.js";const P={title:"Participants/Frill",tags:["autodocs"],render:({...g})=>S({...g})},r={configuration:{scaleAttributes:{scaleType:"RATING",accessor:"WTN"},bracketedSeeds:"square",flags:!0}},t={person:{iso2NationalityCode:"USA"},ratings:{SINGLES:{WTN:13.5}}},e={args:{individualParticipant:t,type:"flag",composition:r}},a={args:{individualParticipant:t,side:{seedValue:1},type:"seeding",composition:r}},s={args:{matchUp:{matchUpType:"SINGLES"},individualParticipant:t,side:{seedValue:1},type:"scale",composition:r}};var n,i,o;e.parameters={...e.parameters,docs:{...(n=e.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    individualParticipant,
    type: "flag",
    composition
  }
}`,...(o=(i=e.parameters)==null?void 0:i.docs)==null?void 0:o.source}}};var c,p,d;a.parameters={...a.parameters,docs:{...(c=a.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    individualParticipant,
    side: {
      seedValue: 1
    },
    type: "seeding",
    composition
  }
}`,...(d=(p=a.parameters)==null?void 0:p.docs)==null?void 0:d.source}}};var l,m,u;s.parameters={...s.parameters,docs:{...(l=s.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    matchUp: {
      matchUpType: "SINGLES"
    },
    individualParticipant,
    side: {
      seedValue: 1
    },
    type: "scale",
    composition
  }
}`,...(u=(m=s.parameters)==null?void 0:m.docs)==null?void 0:u.source}}};const U=["flag","seeding","WTN"];export{s as WTN,U as __namedExportsOrder,P as default,e as flag,a as seeding};
//# sourceMappingURL=frill.stories-63f3ca76.js.map
