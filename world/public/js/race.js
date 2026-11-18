import * as THREE from 'three';

export class GardenRace {
  constructor(net, world, toast, player, getPeer) {
    this.net=net;this.world=world;this.toast=toast;this.player=player;this.getPeer=getPeer;
    this.track=world.locs.garden.raceTrack;this.active=false;this.driving=false;this.next=0;this.speed=0;this.startedAt=0;this.lastSent=-1;this.selected=0;
    this.panel=document.getElementById('race-panel');this.status=document.getElementById('race-status');
    this.local=this.makeVehicle(0);this.remote=this.makeVehicle(1);
    world.locs.garden.group.add(this.local,this.remote);this.local.visible=this.remote.visible=false;
    document.getElementById('b-race').onclick=()=>this.open();
    document.getElementById('race-close').onclick=()=>this.close();
    document.getElementById('race-start').onclick=()=>this.start();
    document.getElementById('race-rematch').onclick=()=>this.rematch();
    document.querySelectorAll('[data-vehicle]').forEach(b=>b.onclick=()=>this.choose(+b.dataset.vehicle));
    net.on('race-countdown',v=>{this.active=true;this.driving=false;this.countdown=v.startsAt;this.resetPosition();this.local.visible=true;this.status.textContent='Get ready…';this.open();});
    net.on('race-started',v=>{this.active=true;this.driving=true;this.startedAt=v.startedAt;this.countdown=null;this.next=0;this.speed=0;this.lastSent=-1;this.resetPosition();this.status.textContent='Go!';this.local.visible=true;});
    net.on('race-progress',v=>{if(v.token===net.token){this.next=v.next;if(v.finished)this.driving=false;}});
    net.on('race-finished',v=>{this.driving=false;this.active=false;this.local.visible=this.remote.visible=false;this.status.textContent=v.winner===net.token?'You won! 🏆':'Race finished!';const mine=v.results.find(x=>x.token===net.token),other=v.results.find(x=>x.token!==net.token);if(mine?.time)this.status.textContent+=` Your time: ${(mine.time/1000).toFixed(2)}s`;if(other?.time)this.status.textContent+=` · Partner: ${(other.time/1000).toFixed(2)}s`;});
    net.on('race-reset',()=>this.reset());
    net.on('race-error',e=>this.toast(e.error||'Race error','err'));
  }
  makeVehicle(type){
    const g=new THREE.Group(),body=new THREE.MeshStandardMaterial({color:['#e5a34c','#5ca9d6','#e66d77','#78b879'][type],roughness:.45,metalness:.12}),dark=new THREE.MeshStandardMaterial({color:'#20232b',roughness:.85}),glass=new THREE.MeshStandardMaterial({color:'#a8d9e8',metalness:.25,roughness:.18,transparent:true,opacity:.8});
    const box=(w,h,d,x,y,z,m)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;};
    if(type===3){
      box(.22,.55,.32,0,.72,0,body);box(.13,.45,.22,0,1.18,-.03,body);
      for(const z of [-.68,.62]){const wh=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.16,14),dark);wh.rotation.z=Math.PI/2;wh.position.set(0,.4,z);g.add(wh);}
      box(.1,.08,.7,0,1.43,-.02,dark);
    } else {
      box(type===2?1.05:1.35,.48,type===2?2.0:2.5,0,.65,0,body);
      box(1.0,.52,1.0,0,1.12,-.18,glass);
      for(const x of [-.62,.62])for(const z of [-.78,.78]){const wh=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.2,14),dark);wh.rotation.z=Math.PI/2;wh.position.set(x,.37,z);g.add(wh);}
      box(.35,.12,.08,0,.78,-1.27,new THREE.MeshStandardMaterial({color:'#fff0b0',emissive:'#e6b35b',emissiveIntensity:.6}));
    }
    return g;
  }
  choose(i){this.selected=Math.max(0,Math.min(3,i));const old=this.local;this.world.locs.garden.group.remove(old);this.local=this.makeVehicle(this.selected);this.world.locs.garden.group.add(this.local);this.local.visible=this.active;document.querySelectorAll('[data-vehicle]').forEach(b=>b.classList.toggle('on',+b.dataset.vehicle===this.selected));}
  open(){this.panel.hidden=false;}
  close(){this.panel.hidden=true;}
  resetPosition(){
    const c=this.track.center;this.player.x=c.x;this.player.z=c.z-this.track.radius+.8;this.player.yaw=-Math.PI/2;this.player.vx=this.player.vz=0;this.local.position.set(this.player.x,.05,this.player.z);this.local.rotation.y=this.player.yaw;
  }
  async start(){
    if(this.player.loc!=='garden'){this.toast('Travel to the Garden before starting a race','err');return;}
    const r=await this.net.request('race-request',{});if(r.error){this.toast(r.error,'err');return;}this.status.textContent='Starting in 3…';
  }
  async rematch(){const r=await this.net.request('race-rematch',{});if(r.error)this.toast(r.error,'err');else{this.status.textContent='Ready for another race';this.local.visible=this.remote.visible=false;this.active=this.driving=false;}}
  reset(){this.active=this.driving=false;this.speed=0;this.local.visible=this.remote.visible=false;this.status.textContent='Race reset';}
  update(dt,axis){
    if(!this.driving)return;
    const steer=axis.x,throttle=axis.y;
    this.speed=Math.max(-2,Math.min(11,this.speed+throttle*8*dt-this.speed*1.2*dt));
    this.player.yaw+=steer*dt*(.25+Math.abs(this.speed)*.04)*Math.sign(this.speed||1);
    this.player.x+=-Math.sin(this.player.yaw)*this.speed*dt;this.player.z+=-Math.cos(this.player.yaw)*this.speed*dt;
    const c=this.track.center,dx=this.player.x-c.x,dz=this.player.z-c.z,r=Math.hypot(dx,dz),target=this.track.radius;
    if(r>target+2.2||r<target-2.2){const k=target/r;this.player.x=c.x+dx*k;this.player.z=c.z+dz*k;this.speed*=.82;}
    this.local.position.set(this.player.x,.06,this.player.z);this.local.rotation.y=this.player.yaw;
    const cp=this.track.checkpoints[this.next%4],lap=Math.floor(this.next/4);
    if(cp&&Math.hypot(this.player.x-cp.x,this.player.z-cp.z)<2.7&&this.lastSent!==this.next){
      this.lastSent=this.next;this.net.send('race-checkpoint',{index:this.next%4,lap});
    }
    this.status.textContent=`Lap ${Math.min(2,Math.floor(this.next/4)+1)} / 2 · ${Math.min(8,this.next)} / 8 checkpoints · ${(Date.now()-this.startedAt)/1000|0}s`;
  }
  updatePeer(st){
    if(this.countdown&&!this.driving){const left=Math.max(0,Math.ceil((this.countdown-Date.now())/1000));this.status.textContent=left?`Starting in ${left}…`:'Go!';}
    const show=this.active&&st?.loc==='garden'&&this.player.loc==='garden';
    this.remote.visible=!!show;if(show){this.remote.position.set(st.x,.06,st.z);this.remote.rotation.y=st.ry;}
  }
}
