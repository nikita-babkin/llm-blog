"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import type { ThreeElement } from "@react-three/fiber";
import { Float, Line, Points, PointMaterial, shaderMaterial } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

const BinaryMaterial = shaderMaterial(
  { uTime: 0, uPixelRatio: 1, uHover: 0 },
  `attribute float aValue; attribute float aSize; attribute float aPhase;
  varying float vValue; varying float vPhase; varying float vDepth;
  uniform float uTime; uniform float uPixelRatio;
  void main(){
    vValue=mod(aValue+step(.985,fract(sin(aPhase*91.7+floor(uTime*.8))*43758.5)),2.0);
    vPhase=aPhase; vec3 p=position;
    p += normal*sin(uTime*.65+aPhase*18.0)*.018;
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    vDepth=clamp(1.0-(-mv.z-2.0)/8.0,.2,1.0);
    gl_PointSize=aSize*uPixelRatio*(5.6/-mv.z);
    gl_Position=projectionMatrix*mv;
  }`,
  `uniform float uTime; uniform float uHover; varying float vValue; varying float vPhase; varying float vDepth;
  float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
  void main(){
    vec2 p=gl_PointCoord*2.-1.; float d;
    if(vValue<.5){d=abs(length(p*vec2(1.,.78))-.58);}
    else{d=min(seg(p,vec2(-.18,.65),vec2(.1,.85)),min(seg(p,vec2(.1,.85),vec2(.1,-.72)),seg(p,vec2(-.2,-.72),vec2(.4,-.72))));}
    float glyph=1.-smoothstep(.07,.16,d);
    float flick=.58+.42*sin(uTime*1.7+vPhase*31.);
    float wave=.35+.65*smoothstep(.75,0.,abs(fract(vPhase+uTime*.075)*2.-1.));
    vec3 cyan=vec3(0.,.898,1.);
    vec3 accent=mix(vec3(.616,.306,.867),vec3(1.,.18,.533),step(.88,vPhase));
    vec3 color=mix(cyan,accent,step(.78,vPhase));
    float alpha=glyph*(.34+.5*flick+.35*wave+.2*uHover)*vDepth;
    if(alpha<.03)discard; gl_FragColor=vec4(color*wave,alpha);
  }`
);
extend({ BinaryMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    binaryMaterial: ThreeElement<typeof BinaryMaterial>;
  }
}

function insideBrain(x:number,y:number,z:number) {
  const side=Math.abs(x);
  const hemisphere=((side-.38)/1.72)**2+((y-.12)/1.48)**2+(z/1.34)**2;
  const temporal=((side-.92)/1.12)**2+((y+.46)/.9)**2+(z/1.12)**2;
  const lowerLobe=((side-.48)/1.3)**2+((y+.76)/.7)**2+((z+.12)/1.02)**2;
  const volume=Math.min(hemisphere,temporal,lowerLobe);
  if(volume>=1)return false;

  const fissureWidth=.035+.075*Math.max(0,(y+.55)/1.8)+.035*Math.max(0,z);
  if(side<fissureWidth&&y>-.72&&z>-.72)return false;

  const nearSurface=volume>.72;
  const folds=Math.sin(x*8.2+Math.sin(y*3.1))*Math.sin(y*9.4+z*3.7)*Math.sin(z*7.1-x*2.2);
  return !(nearSurface&&folds>.72&&volume>.86);
}

function BrainCloud({mobile,onLoad}:{mobile:boolean;onLoad:(value:number)=>void}) {
  const group=useRef<THREE.Group>(null);
  const material=useRef<THREE.ShaderMaterial>(null);
  const lastLoadUpdate=useRef(0);
  const {pointer,gl,size:viewport}=useThree();
  const [hovered,setHovered]=useState(false);
  const count=mobile?1300:viewport.width<1050?3000:6500;
  const data=useMemo(()=>{
    const pos:number[]=[],normal:number[]=[],value:number[]=[],glyphSize:number[]=[],phase:number[]=[];
    let tries=0;
    while(value.length<count&&tries<count*18){
      tries++;
      const x=(Math.random()-.5)*4.6,y=(Math.random()-.5)*3.45,z=(Math.random()-.5)*3.25;
      if(!insideBrain(x,y,z))continue;
      pos.push(x,y,z);
      const n=new THREE.Vector3(x/2.1,y/1.55,z/1.45).normalize();
      normal.push(n.x,n.y,n.z);
      value.push(Math.random()>.5?1:0);
      glyphSize.push(12+Math.random()*9);
      phase.push(Math.random());
    }
    return {pos:new Float32Array(pos),normal:new Float32Array(normal),value:new Float32Array(value),glyphSize:new Float32Array(glyphSize),phase:new Float32Array(phase)};
  },[count]);
  const lines=useMemo(()=>{
    const result:[THREE.Vector3,THREE.Vector3][]=[];
    if(mobile)return result;
    for(let i=0;i<24;i++){
      const a=Math.floor(Math.random()*(count-20)),b=a+1+Math.floor(Math.random()*16);
      result.push([new THREE.Vector3(data.pos[a*3],data.pos[a*3+1],data.pos[a*3+2]),new THREE.Vector3(data.pos[b*3],data.pos[b*3+1],data.pos[b*3+2])]);
    }
    return result;
  },[count,data,mobile]);
  useFrame(({clock},dt)=>{
    if(!group.current||!material.current)return;
    const t=clock.elapsedTime;
    if(t-lastLoadUpdate.current>.2){
      lastLoadUpdate.current=t;
      let lit=0;
      const hoverBoost=hovered?.2:0;
      for(let i=0;i<data.phase.length;i++){
        const phase=data.phase[i],flick=.58+.42*Math.sin(t*1.7+phase*31);
        const distance=Math.abs(((phase+t*.075)%1)*2-1),normalized=Math.min(1,distance/.75);
        const wave=.35+.65*(1-normalized*normalized*(3-2*normalized));
        if(.34+.5*flick+.35*wave+hoverBoost>.95)lit++;
      }
      onLoad((lit/data.phase.length)*100);
    }
    material.current.uniforms.uTime.value=t;
    material.current.uniforms.uHover.value=THREE.MathUtils.lerp(material.current.uniforms.uHover.value,hovered?1:0,dt*4);
    group.current.rotation.y+=dt*.075;
    group.current.rotation.x=THREE.MathUtils.lerp(group.current.rotation.x,pointer.y*.14,dt*2);
    group.current.rotation.z=THREE.MathUtils.lerp(group.current.rotation.z,-pointer.x*.09,dt*2);
    group.current.position.x=THREE.MathUtils.lerp(group.current.position.x,pointer.x*.13,dt*2);
    const scale=1+Math.sin(t*.8)*.012; group.current.scale.setScalar(scale);
  });
  return <group ref={group} onPointerOver={()=>setHovered(true)} onPointerOut={()=>setHovered(false)}>
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos,3]}/>
        <bufferAttribute attach="attributes-normal" args={[data.normal,3]}/>
        <bufferAttribute attach="attributes-aValue" args={[data.value,1]}/>
        <bufferAttribute attach="attributes-aSize" args={[data.glyphSize,1]}/>
        <bufferAttribute attach="attributes-aPhase" args={[data.phase,1]}/>
      </bufferGeometry>
      <binaryMaterial ref={material} transparent depthWrite={false} blending={THREE.AdditiveBlending} uPixelRatio={Math.min(gl.getPixelRatio(),1.7)}/>
    </points>
    {hovered&&!mobile&&lines.map((line,i)=><Line key={i} points={line} color={i%4===0?"#ff2e88":"#00e5ff"} transparent opacity={.25} lineWidth={.45}/>)}
  </group>;
}

function Particles({mobile}:{mobile:boolean}) {
  const positions=useMemo(()=>{const a=new Float32Array((mobile?120:360)*3);for(let i=0;i<a.length;i++)a[i]=(Math.random()-.5)*7;return a},[mobile]);
  return <Points positions={positions} stride={3}><PointMaterial transparent color="#9D4EDD" size={.018} sizeAttenuation depthWrite={false} opacity={.5}/></Points>;
}

type BinaryBrainProps={onLoad:(value:number)=>void;onReady:()=>void};

export default function BinaryBrain({onLoad,onReady}:BinaryBrainProps) {
  const mobile=typeof window!=="undefined"&&window.innerWidth<700;
  return <div className="brain-canvas" aria-label="Interactive binary code brain">
    <Canvas
      dpr={mobile?1:[1,1.6]}
      camera={{position:[0,0,5.8],fov:46}}
      gl={{antialias:!mobile,alpha:true,premultipliedAlpha:false,powerPreference:"high-performance"}}
      onCreated={({gl,scene})=>{gl.setClearColor(0x000000,0);scene.background=null;onReady()}}
    >
      <Float speed={1.1} rotationIntensity={.04} floatIntensity={.18}><BrainCloud mobile={mobile} onLoad={onLoad}/></Float>
      <Particles mobile={mobile}/>
      {!mobile&&<EffectComposer multisampling={0}><Bloom luminanceThreshold={.12} luminanceSmoothing={.6} intensity={1.15} mipmapBlur/></EffectComposer>}
    </Canvas>
    <div className="brain-scan"/><div className="brain-noise"/>
  </div>;
}
