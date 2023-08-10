import{r as H}from"./renderParticipant-ac38c69b.js";import{g as J}from"./generateMatchUps-b96e6c58.js";import"./renderIndividual-753eabfa.js";import"./index-e42a72ce.js";import"./renderFrill-fd8ed9a8.js";import"./_commonjsHelpers-725317a4.js";import"./renderFlag-e247062b.js";import"./renderStatusPill-1bd9396c.js";import"./renderTick-623d7066.js";const te={title:"Participants/Participant",tags:["autodocs"],render:({eventType:x,outcomes:Y,randomWinningSide:q,participant:p,...d})=>{const{matchUps:z}=J({...d,randomWinningSide:q,drawSize:2,eventType:x,outcomes:Y}),j=p?void 0:z[0];return H({...d,participant:p,matchUp:j})},argTypes:{}},e={configuration:{bracketedSeeds:"square",flags:!0,showAddress:!0}},n={args:{participant:{participantName:"Normal person",person:{iso2NationalityCode:"USA"}},composition:e}},r={args:{participant:{ratings:{SINGLES:{WTN:12.5}},participantName:"Normal person",person:{addresses:[{city:"Buffalo",state:"NY"}]}},composition:{configuration:{scaleAttributes:{scaleType:"RATING",accessor:"WTN"},showAddress:!0}}}},s={args:{sideNumber:1,composition:e}},o={args:{randomWinningSide:!1,sideContainer:!0,sideNumber:1,composition:e}},t={args:{outcomes:[{stage:"MAIN",roundNumber:1,roundPosition:1,scoreString:"6-1 2-2",matchUpStatus:"RETIRED",winningSide:2}],sideContainer:!0,sideNumber:1,composition:e}},a={args:{outcomes:[{stage:"MAIN",roundNumber:1,roundPosition:1,matchUpStatus:"DEFAULTED",winningSide:2}],sideContainer:!0,sideNumber:1,composition:e}},i={args:{outcomes:[{matchUpStatus:"WALKOVER",roundNumber:1,roundPosition:1,winningSide:2,stage:"MAIN"}],sideContainer:!0,sideNumber:1,composition:e}},c={args:{outcomes:[{stage:"MAIN",roundNumber:1,roundPosition:1,matchUpStatus:"DOUBLE_WALKOVER"}],sideContainer:!0,sideNumber:2,composition:e}},u={args:{composition:{configuration:{flags:!1}},eventType:"DOUBLES",sideNumber:1}},m={args:{composition:{configuration:{flags:!0,showAddress:!0}},eventType:"DOUBLES",sideNumber:1}};var g,l,N;n.parameters={...n.parameters,docs:{...(g=n.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    participant: {
      participantName: 'Normal person',
      person: {
        iso2NationalityCode: 'USA'
      }
    },
    composition
  }
}`,...(N=(l=n.parameters)==null?void 0:l.docs)==null?void 0:N.source}}};var S,b,A;r.parameters={...r.parameters,docs:{...(S=r.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    participant: {
      ratings: {
        SINGLES: {
          WTN: 12.5
        }
      },
      participantName: 'Normal person',
      person: {
        addresses: [{
          city: 'Buffalo',
          state: 'NY'
        }]
      }
    },
    composition: {
      configuration: {
        scaleAttributes: {
          scaleType: 'RATING',
          accessor: 'WTN'
        },
        showAddress: true
      }
    }
  }
}`,...(A=(b=r.parameters)==null?void 0:b.docs)==null?void 0:A.source}}};var f,E,U;s.parameters={...s.parameters,docs:{...(f=s.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    sideNumber: 1,
    composition
  }
}`,...(U=(E=s.parameters)==null?void 0:E.docs)==null?void 0:U.source}}};var D,T,W;o.parameters={...o.parameters,docs:{...(D=o.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    randomWinningSide: false,
    sideContainer: true,
    sideNumber: 1,
    composition
  }
}`,...(W=(T=o.parameters)==null?void 0:T.docs)==null?void 0:W.source}}};var h,P,I;t.parameters={...t.parameters,docs:{...(h=t.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    outcomes: [
    // prettier-ignore
    {
      stage: 'MAIN',
      roundNumber: 1,
      roundPosition: 1,
      scoreString: '6-1 2-2',
      matchUpStatus: 'RETIRED',
      winningSide: 2
    }],
    sideContainer: true,
    sideNumber: 1,
    composition
  }
}`,...(I=(P=t.parameters)==null?void 0:P.docs)==null?void 0:I.source}}};var L,w,C;a.parameters={...a.parameters,docs:{...(L=a.parameters)==null?void 0:L.docs,source:{originalSource:`{
  args: {
    outcomes: [
    // prettier-ignore
    {
      stage: 'MAIN',
      roundNumber: 1,
      roundPosition: 1,
      matchUpStatus: 'DEFAULTED',
      winningSide: 2
    }],
    sideContainer: true,
    sideNumber: 1,
    composition
  }
}`,...(C=(w=a.parameters)==null?void 0:w.docs)==null?void 0:C.source}}};var R,y,O;i.parameters={...i.parameters,docs:{...(R=i.parameters)==null?void 0:R.docs,source:{originalSource:`{
  args: {
    outcomes: [
    // prettier-ignore
    {
      matchUpStatus: "WALKOVER",
      roundNumber: 1,
      roundPosition: 1,
      winningSide: 2,
      stage: "MAIN"
    }],
    sideContainer: true,
    sideNumber: 1,
    composition
  }
}`,...(O=(y=i.parameters)==null?void 0:y.docs)==null?void 0:O.source}}};var M,v,B;c.parameters={...c.parameters,docs:{...(M=c.parameters)==null?void 0:M.docs,source:{originalSource:`{
  args: {
    outcomes: [
    // prettier-ignore
    {
      stage: 'MAIN',
      roundNumber: 1,
      roundPosition: 1,
      matchUpStatus: 'DOUBLE_WALKOVER'
    }],
    sideContainer: true,
    sideNumber: 2,
    composition
  }
}`,...(B=(v=c.parameters)==null?void 0:v.docs)==null?void 0:B.source}}};var k,_,F;u.parameters={...u.parameters,docs:{...(k=u.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    composition: {
      configuration: {
        flags: false
      }
    },
    eventType: 'DOUBLES',
    sideNumber: 1
  }
}`,...(F=(_=u.parameters)==null?void 0:_.docs)==null?void 0:F.source}}};var G,K,V;m.parameters={...m.parameters,docs:{...(G=m.parameters)==null?void 0:G.docs,source:{originalSource:`{
  args: {
    composition: {
      configuration: {
        flags: true,
        showAddress: true
      }
    },
    eventType: 'DOUBLES',
    sideNumber: 1
  }
}`,...(V=(K=m.parameters)==null?void 0:K.docs)==null?void 0:V.source}}};const ae=["ParticipantFlag","ParticipantWTN","Singles","SinglesWon","SinglesRetired","SinglesDefaulted","SinglesWalkover","SinglesDoubleWalkover","Doubles","DoublesAddress"];export{u as Doubles,m as DoublesAddress,n as ParticipantFlag,r as ParticipantWTN,s as Singles,a as SinglesDefaulted,c as SinglesDoubleWalkover,t as SinglesRetired,i as SinglesWalkover,o as SinglesWon,ae as __namedExportsOrder,te as default};
//# sourceMappingURL=participant.stories-63276be0.js.map
