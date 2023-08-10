import{c as p}from"./cmodal-c7bb61f0.js";import"./index-e42a72ce.js";function N(n){var t,e,o="";if(typeof n=="string"||typeof n=="number")o+=n;else if(typeof n=="object")if(Array.isArray(n))for(t=0;t<n.length;t++)n[t]&&(e=N(n[t]))&&(o&&(o+=" "),o+=e);else for(t in n)n[t]&&(o&&(o+=" "),o+=t);return o}function E(){for(var n,t,e=0,o="";e<arguments.length;)(n=arguments[e++])&&(t=N(n))&&(o&&(o+=" "),o+=t);return o}const v=n=>typeof n=="boolean"?"".concat(n):n===0?"0":n,h=E,P=(n,t)=>e=>{var o;if((t==null?void 0:t.variants)==null)return h(n,e==null?void 0:e.class,e==null?void 0:e.className);const{variants:s,defaultVariants:a}=t,c=Object.keys(s).map(l=>{const i=e==null?void 0:e[l],r=a==null?void 0:a[l];if(i===null)return null;const d=v(i)||v(r);return s[l][d]}),f=e&&Object.entries(e).reduce((l,i)=>{let[r,d]=i;return d===void 0||(l[r]=d),l},{}),V=t==null||(o=t.compoundVariants)===null||o===void 0?void 0:o.reduce((l,i)=>{let{class:r,className:d,...L}=i;return Object.entries(L).every(w=>{let[C,b]=w;return Array.isArray(b)?b.includes({...a,...f}[C]):{...a,...f}[C]===b})?[...l,r,d]:l},[]);return h(n,c,V,e==null?void 0:e.class,e==null?void 0:e.className)};function H({intent:n="primary",size:t="medium",label:e,onClick:o}={}){const s=P("button",{variants:{intent:{primary:["is-info"],secondary:["is-success"]},size:{medium:["font-medium"]}},compoundVariants:[{intent:"primary",size:"medium",textTransform:"uppercase"}],defaultVariants:{intent:"primary",size:"medium"}}),a=document.createElement("button");return a.className=s({intent:n,size:t}),a.innerHTML=e,a.onclick=()=>{typeof o=="function"&&o()},a}const F={title:"Forms/Modal",tags:["autodocs"],render:({...n})=>H({...n}),argTypes:{name:{control:"text"},seedNumber:{control:"text"},address:{control:"text"}}},u={args:{onClick:()=>{let n,t;t=[{label:"Title",onClick:()=>{t=t.filter(({label:a})=>a!=="Title"),n({title:"Something new",buttons:t})},close:!1},{label:"Content",onClick:()=>{t=t.filter(({label:a})=>a!=="Content"),n({content:"Like magic",buttons:t})},close:!1},{label:"Buttons",onClick:()=>n({buttons:[{label:"Ok"}]}),close:!1},{label:"Close"}],{update:n}=p.open({content:a=>{const c=document.createElement("div");return c.innerHTML="Content",a.appendChild(c),a},title:"Modal title",buttons:t})},label:"Modal updates"}},m={args:{onClick:()=>{let n;const t=()=>n({title:"Something new",buttons:[{label:"Ok"}]});({update:n}=p.open({buttons:[{label:"Add title",onClick:t,close:!1},{label:"Close"}],content:e=>{const o=document.createElement("div");return o.innerHTML="Begin with no title",e.appendChild(o),e}}))},label:"Add title"}},g={args:{intent:"secondary",label:"Config",onClick:()=>{let n,t,e={title:{padding:"1"},content:{padding:"2"},footer:{padding:"0"}};n=[{label:"Add padding",onClick:()=>{e.footer.padding="1",t({buttons:[{label:"Ok"}],config:e})},close:!1},{label:"Close"}],{update:t}=p.open({config:{title:{padding:"1"},content:{padding:"2"},footer:{padding:"0"}},content:"Content has 2em padding<p>Footer has no padding!",title:"Title has 1em padding",buttons:n})}}};var k,y,T;u.parameters={...u.parameters,docs:{...(k=u.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    onClick: () => {
      let update, buttons;
      const changeButtons = () => update({
        buttons: [{
          label: 'Ok'
        }]
      });
      const changeContent = () => {
        buttons = buttons.filter(({
          label
        }) => label !== 'Content');
        update({
          content: 'Like magic',
          buttons
        });
      };
      const changeTitle = () => {
        buttons = buttons.filter(({
          label
        }) => label !== 'Title');
        update({
          title: 'Something new',
          buttons
        });
      };
      buttons = [{
        label: 'Title',
        onClick: changeTitle,
        close: false
      }, {
        label: 'Content',
        onClick: changeContent,
        close: false
      }, {
        label: 'Buttons',
        onClick: changeButtons,
        close: false
      }, {
        label: 'Close'
      }];
      ({
        update
      } = cModal.open({
        content: elem => {
          const div = document.createElement('div');
          div.innerHTML = 'Content';
          elem.appendChild(div);
          return elem;
        },
        title: 'Modal title',
        buttons
      }));
    },
    label: 'Modal updates'
  }
}`,...(T=(y=u.parameters)==null?void 0:y.docs)==null?void 0:T.source}}};var M,O,A;m.parameters={...m.parameters,docs:{...(M=m.parameters)==null?void 0:M.docs,source:{originalSource:`{
  args: {
    onClick: () => {
      let update;
      const changeTitle = () => update({
        title: 'Something new',
        buttons: [{
          label: 'Ok'
        }]
      });
      ({
        update
      } = cModal.open({
        buttons: [{
          label: 'Add title',
          onClick: changeTitle,
          close: false
        }, {
          label: 'Close'
        }],
        content: elem => {
          const div = document.createElement('div');
          div.innerHTML = 'Begin with no title';
          elem.appendChild(div);
          return elem;
        }
      }));
    },
    label: 'Add title'
  }
}`,...(A=(O=m.parameters)==null?void 0:O.docs)==null?void 0:A.source}}};var B,S,x;g.parameters={...g.parameters,docs:{...(B=g.parameters)==null?void 0:B.docs,source:{originalSource:`{
  args: {
    intent: 'secondary',
    label: 'Config',
    onClick: () => {
      let buttons, update;
      let config = {
        title: {
          padding: '1'
        },
        content: {
          padding: '2'
        },
        footer: {
          padding: '0'
        }
      };
      const addPadding = () => {
        config.footer.padding = '1';
        update({
          buttons: [{
            label: 'Ok'
          }],
          config
        });
      };
      buttons = [{
        label: 'Add padding',
        onClick: addPadding,
        close: false
      }, {
        label: 'Close'
      }];
      ({
        update
      } = cModal.open({
        config: {
          title: {
            padding: '1'
          },
          content: {
            padding: '2'
          },
          footer: {
            padding: '0'
          }
        },
        content: 'Content has 2em padding<p>Footer has no padding!',
        title: 'Title has 1em padding',
        buttons
      }));
    }
  }
}`,...(x=(S=g.parameters)==null?void 0:S.docs)==null?void 0:x.source}}};const U=["Update","Title","Config"];export{g as Config,m as Title,u as Update,U as __namedExportsOrder,F as default};
//# sourceMappingURL=button.stories-31a2799a.js.map
