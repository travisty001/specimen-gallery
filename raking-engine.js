import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const host=document.getElementById('stage'), original=document.getElementById('viewer');
const section=document.querySelector('[aria-label="Lighting controls"]');
const controls=document.createElement('div');controls.className='raking-controls';
controls.innerHTML='<label class="light-switch"><input id="raking-enabled" type="checkbox"> Enable directional lighting engine</label><div id="raking-settings" hidden><label>Preset <select id="raking-preset"><option value="studio">Studio</option><option value="raking">Raking</option><option value="cross">Cross-light</option><option value="silhouette">Silhouette</option><option value="flat">Flat</option><option value="custom">Custom</option></select></label><label>Azimuth <output id="azimuth-value">45°</output><input id="azimuth" type="range" min="0" max="360" value="45"></label><label>Elevation <output id="elevation-value">40°</output><input id="elevation" type="range" min="0" max="90" value="40"></label><label>Key strength <output id="key-value">100%</output><input id="key" type="range" min="0" max="200" value="100"></label><label>Ambient fill <output id="ambient-value">35%</output><input id="ambient" type="range" min="0" max="100" value="35"></label><label class="light-switch"><input id="opposing" type="checkbox"> Opposing fill light</label><p class="small">Directional lights respond to specimen geometry. Original textures may contain baked shadows.</p></div>';
section.append(controls);
const $=id=>document.getElementById(id);
const presets={studio:[45,40,100,35,false],raking:[80,8,130,8,false],cross:[65,25,100,15,true],silhouette:[180,0,130,0,false],flat:[45,40,100,100,false]};
let renderer,scene,camera,orbit,root,ambient,key,fill,frame,observer,token=0,modelUrl='',active=false;
const stage=document.createElement('div');stage.className='raking-stage';stage.hidden=true;host.append(stage);
function init(){
 if(renderer)return;
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.setClearColor(0x101b27);stage.append(renderer.domElement);
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(45,1,.001,10000);
 ambient=new THREE.AmbientLight(0xffffff,1);key=new THREE.DirectionalLight(0xffffff,3);fill=new THREE.DirectionalLight(0xffffff,0);
 scene.add(ambient,key,fill);
 orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.1;
 const resize=()=>{if(!active)return;const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
 observer=new ResizeObserver(resize);observer.observe(stage);
 function draw(){if(!active)return;frame=requestAnimationFrame(draw);orbit.update();renderer.render(scene,camera);}
 stage.draw=()=>{resize();draw();};
}
function apply(){
 if(!renderer)return;
 const a=Number($('azimuth').value)*Math.PI/180,e=Number($('elevation').value)*Math.PI/180;
 const x=Math.sin(a)*Math.cos(e),y=Math.sin(e),z=Math.cos(a)*Math.cos(e);
 key.position.set(x*10,y*10,z*10);fill.position.set(-x*10,y*10,-z*10);
 const mode=$('raking-preset').value;
 const strength=Number($('key').value)*.03;
 key.intensity=mode==='flat'?0:strength;
 ambient.intensity=mode==='silhouette'?0:Number($('ambient').value)*.03;
 fill.intensity=$('opposing').checked?strength*.65:0;
 for(const [id,suffix] of [['azimuth','°'],['elevation','°'],['key','%'],['ambient','%']])$(id+'-value').textContent=$(id).value+suffix;
}
async function load(){
 if(!active||!original.src)return;
 const url=original.src,seq=++token;
 if(modelUrl===url&&root)return;
 modelUrl=url;const loader=new GLTFLoader();
 try{
  const gltf=await loader.loadAsync(url);if(seq!==token||!active)return;
  if(root)scene.remove(root);root=gltf.scene;scene.add(root);
  const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const radius=Math.max(size.length()*.65,.001);camera.position.copy(center).add(new THREE.Vector3(radius*1.5,radius*.8,radius*1.5));
  camera.near=Math.max(radius/10000,.00001);camera.far=radius*100;camera.updateProjectionMatrix();
  orbit.target.copy(center);orbit.update();$('status').textContent='';
 }catch(err){$('status').textContent='Directional renderer could not load this model: '+err.message;}
}
function activate(){
 active=$('raking-enabled').checked;
 $('raking-settings').hidden=!active;stage.hidden=!active;host.classList.toggle('directional-active',active);original.hidden=active;document.getElementById('annotation-help').textContent=active?'Directional mode: point placement uses the standard viewer. Switch back to add or inspect markers.':'Enable Place marker, then click a surface.';
 if(active){init();apply();stage.draw();load();}else{token++;cancelAnimationFrame(frame);}
}
$('raking-enabled').addEventListener('change',activate);
$('raking-preset').addEventListener('change',()=>{
 const p=presets[$('raking-preset').value];if(p){['azimuth','elevation','key','ambient'].forEach((id,i)=>$(id).value=p[i]);$('opposing').checked=p[4];}apply();
});
for(const id of ['azimuth','elevation','key','ambient','opposing'])$(id).addEventListener('input',()=>{$('raking-preset').value='custom';apply();});
original.addEventListener('load',()=>{if(active)load();});
new MutationObserver(()=>{if(active&&original.src!==modelUrl)load();}).observe(original,{attributes:true,attributeFilter:['src']});
