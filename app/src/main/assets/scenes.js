/* StagePromt live background scenes – shared by the app and the cast viewer.
   window.Scene.start(container, id, opts) -> handle {stop()} ; window.Scene.has(id) */
(function(){
const TAU=Math.PI*2;
function rng(seed){let s=seed>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function ridge(seed,n,amp,rough){const r=rng(seed);const y=new Float32Array(n);let a=amp,f=2;for(let o=0;o<7;o++){const p=[];for(let i=0;i<=f;i++)p.push(r()*2-1);for(let i=0;i<n;i++){const x=i/(n-1)*f,k=Math.floor(x),t=x-k;y[i]+=(p[k]*(1-t)+(p[Math.min(f,k+1)])*t)*a}a*=rough;f*=2}return y}
function grad(ctx,W,H,stops){const g=ctx.createLinearGradient(0,0,0,H);stops.forEach(([p,c])=>g.addColorStop(p,c));ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
function glow(ctx,x,y,r,c,a){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,c);g.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=a==null?1:a;ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.globalAlpha=1}
function rgba(c,a){return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'}
function off(W,H,fn){const c=document.createElement('canvas');c.width=W;c.height=H;fn(c.getContext('2d'),W,H);return c}
function stars(r,n,W,H,ymax){const s=[];for(let i=0;i<n;i++)s.push({x:r()*W,y:r()*H*(ymax||.6),s:.4+r()*1.1,p:r()*TAU,w:.5+r()*1.5});return s}
function drawStars(ctx,st,t,k){st.forEach(s=>{const a=.45+.55*Math.abs(Math.sin(t*s.w*(k||1)+s.p));ctx.fillStyle='rgba(255,255,255,'+a.toFixed(2)+')';ctx.fillRect(s.x,s.y,s.s,s.s)})}
function layerPath(ctx,W,H,ys,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,H);for(let i=0;i<ys.length;i++)ctx.lineTo(i/(ys.length-1)*W,ys[i]);ctx.lineTo(W,H);ctx.closePath();ctx.fill()}
function treeRow(r,W,ys,h){const t=[];let x=0;while(x<W){const i=Math.min(ys.length-1,Math.round(x/W*(ys.length-1)));const th=(.5+r()*.7)*h;t.push({x,y:ys[i],h:th,w:th*.32,p:r()*TAU});x+=(.4+r()*.7)*th*.38}return t}
function drawTrees(ctx,trees,col,t,amt){ctx.fillStyle=col;ctx.beginPath();trees.forEach(tr=>{const sw=Math.sin(t*.55+tr.p)*tr.h*amt;ctx.moveTo(tr.x+sw,tr.y-tr.h);ctx.quadraticCurveTo(tr.x-tr.w*.2+sw*.4,tr.y-tr.h*.4,tr.x-tr.w,tr.y+2);ctx.lineTo(tr.x+tr.w,tr.y+2);ctx.quadraticCurveTo(tr.x+tr.w*.2+sw*.4,tr.y-tr.h*.4,tr.x+sw,tr.y-tr.h)});ctx.fill()}

/* ---------- scene factories: each returns draw(ctx,W,H,t) after init ---------- */
const S={};
function beams(cols,bg,n,seed){return (W,H)=>{const r=rng(seed);const bs=[];for(let k=0;k<n;k++)bs.push({x:W*(.08+.84*k/(n-1))+(r()-.5)*W*.03,a:(r()-.5)*.5+(k-(n-1)/2)*.07,amp:.18+r()*.16,sp:.10+r()*.08,ph:r()*TAU,c:cols[k%cols.length],w:.045+r()*.02});
 const base=off(W,H,(c)=>{grad(c,W,H,bg);const rr=rng(seed+9);for(let i=0;i<40;i++)glow(c,rr()*W,rr()*H,W*(.08+rr()*.15),'rgba(255,255,255,0.05)')});
 return (ctx,t)=>{ctx.drawImage(base,0,0);ctx.globalCompositeOperation='lighter';
  bs.forEach(b=>{const ang=b.a+Math.sin(t*b.sp+b.ph)*b.amp,L=H*1.5,dx=Math.sin(ang),dy=Math.cos(ang),hw=W*b.w;
   const x0=b.x,y0=-H*.03,x1=x0+dx*L,y1=y0+dy*L;const g=ctx.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,rgba(b.c,.32));g.addColorStop(.6,rgba(b.c,.07));g.addColorStop(1,rgba(b.c,0));
   ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x0-dy*3,y0+dx*3);ctx.lineTo(x1-dy*hw*2.2,y1+dx*hw*2.2);ctx.lineTo(x1+dy*hw*2.2,y1-dx*hw*2.2);ctx.lineTo(x0+dy*3,y0-dx*3);ctx.closePath();ctx.fill();
   ctx.globalAlpha=.55;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1-dy*hw*.8,y1+dx*hw*.8);ctx.lineTo(x1+dy*hw*.8,y1-dx*hw*.8);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
   glow(ctx,x0,4,W*.03,rgba(b.c,.9))});
  ctx.globalCompositeOperation='source-over'}}}
S['stage-blue']=beams([[70,130,255],[120,170,255],[40,90,230]],[[0,'#02040e'],[1,'#060a1e']],7,1);
S['stage-amber']=beams([[255,170,60],[255,200,110],[255,130,40]],[[0,'#0e0602'],[1,'#1c0c04']],6,2);
S['concert-purple']=beams([[200,60,255],[255,60,170],[110,70,255]],[[0,'#0a0212'],[1,'#18041e']],8,3);
S['stage-green']=beams([[60,255,120],[120,255,170],[40,220,90]],[[0,'#020e06'],[1,'#04180a']],7,4);
S['concert-red']=beams([[255,60,60],[255,120,60],[255,40,110]],[[0,'#120202'],[1,'#1e0406']],8,5);
S['underwater']=beams([[140,230,255],[180,240,255]],[[0,'#0a5a82'],[1,'#020f23']],9,18);
S['deep-purple']=beams([[190,140,255],[220,170,255]],[[0,'#3a1a82'],[1,'#0a0423']],9,19);
function bokeh(cols,bg,n,seed,rain){return (W,H)=>{const r=rng(seed);const ps=[];for(let i=0;i<n;i++)ps.push({x:r()*W,y:r()*H,r:W*(.012+r()*.05),c:cols[Math.floor(r()*cols.length)],a:.15+r()*.3,vx:(r()-.5)*W*.006,vy:-(.2+r())*H*.004,p:r()*TAU});
 const drops=[];if(rain)for(let i=0;i<90;i++)drops.push({x:r()*W,y:r()*H,l:H*(.03+r()*.04),v:H*(.35+r()*.3)});
 const base=off(W,H,c=>grad(c,W,H,bg));
 return (ctx,t,dt)=>{ctx.drawImage(base,0,0);ctx.globalCompositeOperation='lighter';
  ps.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.y<-p.r)p.y=H+p.r;if(p.x<-p.r)p.x=W+p.r;if(p.x>W+p.r)p.x=-p.r;const a=p.a*(.75+.25*Math.sin(t*.6+p.p));const g=ctx.createRadialGradient(p.x,p.y,p.r*.55,p.x,p.y,p.r);g.addColorStop(0,rgba(p.c,a));g.addColorStop(1,rgba(p.c,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fill()});
  ctx.globalCompositeOperation='source-over';
  if(rain){ctx.strokeStyle='rgba(200,220,255,.28)';ctx.lineWidth=1;ctx.beginPath();drops.forEach(d=>{d.y+=d.v*dt;if(d.y>H)d.y=-d.l;ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-d.l*.15,d.y+d.l)});ctx.stroke()}}}}
S['bokeh-gold']=bokeh([[255,190,90],[255,150,50],[255,220,150]],[[0,'#120a04'],[1,'#060302']],45,4);
S['bokeh-blue']=bokeh([[60,200,230],[80,150,255],[140,230,255]],[[0,'#020c14'],[1,'#02040a']],45,5);
S['bokeh-pink']=bokeh([[255,100,190],[230,90,255],[255,160,220]],[[0,'#14020c'],[1,'#0a0206']],45,6);
S['city-rain']=bokeh([[255,90,70],[255,200,80],[80,160,255],[255,255,255]],[[0,'#04060c'],[1,'#0a0812']],70,16,true);
S['calm-mesh']=(W,H)=>{const bl=[[.2,.3,[90,60,200],.45,.07],[.8,.25,[220,90,160],.4,.05],[.6,.8,[40,160,200],.45,.06],[.1,.9,[30,40,110],.4,.04]];
 return (ctx,t)=>{ctx.fillStyle='#05040c';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='lighter';bl.forEach(([x,y,c,s,sp],i)=>{glow(ctx,W*(x+.08*Math.sin(t*sp+i)),H*(y+.08*Math.cos(t*sp*1.3+i)),W*s*1.6,rgba(c,.55))});ctx.globalCompositeOperation='source-over'}};
function aurora(c1,c2,seed,lake){return (W,H)=>{const r=rng(seed),st=stars(r,180,W,H,lake?.55:.85);let e,tr;if(lake){e=Array.from(ridge(70,64,H*.03,.5),v=>H*.58+v);tr=treeRow(rng(71),W,e,H*.06)}
 return (ctx,t)=>{grad(ctx,W,H,[[0,'#02060f'],[1,'#071a24']]);drawStars(ctx,st,t,.5);ctx.globalCompositeOperation='lighter';
  [[c1,0,0],[c2,H*.08,1.7]].forEach(([c,o,ph])=>{for(let x=0;x<W;x+=3){const yc=H*.24+o+Math.sin(x/W*5+t*.12+ph)*H*.07+Math.sin(x/W*13-t*.2+ph)*H*.025;const hh=H*(.08+.04*Math.sin(x/W*9+t*.3+ph));const a=.24+.16*Math.sin(x/W*40+t*.5+ph)**2;const g=ctx.createLinearGradient(0,yc-hh,0,yc+hh);g.addColorStop(0,rgba(c,0));g.addColorStop(.6,rgba(c,a));g.addColorStop(1,rgba(c,0));ctx.fillStyle=g;ctx.fillRect(x,yc-hh,3,hh*2)}});
  ctx.globalCompositeOperation='source-over';
  if(lake){const hor=H*.62;drawTrees(ctx,tr,'#04090d',t,.015);layerPath(ctx,W,H,e.map(v=>v+2),'#04090d');ctx.save();ctx.translate(0,hor*2);ctx.scale(1,-1);ctx.globalAlpha=.45;ctx.drawImage(ctx.canvas,0,0,W,hor,0,0,W,hor);ctx.restore();ctx.globalAlpha=1;ctx.fillStyle='rgba(3,10,16,.35)';ctx.fillRect(0,hor,W,H-hor);
   ctx.strokeStyle='rgba(150,220,220,.10)';ctx.beginPath();for(let y=hor+4;y<H;y+=7){const o=Math.sin(t*.8+y*.3)*10;ctx.moveTo(o,y);ctx.lineTo(W+o,y)}ctx.stroke()}}}}
S['aurora']=aurora([60,255,160],[170,90,255],8);S['aurora-pink']=aurora([255,90,180],[255,180,90],9);S['aurora-lake']=aurora([60,255,170],[90,220,255],7,true);
S['starry-night']=(W,H)=>{const r=rng(7),st=stars(r,420,W,H,.8);const sky=off(W,H,c=>{grad(c,W,H,[[0,'#03040e'],[1,'#0e1028']]);c.globalCompositeOperation='lighter';const rr=rng(70);for(let i=0;i<260;i++){const x=rr()*W,y=H*.25+x*.35+(rr()-.5)*H*.18;glow(c,x,y,W*.05,'rgba(140,130,190,.05)')}});const hill=Array.from(ridge(3,80,H*.04,.4),v=>H*.84+v);
 return (ctx,t)=>{ctx.drawImage(sky,0,0);drawStars(ctx,st,t,.7);const sh=(t*.07)%1;if(sh<.04){const k=sh/.04;ctx.strokeStyle='rgba(255,255,255,'+(1-k)*.8+')';ctx.beginPath();ctx.moveTo(W*(.2+k*.3),H*(.1+k*.15));ctx.lineTo(W*(.17+k*.3),H*(.08+k*.15));ctx.stroke()}layerPath(ctx,W,H,hill,'#030308')}};
function seaScene(sky,sunXY,sunC,seaTop,moon){return (W,H)=>{const hor=H*seaTop;const r=rng(11),st=moon?stars(r,160,W,H,.5):null;const bg=off(W,H,c=>{grad(c,W,H,sky);glow(c,W*sunXY[0],H*sunXY[1],W*(moon?.025:.045),rgba(sunC,1));glow(c,W*sunXY[0],H*sunXY[1],W*.3,rgba(sunC,.3))});
 return (ctx,t)=>{ctx.drawImage(bg,0,0,W,hor,0,0,W,hor);if(st)drawStars(ctx,st,t,.6);const g=ctx.createLinearGradient(0,hor,0,H);g.addColorStop(0,moon?'#0a1430':'#5a2a40');g.addColorStop(1,moon?'#020510':'#0a0a1e');ctx.fillStyle=g;ctx.fillRect(0,hor,W,H-hor);
  const cx=W*sunXY[0];for(let y=hor+1;y<H;y+=2){const k=(y-hor)/(H-hor);const w=W*(.03+k*.12)*(.6+.4*Math.sin(y*.7+t*1.4));const o=Math.sin(y*.25+t*.9)*W*.01;ctx.fillStyle=rgba(sunC,(.55-k*.4)*(.5+.5*Math.sin(y*1.3-t*2)));ctx.fillRect(cx-w/2+o,y,w,1.2)}}}}
S['sunset-sea']=seaScene([[0,'#281446'],[.45,'#c4566a'],[.62,'#ff8246'],[1,'#ff8246']],[.5,.55],[255,215,140],.62,false);
S['moon-ocean']=seaScene([[0,'#040818'],[1,'#122046']],[.72,.22],[235,240,255],.6,true);
S['smoke-red']=(W,H)=>{const mk=(seed,col)=>off(W*1.5|0,H*1.5|0,(c,w,h)=>{const r=rng(seed);for(let i=0;i<140;i++)glow(c,r()*w,r()*h,w*(.05+r()*.12),rgba(col,.10+r()*.10))});const a=mk(1,[230,40,30]),b=mk(2,[90,20,120]);
 return (ctx,t)=>{ctx.fillStyle='#0c0306';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='lighter';ctx.drawImage(a,-W*.25+Math.sin(t*.05)*W*.2,-H*.25+Math.cos(t*.04)*H*.15);ctx.drawImage(b,-W*.25+Math.cos(t*.045)*W*.2,-H*.25+Math.sin(t*.06)*H*.15);ctx.globalCompositeOperation='source-over'}};
function synth(c1,c2,line){return (W,H)=>{const hor=H*.55;return (ctx,t)=>{grad(ctx,W,H,[[0,'#0a001e'],[.55,'#3c0046'],[1,'#3c0046']]);const R=W*.11,cy=hor-R*.85;const g=ctx.createLinearGradient(0,cy-R,0,cy+R);g.addColorStop(0,c1);g.addColorStop(1,c2);ctx.fillStyle=g;ctx.save();ctx.beginPath();ctx.rect(0,0,W,hor);ctx.clip();ctx.beginPath();ctx.arc(W/2,cy,R,0,TAU);ctx.fill();ctx.fillStyle='#2a0036';for(let i=0;i<5;i++){const y=cy+R*.1+i*R*.17;ctx.fillRect(W/2-R,y,R*2,R*.05+i*1.2)}ctx.restore();
 ctx.fillStyle='#0d0018';ctx.fillRect(0,hor,W,H-hor);ctx.strokeStyle=line;ctx.lineWidth=1.4;ctx.beginPath();for(let i=-14;i<=14;i++){ctx.moveTo(W/2+i*W*.012,hor);ctx.lineTo(W/2+i*W*.16,H)}const ph=(t*.25)%1;for(let k=0;k<14;k++){const z=(k+ph)/14;const y=hor+(H-hor)*z*z;ctx.moveTo(0,y);ctx.lineTo(W,y)}ctx.stroke();glow(ctx,W/2,hor,W*.5,line,.25)}}}
S['synthwave']=synth('#ffdc50','#ff288c','rgba(255,60,200,.8)');S['synthwave-cyan']=synth('#a0ffff','#2f7cff','rgba(60,230,255,.8)');
S['sparks']=(W,H)=>{const r=rng(15),sp=[];for(let i=0;i<120;i++)sp.push({x:r()*W,y:r()*H,v:H*(.04+r()*.08),d:(r()-.5)*W*.02,l:2+r()*5,p:r()*TAU,c:[255,120+r()*90|0,30+r()*60|0]});
 return (ctx,t,dt)=>{grad(ctx,W,H,[[0,'#060302'],[1,'#120604']]);glow(ctx,W*.5,H*1.05,W*.6,'rgba(255,120,40,.25)');ctx.globalCompositeOperation='lighter';sp.forEach(s=>{s.y-=s.v*dt;s.x+=Math.sin(t+s.p)*s.d*dt;if(s.y<-10){s.y=H+10;s.x=Math.random()*W}const a=.35+.65*Math.abs(Math.sin(t*3+s.p));ctx.fillStyle=rgba(s.c,a);ctx.fillRect(s.x,s.y,1.6,s.l);glow(ctx,s.x,s.y,6,rgba(s.c,a*.35))});ctx.globalCompositeOperation='source-over'}};
/* landscapes */
function clouds(r,n,W,H,ymax){const c=[];for(let i=0;i<n;i++)c.push({x:r()*W,y:r()*H*ymax,w:W*(.15+r()*.2),h:H*(.03+r()*.03),v:W*(.004+r()*.006)});return c}
function drawClouds(ctx,cl,dt,W,col){cl.forEach(c=>{c.x+=c.v*dt;if(c.x-c.w>W)c.x=-c.w;ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(c.x,c.y,c.w/2,c.h,0,0,TAU);ctx.fill()})}
S['misty-forest']=(W,H)=>{const L=[[.38,'#8ca0b4'],[.5,'#647d96'],[.62,'#3c556e'],[.78,'#192837']].map(([b,c],i)=>{const e=Array.from(ridge(10+i,64,H*.04,.5),v=>H*b+v);return{e,c,tr:treeRow(rng(20+i),W,e,H*(.05+i*.024))}});const r=rng(5),fog=[];for(let i=0;i<6;i++)fog.push({y:H*(.42+i*.09),p:r()*TAU,v:.04+r()*.05});
 return (ctx,t)=>{grad(ctx,W,H,[[0,'#aabed2'],[.5,'#d7dce1'],[1,'#c8d2dc']]);glow(ctx,W*.25,H*.2,W*.3,'rgba(255,250,230,.35)');L.forEach((l,i)=>{drawTrees(ctx,l.tr,l.c,t,.012+i*.004);layerPath(ctx,W,H,l.e,l.c);const f=fog[i];const g=ctx.createLinearGradient(0,f.y-H*.04,0,f.y+H*.06);g.addColorStop(0,'rgba(215,220,226,0)');g.addColorStop(.5,'rgba(215,220,226,.55)');g.addColorStop(1,'rgba(215,220,226,0)');ctx.fillStyle=g;ctx.fillRect(Math.sin(t*f.v+f.p)*W*.05-W*.1,f.y-H*.04,W*1.2,H*.1)})}};
S['autumn-hills']=(W,H)=>{const L=[[.4,'#dc966e'],[.5,'#c86e46'],[.62,'#aa502d'],[.76,'#78321e'],[.9,'#461e14']].map(([b,c],i)=>{const e=Array.from(ridge(100+i,64,H*.04,.5),v=>H*b+v);return{e,c,tr:treeRow(rng(110+i),W,e,H*(.03+i*.012))}});const leaves=[];const r=rng(3);for(let i=0;i<40;i++)leaves.push({x:r()*W,y:r()*H,v:H*(.03+r()*.04),p:r()*TAU,c:['#e07a2e','#c9502a','#f0b040'][i%3]});
 return (ctx,t,dt)=>{grad(ctx,W,H,[[0,'#fac896'],[.5,'#fadcbe'],[1,'#f0d2b4']]);glow(ctx,W*.4,H*.3,W*.12,'rgba(255,245,220,.9)');L.forEach((l,i)=>{drawTrees(ctx,l.tr,l.c,t,.015+i*.004);layerPath(ctx,W,H,l.e,l.c)});leaves.forEach(f=>{f.y+=f.v*dt;f.x+=Math.sin(t+f.p)*.6;if(f.y>H){f.y=-5;f.x=Math.random()*W}ctx.fillStyle=f.c;ctx.save();ctx.translate(f.x,f.y);ctx.rotate(t*1.5+f.p);ctx.fillRect(-3,-1.5,6,3);ctx.restore()})}};
function palm(ctx,x,y,h,t,ph,col){const sw=Math.sin(t*.7+ph)*h*.03;ctx.strokeStyle=col;ctx.lineCap='round';ctx.lineWidth=h*.035;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+h*.12,y-h*.5,x+h*.14+sw,y-h);ctx.stroke();const tx=x+h*.14+sw,ty=y-h;for(let k=0;k<8;k++){const ang=-Math.PI+k*Math.PI/7+Math.sin(t*.9+ph+k)*.08,L=h*(.38+(k%2)*.08);ctx.lineWidth=h*.022;ctx.beginPath();ctx.moveTo(tx,ty);ctx.quadraticCurveTo(tx+Math.cos(ang)*L*.6,ty+Math.sin(ang)*L*.6-h*.05,tx+Math.cos(ang)*L,ty+Math.sin(ang)*L+L*.35);ctx.stroke()}}
S['tropical-sunset']=(W,H)=>{const sea=seaScene([[0,'#3c1e5a'],[.4,'#e65a5a'],[.62,'#ffb45a'],[1,'#ffb45a']],[.6,.58],[255,230,180],.66,false)(W,H);
 return (ctx,t,dt)=>{sea(ctx,t,dt);ctx.fillStyle='#190c19';ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,H*.86);ctx.quadraticCurveTo(W*.3,H*.88,W*.6,H);ctx.fill();palm(ctx,W*.1,H*.9,H*.62,t,0,'#120814');palm(ctx,W*.2,H*.92,H*.46,t,1.3,'#120814');palm(ctx,W*.9,H*.98,H*.52,t,2.1,'#120814')}};
S['lavender']=(W,H)=>{const hor=H*.55,r=rng(50),st=[];for(let i=0;i<260;i++){const z=r();st.push({x:r()*W,y:hor+z*z*(H-hor),h:4+z*z*30,p:r()*TAU})}st.sort((a,b)=>a.y-b.y);
 return (ctx,t)=>{grad(ctx,W,H,[[0,'#3c3278'],[.4,'#c878aa'],[.55,'#ffbea0'],[1,'#ffbea0']]);glow(ctx,W*.45,hor-10,W*.07,'rgba(255,230,190,1)');glow(ctx,W*.45,hor,W*.35,'rgba(255,170,140,.35)');const g=ctx.createLinearGradient(0,hor,0,H);g.addColorStop(0,'#5a3c78');g.addColorStop(1,'#2a1a40');ctx.fillStyle=g;ctx.fillRect(0,hor,W,H-hor);
  st.forEach(s=>{const sw=Math.sin(t*.8+s.p+s.x*.01)*s.h*.25;ctx.strokeStyle='rgba(60,110,60,.7)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.quadraticCurveTo(s.x,s.y-s.h*.5,s.x+sw,s.y-s.h);ctx.stroke();ctx.fillStyle='#9b6ad6';ctx.fillRect(s.x+sw-1.2,s.y-s.h-s.h*.25,2.4,s.h*.3)})}};
S['green-hills']=(W,H)=>{const L=[[.5,'#78aa5a'],[.6,'#5a9646'],[.72,'#3c7832'],[.86,'#285a23']].map(([b,c],i)=>({e:Array.from(ridge(80+i,64,H*.05,.45),v=>H*b+v),c}));const cl=clouds(rng(8),6,W,H,.35);const r=rng(9),gr=[];for(let i=0;i<220;i++)gr.push({x:r()*W,y:H*(.88+r()*.12),h:6+r()*10,p:r()*TAU});
 return (ctx,t,dt)=>{grad(ctx,W,H,[[0,'#6eaae6'],[.5,'#c8e1f0'],[1,'#c8e1f0']]);glow(ctx,W*.75,H*.12,W*.09,'rgba(255,250,220,1)');glow(ctx,W*.75,H*.12,W*.4,'rgba(255,250,220,.25)');drawClouds(ctx,cl,dt,W,'rgba(255,255,255,.55)');L.forEach(l=>layerPath(ctx,W,H,l.e,l.c));ctx.strokeStyle='#2f6a28';ctx.lineWidth=1.2;ctx.beginPath();gr.forEach(g=>{const sw=Math.sin(t*1.1+g.p+g.x*.02)*g.h*.4;ctx.moveTo(g.x,g.y);ctx.quadraticCurveTo(g.x,g.y-g.h*.5,g.x+sw,g.y-g.h)});ctx.stroke()}};
S['golden-field']=(W,H)=>{const hor=H*.6,r=rng(17),gr=[];for(let i=0;i<300;i++){const z=r();gr.push({x:r()*W,y:hor+z*(H-hor),h:4+z*22,p:r()*TAU})}gr.sort((a,b)=>a.y-b.y);
 return (ctx,t)=>{grad(ctx,W,H,[[0,'#ffbe6e'],[1,'#ff783c']]);glow(ctx,W*.65,hor-15,W*.08,'rgba(255,245,200,1)');glow(ctx,W*.65,hor,W*.4,'rgba(255,200,120,.4)');const g=ctx.createLinearGradient(0,hor,0,H);g.addColorStop(0,'#b46e28');g.addColorStop(1,'#3c1e0a');ctx.fillStyle=g;ctx.fillRect(0,hor,W,H-hor);ctx.strokeStyle='rgba(230,170,80,.75)';ctx.lineWidth=1.1;ctx.beginPath();gr.forEach(s=>{const sw=Math.sin(t*.9+s.p+s.x*.008)*s.h*.35;ctx.moveTo(s.x,s.y);ctx.quadraticCurveTo(s.x,s.y-s.h*.5,s.x+sw,s.y-s.h)});ctx.stroke()}};
function stillLand(drawBase,cloudCol,starsN){return (W,H)=>{const base=off(W,H,(c)=>drawBase(c,W,H));const cl=cloudCol?clouds(rng(4),5,W,H,.3):null;const st=starsN?stars(rng(6),starsN,W,H,.5):null;return (ctx,t,dt)=>{ctx.drawImage(base,0,0);if(st)drawStars(ctx,st,t,.6);if(cl){ctx.save();ctx.globalAlpha=.7;drawClouds(ctx,cl,dt,W,cloudCol);ctx.restore()}}}}
S['dunes-dusk']=stillLand((c,W,H)=>{grad(c,W,H,[[0,'#ff965a'],[1,'#783c6e']]);glow(c,W*.3,H*.42,W*.05,'rgba(255,230,160,1)');[['#96465a',.55],['#6e2d50',.65],['#461c3c',.76],['#230e23',.88]].forEach(([col,b],i)=>layerPath(c,W,H,Array.from(ridge(200+i,64,H*.03,.4),v=>H*b+v),col))},'rgba(255,180,160,.35)');
S['mountains']=stillLand((c,W,H)=>{grad(c,W,H,[[0,'#aac8e6'],[1,'#28468a']]);for(let i=0;i<5;i++)layerPath(c,W,H,Array.from(ridge(40+i,24,H*.09,.4),v=>H*(.45+i*.1)+v),'rgb('+(20+i*8)+','+(40+i*10)+','+(90+i*12)+')')},'rgba(255,255,255,.35)');
S['snow-peaks']=stillLand((c,W,H)=>{grad(c,W,H,[[0,'#05081a'],[.6,'#192850'],[1,'#28375f']]);glow(c,W*.8,H*.15,W*.02,'rgba(255,255,240,1)');glow(c,W*.8,H*.15,W*.15,'rgba(150,170,220,.3)');layerPath(c,W,H,Array.from(ridge(40,90,H*.15,.6),v=>H*.42+v),'#d7e1f5');layerPath(c,W,H,Array.from(ridge(40,90,H*.15,.6),v=>H*.5+v),'#28375a');layerPath(c,W,H,Array.from(ridge(41,64,H*.04,.5),v=>H*.7+v),'#0f192d')},null,260);
S['canyon']=stillLand((c,W,H)=>{grad(c,W,H,[[0,'#3c78be'],[.5,'#fabe8c'],[1,'#fabe8c']]);glow(c,W*.2,H*.35,W*.06,'rgba(255,240,200,1)');c.fillStyle='#be5a3c';c.fillRect(W*.12,H*.42,W*.2,H);c.fillStyle='#aa4b32';c.fillRect(W*.6,H*.38,W*.25,H);layerPath(c,W,H,Array.from(ridge(60,64,H*.03,.5),v=>H*.68+v),'#8c3c28');layerPath(c,W,H,Array.from(ridge(61,64,H*.02,.5),v=>H*.8+v),'#5f281e')},'rgba(255,255,255,.4)');
S['lake-sunrise']=(W,H)=>{const s=seaScene([[0,'#283c78'],[.35,'#f09678'],[.6,'#ffc88c'],[1,'#ffc88c']],[.55,.56],[255,230,170],.6,false)(W,H);const L=[[.36,'#786ea0'],[.45,'#464678'],[.53,'#232846']].map(([b,c],i)=>({e:Array.from(ridge(1+i,64,H*.06,.55),v=>H*b+v),c}));return (ctx,t,dt)=>{s(ctx,t,dt);ctx.save();ctx.beginPath();ctx.rect(0,0,W,H*.6);ctx.clip();L.forEach(l=>layerPath(ctx,W,H,l.e,l.c));ctx.restore()}};
S['fjord']=(W,H)=>{const s=seaScene([[0,'#141e46'],[.45,'#5a6eaa'],[.6,'#aaaac8'],[1,'#aaaac8']],[.5,.5],[200,200,230],.6,true)(W,H);return (ctx,t,dt)=>{s(ctx,t,dt);ctx.fillStyle='#232d50';ctx.beginPath();ctx.moveTo(0,H*.6);ctx.lineTo(0,H*.2);ctx.lineTo(W*.15,H*.18);ctx.lineTo(W*.42,H*.6);ctx.fill();ctx.fillStyle='#19203c';ctx.beginPath();ctx.moveTo(W,H*.6);ctx.lineTo(W,H*.25);ctx.lineTo(W*.88,H*.22);ctx.lineTo(W*.6,H*.6);ctx.fill()}};

const Scene={has:id=>!!S[id],ids:()=>Object.keys(S),
 start(box,id,opt){const make=S[id];if(!make)return null;opt=opt||{};const cv=document.createElement('canvas');cv.className='sceneCv';cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';box.appendChild(cv);
  const ctx=cv.getContext('2d');let draw=null,W=0,H=0,raf=0,last=0,t0=performance.now(),dead=false;const Q=opt.q||.5;
  const size=()=>{const r=box.getBoundingClientRect();const w=Math.max(160,Math.round(r.width*Q)),h=Math.max(90,Math.round(r.height*Q));if(w!==W||h!==H){W=w;H=h;cv.width=W;cv.height=H;draw=make(W,H)}};
  const loop=now=>{if(dead)return;raf=requestAnimationFrame(loop);if(now-last<33)return;const dt=Math.min(.1,(now-(last||now))/1000);last=now;if(document.hidden)return;size();draw(ctx,(now-t0)/1000*(opt.speed||1),dt)};
  size();draw(ctx,0,0);raf=requestAnimationFrame(loop);
  return {stop(){dead=true;cancelAnimationFrame(raf);cv.remove()}}}};
window.Scene=Scene;
})();
