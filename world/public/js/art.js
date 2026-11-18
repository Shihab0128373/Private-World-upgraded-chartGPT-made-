// Shared drawing studio. Vector strokes are relayed through the existing private Socket.IO room.
export class ArtStudio {
  constructor(net, toast) {
    this.net = net; this.toast = toast; this.$ = id => document.getElementById(id);
    this.canvas = this.$('art-canvas'); this.ctx = this.canvas.getContext('2d');
    this.strokes = []; this.active = null; this.color = '#e8b86d'; this.size = 5; this.erase = false;
    this.panel = this.$('art-panel');
    this.$('b-art').onclick = () => this.open();
    this.$('art-close').onclick = () => this.close();
    this.$('art-color').oninput = e => { this.color = e.target.value; };
    this.$('art-size').oninput = e => { this.size = +e.target.value; };
    this.$('art-eraser').onclick = () => { this.erase = !this.erase; this.$('art-eraser').classList.toggle('on', this.erase); };
    this.$('art-undo').onclick = () => this.undo();
    this.$('art-clear').onclick = () => this.clear();
    this.$('art-hang').onclick = () => this.hang();
    this.canvas.addEventListener('pointerdown', e => this.down(e));
    this.canvas.addEventListener('pointermove', e => this.move(e));
    for (const ev of ['pointerup','pointercancel','lostpointercapture']) this.canvas.addEventListener(ev, () => this.up());
    net.on('art-stroke', s => { s.localOwner=false; const i=this.strokes.findIndex(v=>v.id===s.id); if(i>=0)this.strokes[i]=s; else this.strokes.push(s); this.redraw(); });
    net.on('art-undo', id => { this.strokes = this.strokes.filter(s => s.id !== id); this.redraw(); });
    net.on('art-clear', () => { this.strokes = []; this.redraw(); });
    this.resize();
    addEventListener('resize', () => this.resize());
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
    if (!rect.width || !rect.height) return;
    const old = this.canvas.width ? this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height) : null;
    this.canvas.width = Math.round(rect.width*dpr); this.canvas.height = Math.round(rect.height*dpr);
    this.ctx.setTransform(dpr,0,0,dpr,0,0); this.redraw();
  }
  open() { this.panel.hidden = false; this.resize(); }
  close() { this.panel.hidden = true; }
  point(e) { const r = this.canvas.getBoundingClientRect(); return { x:(e.clientX-r.left)/r.width, y:(e.clientY-r.top)/r.height }; }
  down(e) {
    if (this.panel.hidden) return;
    this.canvas.setPointerCapture(e.pointerId);
    this.active = { id: crypto.randomUUID(), color:this.color, size:this.size, erase:this.erase, points:[this.point(e)], localOwner:true };
    this.drawStroke(this.active);
  }
  move(e) {
    if (!this.active) return;
    const p=this.point(e), last=this.active.points[this.active.points.length-1];
    if (Math.hypot(p.x-last.x,p.y-last.y)<.002) return;
    this.active.points.push(p); if(this.active.points.length>240) this.active.points.shift();
    this.redraw(); this.net.send('art-stroke',this.active);
  }
  up() {
    if (!this.active) return;
    if (this.active.points.length===1) this.drawStroke(this.active);
    this.net.send('art-stroke',this.active); this.strokes.push(this.active); this.active=null;
  }
  drawStroke(s) {
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight,pts=s.points||[];
    if(!pts.length)return;
    const c=this.ctx;c.save();c.globalCompositeOperation=s.erase?'destination-out':'source-over';
    c.strokeStyle=s.color;c.fillStyle=s.color;c.lineWidth=s.size;c.lineCap='round';c.lineJoin='round';
    c.beginPath();c.moveTo(pts[0].x*w,pts[0].y*h);
    for(let i=1;i<pts.length;i++)c.lineTo(pts[i].x*w,pts[i].y*h);
    if(pts.length===1){c.arc(pts[0].x*w,pts[0].y*h,s.size/2,0,Math.PI*2);c.fill();}else c.stroke();
    c.restore();
  }
  redraw(){if(!this.ctx)return;this.ctx.clearRect(0,0,this.canvas.clientWidth,this.canvas.clientHeight);for(const s of this.strokes)this.drawStroke(s);if(this.active)this.drawStroke(this.active);}
  undo(){const s=[...this.strokes].reverse().find(x=>x.localOwner===true);if(!s)return;this.strokes=this.strokes.filter(x=>x.id!==s.id);this.net.send('art-undo',s.id);this.redraw();}
  clear(){this.strokes=[];this.net.send('art-clear');this.redraw();}
  async hang(){
    const c=document.createElement('canvas');c.width=1200;c.height=800;const x=c.getContext('2d');
    x.fillStyle='#f4efe5';x.fillRect(0,0,c.width,c.height);
    for(const s of this.strokes){const pts=s.points||[];if(!pts.length)continue;x.save();x.globalCompositeOperation=s.erase?'destination-out':'source-over';x.strokeStyle=s.color;x.fillStyle=s.color;x.lineWidth=s.size*1.5;x.lineCap='round';x.lineJoin='round';x.beginPath();x.moveTo(pts[0].x*c.width,pts[0].y*c.height);for(let i=1;i<pts.length;i++)x.lineTo(pts[i].x*c.width,pts[i].y*c.height);x.stroke();x.restore();}
    const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob)return this.toast('Could not export drawing','err');
    const fd=new FormData();fd.append('photos',blob,'shared-art.png');
    try{const r=await fetch('/api/photos?room=0',{method:'POST',headers:this.net.headers,body:fd});const j=await r.json();if(!r.ok||!j.added?.length)throw Error(j.error||j.errors?.[0]||'Museum photo storage is full');this.toast('Artwork added to the museum');this.close();this.net.send('photos');}
    catch(e){this.toast(e.message,'err');}
  }
}
