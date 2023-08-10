import{_ as f}from"./index-e42a72ce.js";const _=f({willChange:"opacity",position:"fixed",zIndex:9998,bottom:0,right:0,left:0,top:0}),q=f({display:"block"}),G=f({position:"fixed",right:0,left:0}),J=f({paddingRight:"15px",alignItems:"center",margin:"30px auto",paddingLeft:"15px",position:"fixed",height:"100vh",display:"flex",width:"100%",zIndex:9999,bottom:0,right:0,left:0,top:0}),K=f({boxShadow:"0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)",backgroundColor:"white",position:"relative",borderRadius:"3px",minHeight:"auto",width:"100%"}),Q=f({borderBottom:"1px solid rgba(0, 0, 0, 0.1)",alignItems:"center",position:"relative",display:"flex"}),X=f({fontWeight:"600",fontSize:"20px"}),P=f({borderTop:"1px solid rgba(0, 0, 0, 0.1)",justifyContent:"right",alignItems:"center",position:"relative",display:"flex"}),$="Nothing to see here";function v(d){return typeof d=="function"}function k(d){return typeof d=="string"}function O(d){return Array.isArray(d)}function w(d){return typeof d=="object"&&!Array.isArray(d)}function Z(d){if(d)for(;d.firstChild;)d.removeChild(d.firstChild)}const W=(()=>{const d=G(),L={},N=".5";let x=[],S,B=[],b=[],r;const D=t=>{if(t){let n;b=b.filter(s=>(s.id===t&&(n=s),s.id!==t)),n&&document.body.removeChild(n)}else{const n=b.pop();n&&document.body.removeChild(n)}},R=()=>{r&&(r.style.opacity=0,r.style.display="none")},E=t=>{const n=b.length;if(t&&L[n]===!1)return;const s=B.pop(),i=x.pop();v(s)&&s({content:i}),document.body.classList.remove(d),document.body.style.top=null,window.scrollTo({top:S,behavior:"instant"}),R(),D()},V=()=>{r=document.createElement("div"),r.className=_(),r.id="cmdl-backdrop",r.onclick=()=>E(!0),document.body.appendChild(r)},Y=({config:t})=>{S=window.scrollY,document.body.classList.add(d),document.body.style.top=`-${S}px`,r||V(),r.style.display="",(t==null?void 0:t.backdrop)!==!1&&(r.style.backgroundColor="rgba(0, 0, 0, 0.2)",r.style.transition="opacity 0.15s linear",r.style.opacity=1)},H=({config:t,attr:n})=>{if(!k(n))return;const s=n.split(".");for(const i of s)if(t=t==null?void 0:t[i],!t)return;return t},C=({config:t,attr:n,attrs:s,unit:i="em",value:o})=>{var p;let y;return k(n)?y=H({config:t,attr:n}):O(s)&&(y=(p=s.map(c=>H({config:t,attr:c})).filter(Boolean))==null?void 0:p[0]),y!==void 0&&(o=y),isNaN(o)?o:`${o}${i}`},A=({buttons:t,config:n,modalNumber:s})=>{var y,p;const i=document.createElement("div");i.className=P(),i.style.padding=C({config:n,attrs:["footer.padding","padding"],value:N});const o={label:((y=n==null?void 0:n.dictionary)==null?void 0:y.close)||"Close",onClick:W.close,intent:"is-info"};for(const c of t){if(c.hide)continue;const l=Object.assign({},o);w(c)&&Object.assign(l,c);const a=document.createElement("button");l.disabled!==void 0&&(a.disabled=l.disabled),l.id&&(a.id=l.id),a.className=((p=l==null?void 0:l.footer)==null?void 0:p.className)||"button font-medium",a.classList.add(l.intent),a.style="margin-right: .5em;",a.innerHTML=l.label||l.text,a.onclick=m=>{m.stopPropagation(),v(l.onClick)&&l.onClick({e:m,content:x[s]}),l.close!==!1&&(v(l.close)&&l.close(),W.close())},i.appendChild(a)}return i};return{close:E,open:({title:t="",content:n,buttons:s,footer:i,config:o,onClose:y}={})=>{Y({config:o}),B.push(y);const p=b.length+1;L[p]=o==null?void 0:o.clickAway;const c=document.createElement("section"),l=`cmdl-${p}`;c.className=q(),c.role="dialog",c.tabIndex=-1,c.id=l;const a=document.createElement("div");a.className=J(),a.style.maxWidth=`${(o==null?void 0:o.maxWidth)||450}px`,a.onclick=()=>E(!0);const m=document.createElement("div");m.className=K(),m.onclick=e=>e.stopPropagation();const g=document.createElement("div"),T=document.createElement("div");g.appendChild(T),m.appendChild(g);const M=({title:e,config:u})=>{g.className=e?Q():"",g.style.padding=C({config:u,attrs:["title.padding","padding"],value:N}),T.className=e?X():"",T.innerHTML=e};t&&M({title:t});const h=document.createElement("div");m.appendChild(h);const z=({content:e,config:u})=>{h.style.fontSize=C({config:u,attr:"fontSize",value:"15px"}),h.style.position="relative",h.style.padding=C({config:u,attrs:["content.padding","padding"],value:N}),v(e)?x[p]=e(h):w(e)?h.appendChild(e):k(e)?h.innerHTML=e:h.innerHTML=$};if(z({content:n,config:o}),O(s))i=A({buttons:s,config:o,modalNumber:p}),m.appendChild(i);else if(i){const e=document.createElement("div");e.className=P(),e.style.padding=C({config:o,attrs:["footer.padding","padding"]}),w(i)?e.appendChild(i):k(i)?e.innerHTML=i:e.innerHTML=$,m.appendChild(e)}a.appendChild(m),c.appendChild(a),document.body.appendChild(c),b.push(c);const F=({content:e,config:u})=>{x[p]=void 0,Z(h),z({content:e,config:u})},I=({buttons:e,config:u})=>{m.removeChild(i),i=A({buttons:e,config:u,modalNumber:p}),m.appendChild(i)};return{setContent:F,setButtons:I,update:({content:e,buttons:u,title:j,config:U})=>{o=U||o,e&&F({content:e,config:o}),u&&I({buttons:u,config:o}),j&&M({title:j,config:o})}}}}})();export{W as c};
//# sourceMappingURL=cmodal-c7bb61f0.js.map