import{_ as h}from"./index-e42a72ce.js";import{g as w}from"./_commonjsHelpers-725317a4.js";import{r as N}from"./renderFlag-e247062b.js";function T({className:t,composition:s,side:n}){const r=(n==null?void 0:n.seedValue)||(n==null?void 0:n.seedNumber);if(!r)return"";const f=(s==null?void 0:s.configuration)||{},{bracketedSeeds:e}=f,l=typeof e=="boolean"&&["(",")"]||e==="square"&&["[","]"]||["",""],c=`${l[0]}${r}${l[1]}`,o=f.seedingElement==="sup"?"sup":"span",u=document.createElement(o);return u.className=t,u.innerHTML=c,u}const j=h({WebkitBoxSizing:"border-box",display:"inline-block",boxSizing:"border-box",marginInlineStart:2,position:"relative",fontSize:"smaller",fontWeight:"bold",marginInlineEnd:2,borderRadius:2,width:"1.8rem",color:"blue"});var y={exports:{}};/*!
	Copyright (c) 2018 Jed Watson.
	Licensed under the MIT License (MIT), see
	http://jedwatson.github.io/classnames
*/(function(t){(function(){var s={}.hasOwnProperty;function n(){for(var r=[],f=0;f<arguments.length;f++){var e=arguments[f];if(e){var l=typeof e;if(l==="string"||l==="number")r.push(e);else if(Array.isArray(e)){if(e.length){var c=n.apply(null,e);c&&r.push(c)}}else if(l==="object"){if(e.toString!==Object.prototype.toString&&!e.toString.toString().includes("[native code]")){r.push(e.toString());continue}for(var o in e)s.call(e,o)&&e[o]&&r.push(o)}}}return r.join(" ")}t.exports?(n.default=n,t.exports=n):window.classNames=n})()})(y);var k=y.exports;const v=w(k);function I({individualParticipant:t,composition:s,className:n,matchUp:r,spacer:f}){var S,x,m;const e=(r==null?void 0:r.matchUpType)||"SINGLES",l=(S=t==null?void 0:t.ratings)==null?void 0:S[e],c=(x=t==null?void 0:t.rankings)==null?void 0:x[e],o=(m=s==null?void 0:s.configuration)==null?void 0:m.scaleAttributes,u=o==null?void 0:o.scaleType,E=o==null?void 0:o.accessor,a=u==="RATING"?l:c,b=!f&&(a==null?void 0:a[E]),g=document.createElement("span");return(b||f)&&(g.className=v(n,j())),g.innerHTML=b||"",g}function O({individualParticipant:t,composition:s,className:n,matchUp:r,spacer:f,side:e,type:l}){if(l==="scale")return I({individualParticipant:t,composition:s,className:n,matchUp:r,spacer:f});const c=(s==null?void 0:s.configuration)||{},o=document.createElement("div");return l==="flag"&&c.flags&&N({className:n,matchUp:r,individualParticipant:t,spacer:f})||l==="seeding"&&T({className:n,composition:s,matchUp:r,side:e})||o}export{v as c,O as r};
//# sourceMappingURL=renderFrill-fd8ed9a8.js.map
