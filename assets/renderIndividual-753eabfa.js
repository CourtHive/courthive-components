import{_ as d}from"./index-e42a72ce.js";import{r as u,c as x}from"./renderFrill-fd8ed9a8.js";function $({variant:n}){return d({margin:"2.5px 0",variants:{variant:{showAddress:{lineHeight:"2.3em"}}}})({variant:n})}const v=d({justifyContent:"flex-start",alignItems:"center",whiteSpace:"nowrap",fontWeight:500,display:"flex"}),I=d({textTransform:"$participant$textTransform",fontSize:"0.875rem",fontWeight:500,variants:{variant:{winner:{fontWeight:700,color:"$winnerName"},loser:{fontWeight:500}}}}),F=d({"&::WebkitScrollbar":{display:"none"},justifyContent:"space-between",flexDirection:"column",marginInlineEnd:"0rem",scrollbarWidth:"none",overflowX:"scroll",fontWeight:500,display:"flex",width:"100%",variants:{variant:{doubles:{marginTop:"0.25rem",fontSize:"0.75rem",lineHeight:"1rem"}}}});function M({drawPosition:n,sideNumber:t}){return d({minHeight:"$participant$minHeight",justifyContent:"space-between",paddingInlineStart:"0.75rem",backgroundColor:"$matchUp",paddingInlineEnd:"0rem",boxSizing:"border-box",paddingBottom:".2rem",position:"relative",alignItems:"center",paddingTop:".2rem",minWidth:"15rem",cursor:"pointer",display:"flex",flexGrow:1,"& p":{fontFamily:"Sharp Sans, Arial, sans-serif",color:"$color"},variants:{sideNumber:{1:{borderBottom:"1px solid $internalDividers"}}}})({sideNumber:t,css:n&&{"&:before":{backgroundColor:"$backgroundColor",content:`${n}`,justifyContent:"center",alignContent:"center",insetInlineStart:-10,position:"absolute",color:"#55AFFE",display:"flex",width:20}}})}const N=d({textTransform:"uppercase",fontSize:"0.75rem",lineHeight:"1rem",marginInlineStart:".5rem",color:"$participant$seed"}),A=d({fontSize:"smaller",color:"gray"});function H({individualParticipant:n,composition:t,className:a,matchUp:s}){var f,y,c,l,b,g,o;const S=(f=t==null?void 0:t.configuration)==null?void 0:f.showAddress,p=(c=(y=n==null?void 0:n.person)==null?void 0:y.addresses)!=null&&c.length?Object.values(((b=(l=n.person)==null?void 0:l.addresses)==null?void 0:b[0])||{}).join(", "):" ";if(!S)return document.createElement("div");const h=(g=t==null?void 0:t.configuration)==null?void 0:g.scaleAttributes,i=(o=t==null?void 0:t.configuration)==null?void 0:o.flags,e=document.createElement("div");if(i||h){e.className=v();const C=u({type:i?"flag":"scale",individualParticipant:n,spacer:!0,composition:t,className:a,matchUp:s});e.appendChild(C);const m=document.createElement("div");m.className=x(A(),a),m.innerHTML=p,e.appendChild(m)}else e.className=x(A(),a),e.innerHTML=p;return e}const W="Qualifier",k="BYE",L="TBD";function z(n){var w;const{isWinningSide:t,side:a,individualParticipant:s,matchUp:S,composition:p}=n||{},h=t?"winner":void 0,i=n.eventHandlers||{},e=p==null?void 0:p.configuration,f=s==null?void 0:s.participantName,y=r=>{typeof(i==null?void 0:i.participantClick)=="function"&&(r.stopPropagation(),i.participantClick({individualParticipant:s,matchUp:S,event:r,side:a}))},c=document.createElement("div");c.onclick=y;const l=document.createElement("div");l.className=v({variant:h});const g=(e==null?void 0:e.flags)&&u({...n,type:"flag"});if(g)l.appendChild(g);else{const r=u({type:"scale",...n});r&&l.appendChild(r)}const o=document.createElement("div");if(o.className=I({variant:h}),f){const r=document.createElement("span");if(t&&(e!=null&&e.winnerColor))r.style.color=typeof e.winnerColor=="string"?e.winnerColor:"green";else if(e!=null&&e.genderColor){const E=(w=s==null?void 0:s.person)==null?void 0:w.sex,T=E==="MALE"&&"#2E86C1"||E==="FEMALE"&&"#AA336A"||"";r.style.color=typeof e.genderColor=="string"?e.genderColor:T}r.innerHTML=f,o.appendChild(r)}else{const r=document.createElement("abbr");r.className=$({variant:e.showAddress?"showAddress":""}),r.innerHTML=(a==null?void 0:a.bye)&&k||(a==null?void 0:a.qualifier)&&W||L,o.appendChild(r)}const C=u({...n,className:N(),type:"seeding"});C&&o.appendChild(C),l.appendChild(o),c.appendChild(l);const m=H(n);return c.appendChild(m),c}export{M as g,F as p,z as r};
//# sourceMappingURL=renderIndividual-753eabfa.js.map
