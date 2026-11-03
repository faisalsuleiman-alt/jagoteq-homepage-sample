/* How it installs: a 3D walk along a real run. A small engine, a long transfer fiber marked in feet,
   a connector, glowing fiber and an end cap. Scrolling moves the camera; the last shot pulls back to show the whole run.
   The dark cable is drawn short on purpose. Its length is a maximum, and the label carries the number. */
(function(){
  const rig=document.getElementById('rig'),canvas=document.getElementById('scene');
  if(!canvas)return;
  const flat=()=>rig.classList.add('flat');
  const probe=document.createElement('canvas');
  if(!(probe.getContext('webgl2')||probe.getContext('webgl')))return flat();
  rig.classList.remove('flat');

  /* The step list works from the start. The 3D picture is built only as a visitor gets near it, so it never holds up the first screen */
  const list=[...document.querySelectorAll('#steps li')],narrow=matchMedia('(max-width:1040px)'),still=false;
  let P=still?1:0,draw=null,pin=null,dead=false;
  const giveUp=()=>{dead=true;if(pin)pin.kill(true);flat()};
  function place(t){ /* t runs 0 to 1 across all the shots */
    P=t;
    const step=t>=.86&&(!narrow.matches||still)?-1:Math.min(4,Math.round(t/.8*4));
    list.forEach((li,j)=>li.classList.toggle('on',step<0||j===step));
    if(draw)draw(t);
  }
  place(P);window.__rig={place};

  function build(){
  let gl;try{gl=new THREE.WebGLRenderer({canvas,antialias:true})}catch(e){return giveUp()}
  gl.setPixelRatio(Math.min(devicePixelRatio,2));gl.setClearColor(0x101010);
  gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.05;
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x101010,140,280);
  const cam=new THREE.PerspectiveCamera(38,1,.05,500);

  /* A small studio for the metal parts to reflect */
  const room=new THREE.Scene();room.background=new THREE.Color(0x0c0c0c);
  [[0,8,0,12,.3,12,6],[-9,2,5,.3,7,7,2.4],[8,3,-6,.3,5,8,1.6],[10,1.5,1,.3,6,9,3]].forEach(([x,y,z,w,h,d,v])=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color:new THREE.Color(v,v,v)}));m.position.set(x,y,z);room.add(m)});
  scene.environment=new THREE.PMREMGenerator(gl).fromScene(room,.02).texture;
  const key=new THREE.DirectionalLight(0xffffff,1.1);key.position.set(5,8,6);scene.add(key);
  const fill=new THREE.PointLight(0x92c83e,40,16);fill.position.set(26,2,2);scene.add(fill);

  const floor=new THREE.Mesh(new THREE.PlaneGeometry(900,600),new THREE.MeshBasicMaterial({color:0x101010,toneMapped:false,depthWrite:false}));
  floor.rotation.x=-Math.PI/2;floor.position.set(40,0,0);scene.add(floor);

  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const darkPath=new THREE.CatmullRomCurve3([V(.26,.27,.15),V(.62,.27,.15),V(1.1,.1,.2),V(2,.05,.1),V(5,.05,-1.3),V(9,.05,1.3),V(13,.05,-1.1),V(16,.05,.5),V(17,.1,0),V(18,.1,0)]);
  const glowPath=new THREE.CatmullRomCurve3([V(18.7,.1,0),V(21,.1,1),V(24,.1,-1.2),V(27,.1,1),V(30,.1,-1),V(33,.1,.4),V(34.4,.1,0)]);

  /* The transfer fiber stays dark: light only shows at the far end */
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(darkPath,420,.032,12),new THREE.MeshStandardMaterial({color:0x5f5f5f,roughness:.42,metalness:.1})));

  /* The glowing fiber: a bright core and a soft glow that fades towards its edges */
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(glowPath,240,.055,12),new THREE.MeshBasicMaterial({color:0xffffff})));
  const glowMat=(p,a)=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,uniforms:{c:{value:new THREE.Color(0x92c83e)},p:{value:p},a:{value:a}},
    vertexShader:'varying vec3 n;varying vec3 v;varying float u;void main(){vec4 m=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-m.xyz);u=uv.x;gl_Position=projectionMatrix*m;}',
    fragmentShader:'uniform vec3 c;uniform float p;uniform float a;varying vec3 n;varying vec3 v;varying float u;void main(){float f=pow(max(dot(normalize(n),normalize(v)),0.),p)*smoothstep(0.,.012,u)*smoothstep(1.,.988,u);gl_FragColor=vec4(c*f*a,f*a);}'});
  const halos=[[.2,1.4,1],[.45,2.6,.5]].map(([r,p,a])=>{const m=glowMat(p,a);scene.add(new THREE.Mesh(new THREE.TubeGeometry(glowPath,160,r,24),m));return m});

  const softDot=(a,b)=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,a);g.addColorStop(.35,b);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)};
  const wash=new THREE.Mesh(new THREE.PlaneGeometry(30,12),new THREE.MeshBasicMaterial({map:softDot('rgba(255,255,255,.26)','rgba(255,255,255,.09)'),color:0x92c83e,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  wash.rotation.x=-Math.PI/2;wash.position.set(26.5,.02,0);scene.add(wash);

  /* Pulses of light travelling inside the transfer fiber */
  const dot=softDot('rgba(255,255,255,1)','rgba(170,240,90,.75)');
  const pulses=[0,.34,.67].map(o=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dot,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,toneMapped:false}));s.scale.set(.6,.6,1);s.userData.o=o;scene.add(s);return s});

  /* Labels stay the same size on screen, wherever the camera goes */
  const draws=[],labels=[];
  const label=(txt,x,y,z,w=.13)=>{const c=document.createElement('canvas');c.width=512;c.height=96;const g=c.getContext('2d');const t=new THREE.CanvasTexture(c);t.anisotropy=4;
    const d=()=>{g.clearRect(0,0,512,96);g.font='800 52px Figtree, Arial, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.fillText(txt,256,48);t.needsUpdate=true};d();draws.push(d);
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,depthTest:false,sizeAttenuation:false,toneMapped:false}));s.position.set(x,y,z);scene.add(s);labels.push(s);return s};
  /* One span over the dark cable: 200 ft is the most it can be, not a set length */
  const span=new THREE.MeshBasicMaterial({color:0xa1a1a1});
  const spanBars=new THREE.Group();scene.add(spanBars);
  [[18,.03,.03,9.2,.05,-2.6],[.03,.03,.7,.2,.05,-2.6],[.03,.03,.7,18.2,.05,-2.6]].forEach(([w,h,d,x,y,z])=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),span);b.position.set(x,y,z);spanBars.add(b)});
  const spanLabel=label('Up to 200 ft',9.2,.1,-4);
  const ends=[label('Engine',0,.1,4.5),label('Glowing fiber',26.5,.1,4.5)];

  /* The engine, drawn from the LF120: a taupe case with a silver frame, a control plate on the front and vents on the sides */
  const face=(w,h,paint)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');const t=new THREE.CanvasTexture(c);t.anisotropy=8;t.colorSpace=THREE.SRGBColorSpace;const d=()=>{paint(x,w,h);t.needsUpdate=true};d();draws.push(d);return t};
  const front=face(1024,920,(x,w,h)=>{
    x.fillStyle='#8f8884';x.fillRect(0,0,w,h);x.strokeStyle='#a9a56e';x.lineWidth=5;x.strokeRect(26,26,w-52,h-52);
    x.fillStyle='#a29c98';x.fillRect(250,70,520,300);x.strokeStyle='#bdb8b4';x.lineWidth=8;x.strokeRect(250,70,520,300);
    x.fillStyle='#0c0c0c';x.fillRect(290,110,170,220);x.fillStyle='#92c83e';x.font='800 40px Figtree, Arial, sans-serif';x.textAlign='center';x.fillText('LF120',375,235);
    x.fillStyle='#1b1b1b';x.beginPath();x.arc(620,170,46,0,7);x.fill();x.fillStyle='#d9d6d2';[[620,265],[620,315]].forEach(([a,b])=>{x.beginPath();x.arc(a,b,13,0,7);x.fill()});
    x.fillStyle='#f1f1f1';x.font='italic 500 76px Figtree, Arial, sans-serif';x.fillText('Jagoteq',640,560);
    x.fillStyle='#f2c52e';x.fillRect(70,470,180,70);x.fillRect(330,600,150,56);
    [[300,770],[420,770],[540,770]].forEach(([a,b])=>{x.fillStyle='#171717';x.beginPath();x.arc(a,b,46,0,7);x.fill();x.strokeStyle='#6e6a67';x.lineWidth=5;x.stroke()});
    x.fillStyle='#d9d6d2';x.beginPath();x.arc(780,650,32,0,7);x.fill();x.fillStyle='#131313';x.fillRect(700,730,150,86)});
  const side=face(1024,920,(x,w,h)=>{
    x.fillStyle='#4c4845';x.fillRect(0,0,w,h);x.strokeStyle='#a9a56e';x.lineWidth=5;x.strokeRect(26,26,w-52,h-52);x.fillStyle='#b9b5b1';x.fillRect(26,448,w-52,22);
    x.fillStyle='#b9b5b1';[[300,70],[300,520]].forEach(([a,b])=>{for(let i=0;i<14;i++)for(let j=0;j<20;j++){const n=Math.abs(j-9.5);if(n<7+((i>3&&i<10)?3:0))x.fillRect(a+j*22,b+i*24,15,14)}})});
  const paint=new THREE.MeshStandardMaterial({color:0x8f8884,roughness:.55,metalness:.3});
  const silver=new THREE.MeshStandardMaterial({color:0xd7d7d7,roughness:.3,metalness:.9});
  const eng=new THREE.Group();
  eng.add(new THREE.Mesh(new THREE.BoxGeometry(1,.9,1.05),[new THREE.MeshStandardMaterial({map:front,roughness:.55,metalness:.2}),paint,paint,paint,new THREE.MeshStandardMaterial({map:side,roughness:.55,metalness:.2}),new THREE.MeshStandardMaterial({map:side,roughness:.55,metalness:.2})]));
  const bar=(w,h,d,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),silver);m.position.set(x,y,z);eng.add(m)};
  [[.5,.46],[.5,-.46],[-.5,.46],[-.5,-.46]].forEach(([x,y])=>bar(.035,.035,1.1,x,y,0));
  [[.5,.53],[.5,-.53],[-.5,.53],[-.5,-.53]].forEach(([x,z])=>bar(.035,.95,.035,x,0,z));
  [[.46,.53],[.46,-.53],[-.46,.53],[-.46,-.53]].forEach(([y,z])=>bar(1.03,.035,.035,0,y,z));
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.2,.02,10,32,Math.PI),new THREE.MeshStandardMaterial({color:0x1c1c1c,roughness:.5}));handle.scale.y=.32;handle.position.y=.46;eng.add(handle);
  const port=new THREE.Mesh(new THREE.CylinderGeometry(.09,.1,.09,32),new THREE.MeshStandardMaterial({color:0x161616,roughness:.45}));port.rotation.z=Math.PI/2;port.position.set(.54,.06,.3);eng.add(port);
  eng.scale.setScalar(.5);eng.position.set(0,.24,0);scene.add(eng);

  /* Connector and end cap: turned metal parts, the cap finished in a mirror */
  const cyl=(r,h,c,m,ro)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,64),new THREE.MeshStandardMaterial({color:c,metalness:m,roughness:ro}));o.rotation.z=Math.PI/2;return o};
  const part=(x,list)=>{const g=new THREE.Group();let at=0;list.forEach(([l,r,c,m,ro])=>{const o=cyl(r,l,c,m,ro);o.position.x=at+l/2;g.add(o);at+=l});g.position.set(x,.1,0);scene.add(g)};
  part(18,[[.12,.13,0xdbdbdb,.9,.25],[.03,.17,0xc7c7c7,.9,.25],[.3,.18,0xe8e8e8,.9,.32],[.12,.11,0xd2d2d2,.9,.25],[.2,.17,0x1c1c1c,.3,.5]]);
  part(34.35,[[.1,.1,0xdbdbdb,.9,.25],[.03,.13,0xc7c7c7,.9,.25],[.2,.14,0xe8e8e8,.9,.3],[.2,.14,0xffffff,1,.04]]);

  /* Callouts: a dot on each part with a line to its name. They draw in around that part's moment in the scroll and
     fade back out as you pass it, the same whichever way you're scrolling */
  const calls=[
    {p:V(.25,.34,.12),at:.02,first:1,b:'Laser engine',s:'Keep it out of sight'},
    {p:darkPath.getPointAt(.52),at:.2,down:1,b:'Transfer fiber',s:'Dark cable, no glow'},
    {p:V(18.35,.29,0),at:.4,b:'Safety FiberLink',s:'Dark cable meets glowing fiber'},
    {p:glowPath.getPointAt(.5),at:.6,b:'Fiber optic cable',s:'360° glow, cut to fit'},
    {p:V(34.6,.25,0),at:.8,b:'Mirrored end cap',s:'Finishes the run'}];
  calls.forEach(c=>{const d=document.createElement('div');d.className='call'+(c.down?' down':'');d.setAttribute('aria-hidden','true');d.innerHTML=`<i></i><em></em><p><b>${c.b}</b>${c.s}</p>`;canvas.parentElement.append(d);c.el=d});
  const spot=new THREE.Vector3();let T=0,cw=1,ch=1;
  function tag(){calls.forEach(c=>{let a=Math.max(0,Math.min(1,(.085-Math.abs(T-c.at))/.045));if(c.first)a=Math.min(a,T/.03);const e=a*a*(3-2*a);c.el.style.setProperty('--a',e.toFixed(3));if(e){spot.copy(c.p).project(cam);const x=(spot.x+1)/2*cw,y=(1-spot.y)/2*ch;if(x<0||x>cw||y<0||y>ch)a=0;else{const w=c.el.lastChild.offsetWidth/2+12,room=c.el.lastChild.offsetHeight+84;c.el.style.setProperty('--nudge',Math.round(Math.max(w-x,Math.min(cw-w-x,0)))+'px');c.el.classList.toggle('down',c.down?ch-y>=room||y<room:y<room&&ch-y>=room);if(c.first){spot.set(0,.5,0).project(cam);c.el.style.setProperty('--lift',Math.max(0,Math.round(y-(1-spot.y)/2*ch-32))+'px')}c.el.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`}}c.el.style.visibility=e&&a?'visible':'hidden'})}

  /* Camera shots */
  const shots=[
    {p:V(1.6,.85,1.5),l:V(.08,.24,.05)},
    {p:V(9.5,13,24),l:V(9.5,0,-.6)},
    {p:V(17,.62,1.35),l:V(18.45,.12,0)},
    {p:V(26,2.1,6.5),l:V(26,.1,0)},
    {p:V(35.9,.5,1.15),l:V(34.6,.12,0)},
    {p:V(17.5,30,40),l:V(17.5,0,0)}];
  const now={p:shots[0].p.clone(),l:shots[0].l.clone()};
  draw=t=>{
    T=t;
    const n=shots.length-1,c=cam.aspect<1&&t<.2?Math.max(0,(t-.09)/.11*.2):t,f=Math.min(n-.0001,c*n),i=Math.floor(f),k=f-i,e=k*k*(3-2*k);
    now.p.lerpVectors(shots[i].p,shots[i+1].p,e);now.l.lerpVectors(shots[i].l,shots[i+1].l,e);
    ends.forEach(s=>{s.visible=t>=.92});
    spanBars.visible=spanLabel.visible=(t>=.1&&t<=.3)||t>=.92;
  };
  function size(){const r=canvas.parentElement.getBoundingClientRect();cw=r.width;ch=r.height;gl.setSize(r.width,r.height,false);cam.aspect=r.width/Math.max(1,r.height);cam.updateProjectionMatrix();
    const half=Math.atan(Math.tan(cam.fov*Math.PI/360)*cam.aspect),d=24/Math.tan(half),k=Math.min(1,cam.aspect);shots[5].p.set(17.5,d*.85,d*.55);labels.forEach(s=>s.scale.set(.2*k,.038*k,1));
    cam.position.copy(now.p);cam.lookAt(now.l);gl.render(scene,cam);tag()}
  new ResizeObserver(size).observe(canvas.parentElement);size();
  let inView=true;
  new IntersectionObserver(e=>{inView=e[e.length-1].isIntersecting}).observe(canvas);
  function frame(ms){requestAnimationFrame(frame);if(!inView)return;
    const s=ms/1000,c=new THREE.Color().setHSL(still?.27:(.27+s*.04)%1,.9,.55);
    halos.forEach(m=>m.uniforms.c.value.copy(c));wash.material.color.copy(c);fill.color.copy(c);
    pulses.forEach(p=>{const u=(s*.12+p.userData.o)%1;p.position.copy(darkPath.getPointAt(u));p.position.y+=.03});
    cam.position.copy(now.p);cam.lookAt(now.l);gl.render(scene,cam);tag()}
  draw(P);
  requestAnimationFrame(frame);
  if(document.fonts)document.fonts.load('800 52px Figtree').then(()=>draws.forEach(d=>d()));
  }

  /* Fetch the 3D library once the page has settled, and build the picture when the section is close */
  let near=false,got=false,asked=false;
  const go=()=>{if(near&&got&&!draw&&!dead)build()};
  const fetchLib=()=>{if(asked)return;asked=true;const s=document.createElement('script');s.src='assets/lib/three.min.js';s.onload=()=>{got=true;go()};s.onerror=giveUp;document.head.append(s)};
  new IntersectionObserver((e,o)=>{if(e[e.length-1].isIntersecting){near=true;o.disconnect();fetchLib();go()}},{rootMargin:'120% 0px'}).observe(rig);
  const idle=()=>{window.requestIdleCallback?requestIdleCallback(fetchLib,{timeout:3000}):setTimeout(fetchLib,1500)};
  document.readyState==='complete'?idle():addEventListener('load',idle,{once:true});

  if(still)return;
  if(!window.gsap||!window.ScrollTrigger)return giveUp();
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ignoreMobileResize:true});
  pin=ScrollTrigger.create({trigger:'#rig',start:'top top',end:'+=240%',pin:true,scrub:true,onUpdate:s=>place(s.progress)});
  /* A refresh remeasures the page by scrolling to the top and back, so the pin keeps its place and a jump in progress finishes */
  /* The reader's place is saved on every scroll and frozen once a phone has turned, because by then the browser has already moved the page */
  let keep=null,mark=null,ready=false,saved=null;
  const tall=matchMedia('(orientation:portrait)');let was=tall.matches;
  const spotNow=()=>{const y=scrollY;if(y>=pin.start&&y<=pin.end)return {keep:pin.end>pin.start?(y-pin.start)/(pin.end-pin.start):0,mark:null};const s=[...document.querySelectorAll('.fold,main>section,footer')].filter(e=>e.getBoundingClientRect().top<=1).pop();return {keep:null,mark:s?{el:s,off:-s.getBoundingClientRect().top/s.offsetHeight}:null}};
  addEventListener('scroll',()=>{if(ready&&tall.matches===was&&!ScrollTrigger.isRefreshing)saved=spotNow()},{passive:true});
  ScrollTrigger.addEventListener('refreshInit',()=>{const r=ready?(tall.matches!==was&&saved||spotNow()):{keep:pin.isActive?pin.progress:null,mark:null};keep=r.keep;mark=r.mark;was=tall.matches});
  ScrollTrigger.addEventListener('refresh',()=>{if(window.jumpTo)window.jumpTo.scrollIntoView({behavior:'smooth',block:'start'});else if(keep!==null)scrollTo(0,pin.start+keep*(pin.end-pin.start));else if(mark)scrollTo(0,scrollY+mark.el.getBoundingClientRect().top+mark.off*mark.el.offsetHeight);keep=mark=null;ready=true;place(P)});
  /* A link straight to a section lands on it once the pin has been measured */
  const land=()=>{ScrollTrigger.removeEventListener('refresh',land);const el=location.hash&&document.querySelector(location.hash);if(el)el.scrollIntoView()};ScrollTrigger.addEventListener('refresh',land);
  /* A picture loading late can move where the pin must start. Anything that only grows the page below it needs no refresh */
  const sec=document.getElementById('install');
  let wait;new ResizeObserver(()=>{clearTimeout(wait);wait=setTimeout(()=>{if(Math.abs(sec.getBoundingClientRect().top+scrollY-pin.start)>2)ScrollTrigger.refresh()},200)}).observe(document.querySelector('main'));
  matchMedia('(orientation:portrait)').addEventListener('change',()=>ScrollTrigger.refresh());
})();
