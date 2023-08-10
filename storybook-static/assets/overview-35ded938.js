import{r as x,M as g}from"./index-23fc2fff.js";import{u as m}from"./index-9256544b.js";import"./iframe-f28d2d4d.js";import"../sb-preview/runtime.js";import"./index-d475d2ea.js";import"./_commonjsHelpers-725317a4.js";import"./index-d37d4223.js";import"./index-d38538b0.js";import"./index-356e4a49.js";var d={exports:{}},o={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var f=x,h=Symbol.for("react.element"),u=Symbol.for("react.fragment"),b=Object.prototype.hasOwnProperty,k=f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,y={key:!0,ref:!0,__self:!0,__source:!0};function c(r,t,p){var i,n={},s=null,a=null;p!==void 0&&(s=""+p),t.key!==void 0&&(s=""+t.key),t.ref!==void 0&&(a=t.ref);for(i in t)b.call(t,i)&&!y.hasOwnProperty(i)&&(n[i]=t[i]);if(r&&r.defaultProps)for(i in t=r.defaultProps,t)n[i]===void 0&&(n[i]=t[i]);return{$$typeof:h,type:r,key:s,ref:a,props:n,_owner:k.current}}o.Fragment=u;o.jsx=c;o.jsxs=c;d.exports=o;var e=d.exports;const j=""+new URL("CourtHive-4c204489.png",import.meta.url).href;function l(r){const t=Object.assign({h1:"h1",p:"p"},m(),r.components);return e.jsxs(e.Fragment,{children:[e.jsx(g,{title:"Overview"}),`
`,e.jsx("style",{children:`
    .subheading {
      --mediumdark: '#999999';
      font-weight: 700;
      font-size: 13px;
      color: #999;
      letter-spacing: 6px;
      line-height: 24px;
      text-transform: uppercase;
      margin-bottom: 12px;
      margin-top: 40px;
    }

    .link-list {
      display: grid;
      grid-template-columns: 1fr;
      grid-template-rows: 1fr 1fr;
      row-gap: 10px;
    }

    @media (min-width: 620px) {
      .link-list {
        row-gap: 20px;
        column-gap: 20px;
        grid-template-columns: 1fr 1fr;
      }
    }

    @media all and (-ms-high-contrast:none) {
    .link-list {
        display: -ms-grid;
        -ms-grid-columns: 1fr 1fr;
        -ms-grid-rows: 1fr 1fr;
      }
    }

    .link-item {
      display: block;
      padding: 20px;
      border: 1px solid #00000010;
      border-radius: 5px;
      transition: background 150ms ease-out, border 150ms ease-out, transform 150ms ease-out;
      color: #333333;
      display: flex;
      align-items: flex-start;
    }

    .link-item:hover {
      border-color: #1EA7FD50;
      transform: translate3d(0, -3px, 0);
      box-shadow: rgba(0, 0, 0, 0.08) 0 3px 10px 0;
    }

    .link-item:active {
      border-color: #1EA7FD;
      transform: translate3d(0, 0, 0);
    }

    .link-item strong {
      font-weight: 700;
      display: block;
      margin-bottom: 2px;
    }

    .link-item img {
      height: 40px;
      width: 40px;
      margin-right: 15px;
      flex: none;
    }

    .link-item span,
    .link-item p {
      margin: 0;
      font-size: 14px;
      line-height: 20px;
    }

    .tip {
      display: inline-block;
      border-radius: 1em;
      font-size: 11px;
      line-height: 12px;
      font-weight: 700;
      background: #E7FDD8;
      color: #66BF3C;
      padding: 4px 12px;
      margin-right: 10px;
      vertical-align: top;
    }

    .tip-wrapper {
      font-size: 13px;
      line-height: 20px;
      margin-top: 40px;
      margin-bottom: 40px;
    }

    .tip-wrapper code {
      font-size: 12px;
      display: inline-block;
    }
  `}),`
`,e.jsx(t.h1,{id:"tmx-components",children:"TMX Components"}),`
`,e.jsx("div",{className:"subheading",children:"Playground"}),`
`,e.jsx("div",{className:"link-list",children:e.jsxs("a",{className:"link-item",href:"https://courthive.github.io/tods-competition-factory/",target:"_blank",children:[e.jsx("img",{style:{width:"4em"},src:j,alt:"logo"}),e.jsx("span",{children:e.jsxs(t.p,{children:[e.jsx("strong",{children:"Competition Factory"}),`
Components to exercise the factory.`]})})]})})]})}function M(r={}){const{wrapper:t}=Object.assign({},m(),r.components);return t?e.jsx(t,Object.assign({},r,{children:e.jsx(l,r)})):l(r)}export{M as default};
//# sourceMappingURL=overview-35ded938.js.map
