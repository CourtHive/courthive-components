import{r as x}from"./renderParticipant-ac38c69b.js";import{c as _,r as Q}from"./compositions-b1edfb65.js";import{_ as R}from"./index-e42a72ce.js";import{d as j,u as q,m as B,f as G,t as I}from"./renderFlag-e247062b.js";import{r as H}from"./renderRound-fb085548.js";import{c as V}from"./cmodal-c7bb61f0.js";import"./renderIndividual-753eabfa.js";import"./renderFrill-fd8ed9a8.js";import"./_commonjsHelpers-725317a4.js";import"./renderStatusPill-1bd9396c.js";import"./renderTick-623d7066.js";import"./renderSide-267726cb.js";import"./scoreStyles-36a1f551.js";const Y=R({marginInlineStart:"1rem",overflowX:"auto",display:"flex"});function X({selectedMatchUpId:e,eventHandlers:n,searchActive:r,composition:t,matchUps:o}){const{roundNumbers:i,hasOddMatchUpsCount:s}=j.getRoundMatchUps({matchUps:o}),u=s,a=document.createElement("div");a.className=Y();for(const d of i){const l=H({selectedMatchUpId:e,eventHandlers:n,searchActive:r,composition:t,roundNumber:d,matchUps:o,isLucky:u});a.appendChild(l)}return a}function F({matchUpFormat:e="SET5-S:6/TB7",completeAllMatchUps:n=!0,autoSchedule:r=!0,participantsCount:t,completionGoal:o,addQualifying:i,drawSize:s=4,eventType:u,drawType:a}={}){const d=o<100?Math.floor(s*.01*o):void 0;t=t||s;const c={completionGoal:d,participantsCount:t,matchUpFormat:e,seedsCount:8,eventType:u,drawType:a,drawSize:s,drawId:"drawId"};return i&&(c.qualifyingProfiles=[{structureProfiles:[{drawSize:16,qualifyingPositions:4}]}]),a==="AD_HOC"&&Object.assign(c,{drawMatic:!0,roundsCount:3}),J({drawProfile:c,completeAllMatchUps:n,autoSchedule:r})}function J({drawProfile:e,completeAllMatchUps:n,autoSchedule:r}){const t="drawId",o="venueId",i="08:00",s="20:00",u=q.dateTime.extractDate(new Date().toISOString()),a=[e],d=[{venueId:o,venueName:"Venue",venueAbbreviation:"VNU",courtNames:["One","Two","Three"],courtIds:["c1","c2","c3"],courtsCount:8,startTime:i,endTime:s}],l=[{scheduleDate:u,venues:[{venueId:o,rounds:[{drawId:t,roundNumber:1},{drawId:t,roundNumber:2}]}]}],c=B.generateTournamentRecord({policyDefinitions:G.policies.POLICY_SCHEDULING_NO_DAILY_LIMITS,scheduleCompletedMatchUps:!0,completeAllMatchUps:n,schedulingProfile:l,autoSchedule:r,venueProfiles:d,drawProfiles:a,startDate:u});if(c.error)return c;const{eventIds:[p],tournamentRecord:C}=c;I.setState(C);const{eventData:L}=I.getEventData({participantsProfile:{withIOC:!0,withISO2:!0},eventId:p})||{};return{eventData:L}}const K={composition:{options:Object.keys(_),control:{type:"select"}}},W={centerInfoClick:()=>console.log("centerInfo click"),participantClick:({individualParticipant:e,matchUp:n,side:r})=>{console.log({individualParticipant:e,matchUp:n,side:r})},scheduleClick:()=>console.log("schedule click"),scoreClick:({matchUp:e})=>{if(!e.readyToScore&&!e.winningSide)return;const n={configuration:{bracketedSeeds:"square",flags:!0,showAddress:!0}},r=e.sides.map(({participant:o})=>o),t=x({participant:r[0],matchUp:e,composition:n});V.open({buttons:[{label:"Ok",onClick:o=>console.log(o)}],config:{backdrop:!0,padding:".5",clickAway:!0},onClose:()=>console.log("modal closed"),content:t})},venueClick:()=>console.log("venue click")},le={title:"Draws/Structure",tags:["autodocs"],render:({...e})=>{var d,l,c,p;const n=_[e.composition||"Australian"],{eventData:r}=F({...e})||{},t=((l=(d=r==null?void 0:r.drawsData)==null?void 0:d[0])==null?void 0:l.structures)||[],o=(c=t[0])==null?void 0:c.structureId,i=t==null?void 0:t.find(C=>C.structureId===o),s=i==null?void 0:i.roundMatchUps,u=s?(p=Object.values(s))==null?void 0:p.flat():[],a=X({...e,eventHandlers:W,composition:n,matchUps:u});return Q({theme:n.theme,content:a})},argTypes:K},m={args:{drawSize:32,participantsCount:14,completionGoal:40}},f={args:{drawSize:16,participantsCount:14,eventType:"DOUBLES"}},g={args:{drawSize:16,participantsCount:14,completeAllMatchUps:!1,composition:"National"}},S={args:{drawSize:16,participantsCount:14,addQualifying:!0}},w={args:{completeAllMatchUps:!1,eventType:"TEAM",drawSize:4}};var v,h,y;m.parameters={...m.parameters,docs:{...(v=m.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    drawSize: 32,
    participantsCount: 14,
    completionGoal: 40
  }
}`,...(y=(h=m.parameters)==null?void 0:h.docs)==null?void 0:y.source}}};var T,D,k;f.parameters={...f.parameters,docs:{...(T=f.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    drawSize: 16,
    participantsCount: 14,
    eventType: 'DOUBLES'
  }
}`,...(k=(D=f.parameters)==null?void 0:D.docs)==null?void 0:k.source}}};var b,M,O;g.parameters={...g.parameters,docs:{...(b=g.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    drawSize: 16,
    participantsCount: 14,
    completeAllMatchUps: false,
    composition: 'National'
  }
}`,...(O=(M=g.parameters)==null?void 0:M.docs)==null?void 0:O.source}}};var N,E,A;S.parameters={...S.parameters,docs:{...(N=S.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    drawSize: 16,
    participantsCount: 14,
    addQualifying: true
  }
}`,...(A=(E=S.parameters)==null?void 0:E.docs)==null?void 0:A.source}}};var P,U,z;w.parameters={...w.parameters,docs:{...(P=w.parameters)==null?void 0:P.docs,source:{originalSource:`{
  args: {
    completeAllMatchUps: false,
    eventType: 'TEAM',
    drawSize: 4
  }
}`,...(z=(U=w.parameters)==null?void 0:U.docs)==null?void 0:z.source}}};const pe=["Singles","Doubles","National","Qualifying","Team"];export{f as Doubles,g as National,S as Qualifying,m as Singles,w as Team,pe as __namedExportsOrder,le as default};
//# sourceMappingURL=structure.stories-0edc9c30.js.map
