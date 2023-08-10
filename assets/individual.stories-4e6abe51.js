import{r as O}from"./renderIndividual-753eabfa.js";import"./index-e42a72ce.js";import"./renderFrill-fd8ed9a8.js";import"./_commonjsHelpers-725317a4.js";import"./renderFlag-e247062b.js";const K={title:"Participants/Individual",tags:["autodocs"],render:({...q})=>O({...q}),argTypes:{name:{control:"text"},seedNumber:{control:"text"},address:{control:"text"}}},l={configuration:{bracketedSeeds:"square",flags:!0,showAddress:!0}},n="Thornstein Veblen",a={args:{individualParticipant:{participantName:n},composition:{configuration:{flags:!1}}}},e={args:{individualParticipant:{participantName:n,person:{sex:"MALE"}},composition:{configuration:{flags:!1,genderColor:!0}}}},s={args:{individualParticipant:{participantName:"Zeta Moon",person:{sex:"FEMALE"}},composition:{configuration:{flags:!1,genderColor:!0}}}},r={args:{composition:{configuration:{flags:!1,winnerColor:!0}},individualParticipant:{participantName:n},isWinningSide:!0}},i={args:{individualParticipant:{person:{iso2NationalityCode:"USA"},participantName:n},side:{seedValue:1},composition:l}},t={args:{individualParticipant:{person:{iso2NationalityCode:"USA"},participantName:n},side:{seedValue:1},composition:{configuration:{seedingElement:"sup"}}}},o={args:{individualParticipant:{person:{iso2NationalityCode:"USA"},participantName:n},composition:l}},c={args:{individualParticipant:{participantName:n,person:{iso2NationalityCode:"USA",addresses:[{city:"Atlanta",state:"GA"}]}},matchUp:{matchUpType:"SINGLES"},composition:l}},d={args:{matchUp:{matchUpType:"SINGLES"},individualParticipant:{person:{addresses:[{city:"Atlanta",state:"GA"}]},ratings:{SINGLES:{WTN:13.5}},participantName:n},composition:{configuration:{scaleAttributes:{scaleType:"RATING",accessor:"WTN"},showAddress:!0}}}},p={args:{individualParticipant:{participantName:n,person:{iso2NationalityCode:"USA",addresses:[{city:"Atlanta",state:"GA"}]}},composition:{configuration:{showAddress:!0}}}};var u,m,g;a.parameters={...a.parameters,docs:{...(u=a.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    individualParticipant: {
      participantName
    },
    composition: {
      configuration: {
        flags: false
      }
    }
  }
}`,...(g=(m=a.parameters)==null?void 0:m.docs)==null?void 0:g.source}}};var A,S,N;e.parameters={...e.parameters,docs:{...(A=e.parameters)==null?void 0:A.docs,source:{originalSource:`{
  args: {
    individualParticipant: {
      participantName,
      person: {
        sex: 'MALE'
      }
    },
    composition: {
      configuration: {
        flags: false,
        genderColor: true
      }
    }
  }
}`,...(N=(S=e.parameters)==null?void 0:S.docs)==null?void 0:N.source}}};var f,v,y;s.parameters={...s.parameters,docs:{...(f=s.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    individualParticipant: {
      participantName: 'Zeta Moon',
      person: {
        sex: 'FEMALE'
      }
    },
    composition: {
      configuration: {
        flags: false,
        genderColor: true
      }
    }
  }
}`,...(y=(v=s.parameters)==null?void 0:v.docs)==null?void 0:y.source}}};var P,U,C;r.parameters={...r.parameters,docs:{...(P=r.parameters)==null?void 0:P.docs,source:{originalSource:`{
  args: {
    composition: {
      configuration: {
        flags: false,
        winnerColor: true
      }
    },
    individualParticipant: {
      participantName
    },
    isWinningSide: true
  }
}`,...(C=(U=r.parameters)==null?void 0:U.docs)==null?void 0:C.source}}};var G,E,h;i.parameters={...i.parameters,docs:{...(G=i.parameters)==null?void 0:G.docs,source:{originalSource:`{
  args: {
    individualParticipant: {
      person: {
        iso2NationalityCode: 'USA'
      },
      participantName
    },
    side: {
      seedValue: 1
    },
    composition
  }
}`,...(h=(E=i.parameters)==null?void 0:E.docs)==null?void 0:h.source}}};var T,I,L;t.parameters={...t.parameters,docs:{...(T=t.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    individualParticipant: {
      person: {
        iso2NationalityCode: 'USA'
      },
      participantName
    },
    side: {
      seedValue: 1
    },
    composition: {
      configuration: {
        seedingElement: 'sup'
      }
    }
  }
}`,...(L=(I=t.parameters)==null?void 0:I.docs)==null?void 0:L.source}}};var x,M,W;o.parameters={...o.parameters,docs:{...(x=o.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    individualParticipant: {
      person: {
        iso2NationalityCode: 'USA'
      },
      participantName
    },
    composition
  }
}`,...(W=(M=o.parameters)==null?void 0:M.docs)==null?void 0:W.source}}};var w,F,b;c.parameters={...c.parameters,docs:{...(w=c.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    individualParticipant: {
      participantName,
      person: {
        iso2NationalityCode: 'USA',
        addresses: [{
          city: 'Atlanta',
          state: 'GA'
        }]
      }
    },
    matchUp: {
      matchUpType: 'SINGLES'
    },
    composition
  }
}`,...(b=(F=c.parameters)==null?void 0:F.docs)==null?void 0:b.source}}};var V,_,B;d.parameters={...d.parameters,docs:{...(V=d.parameters)==null?void 0:V.docs,source:{originalSource:`{
  args: {
    matchUp: {
      matchUpType: 'SINGLES'
    },
    individualParticipant: {
      person: {
        addresses: [{
          city: 'Atlanta',
          state: 'GA'
        }]
      },
      ratings: {
        SINGLES: {
          WTN: 13.5
        }
      },
      participantName
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
}`,...(B=(_=d.parameters)==null?void 0:_.docs)==null?void 0:B.source}}};var R,Z,k;p.parameters={...p.parameters,docs:{...(R=p.parameters)==null?void 0:R.docs,source:{originalSource:`{
  args: {
    individualParticipant: {
      participantName,
      person: {
        iso2NationalityCode: 'USA',
        addresses: [{
          city: 'Atlanta',
          state: 'GA'
        }]
      }
    },
    composition: {
      configuration: {
        showAddress: true
      }
    }
  }
}`,...(k=(Z=p.parameters)==null?void 0:Z.docs)==null?void 0:k.source}}};const Q=["Basic","GenderedMale","GenderedFemale","WinnerColor","Seeded","supSeed","Unseeded","FlagAddress","scaleAddress","Address"];export{p as Address,a as Basic,c as FlagAddress,s as GenderedFemale,e as GenderedMale,i as Seeded,o as Unseeded,r as WinnerColor,Q as __namedExportsOrder,K as default,d as scaleAddress,t as supSeed};
//# sourceMappingURL=individual.stories-4e6abe51.js.map
