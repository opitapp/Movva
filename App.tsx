import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Activity, Bike, Bell, ChartNoAxesColumn, ChevronRight, CircleUserRound, Flame, Footprints, Home, Map as MapIcon, MapPinned, Pause, Play, Plus, Route, Settings, Square, Timer, Trophy, X, LocateFixed, Navigation, Gauge, HeartPulse, Mountain, History, UserRound, Waves } from 'lucide-react'

type Point = [number, number]
type Sport = 'Corrida' | 'Caminhada' | 'Ciclismo'
type SavedActivity = { id:string; sport:Sport; date:string; distance:number; seconds:number; pace:number; path:Point[]; demo?:boolean }
const STORAGE = 'movva.activities.v1'
const fmtTime = (s:number) => `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor(s%3600/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`
const fmtPace = (sec:number) => `${Math.floor(sec/60)}:${Math.floor(sec%60).toString().padStart(2,'0')}`
const distBetween = (a:Point,b:Point) => { const r=6371000, rad=Math.PI/180; const dLat=(b[0]-a[0])*rad,dLon=(b[1]-a[1])*rad; const q=Math.sin(dLat/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dLon/2)**2; return r*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q)) }
const pin = L.divIcon({ className:'movva-pin', html:'<span></span>', iconSize:[20,20], iconAnchor:[10,10] })
const startPin = L.divIcon({ className:'start-pin', html:'<span>▶</span>', iconSize:[28,28], iconAnchor:[14,14] })
function Recenter({point}:{point:Point|null}) { const map=useMap(); useEffect(()=>{if(point)map.flyTo(point,16,{duration:.7})},[point,map]); return null }
function MapView({path,center,follow=true}:{path:Point[];center:Point|null;follow?:boolean}) {
 const last=path[path.length-1] || center || [-23.5505,-46.6333] as Point
 return <MapContainer center={last} zoom={15} zoomControl={false} scrollWheelZoom className="map">
  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <Recenter point={follow ? last : null}/>
  {path.length>1 && <Polyline positions={path} pathOptions={{color:'#ff6900',weight:6,opacity:.95}}/>}
  {path.length>0 && <Marker position={path[0]} icon={startPin}/>}
  {path.length>1 && <Marker position={path[path.length-1]} icon={pin}/>}
 </MapContainer>
}
function loadActivities():SavedActivity[] { try { return JSON.parse(localStorage.getItem(STORAGE)||'[]') } catch { return [] } }

export default function App() {
 const [tab,setTab]=useState('Início')
 const [activities,setActivities]=useState<SavedActivity[]>(loadActivities)
 const [sport,setSport]=useState<Sport>('Corrida')
 const [tracking,setTracking]=useState(false)
 const [paused,setPaused]=useState(false)
 const [seconds,setSeconds]=useState(0)
 const [distance,setDistance]=useState(0)
 const [path,setPath]=useState<Point[]>([])
 const [gpsStatus,setGpsStatus]=useState('GPS ainda não iniciado')
 const [center,setCenter]=useState<Point|null>(null)
 const [showTracker,setShowTracker]=useState(false)
 const [summary,setSummary]=useState<SavedActivity|null>(null)
 const [detail,setDetail]=useState<SavedActivity|null>(null)
 const [notice,setNotice]=useState('')
 const watchId=useRef<number|null>(null)
 const lastPoint=useRef<Point|null>(null)
 const lastAt=useRef(0)
 const distRef=useRef(0)
 useEffect(()=>{localStorage.setItem(STORAGE,JSON.stringify(activities))},[activities])
 useEffect(()=>{if(!tracking||paused)return; const id=window.setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(id)},[tracking,paused])
 useEffect(()=>()=>{if(watchId.current!==null)navigator.geolocation?.clearWatch(watchId.current)},[])
 const totalKm=activities.reduce((s,a)=>s+a.distance,0)
 const totalSeconds=activities.reduce((s,a)=>s+a.seconds,0)
 const calories=activities.reduce((s,a)=>s+Math.round(a.distance*62),0)
 const pace=distance>0 ? seconds/distance : 0
 const openTracker=(chosen:Sport='Corrida')=>{setSport(chosen);setShowTracker(true);setTab('Monitorar');setNotice('')}
 const beginGPS=()=>{
  if(!navigator.geolocation){setGpsStatus('Este navegador não oferece geolocalização.');return}
  setGpsStatus('Solicitando acesso ao GPS…')
  navigator.geolocation.getCurrentPosition(pos=>{
   const p:[number,number]=[pos.coords.latitude,pos.coords.longitude]
   setCenter(p);setPath([p]);lastPoint.current=p;lastAt.current=Date.now();setDistance(0);distRef.current=0;setSeconds(0);setPaused(false);setTracking(true);setGpsStatus('GPS conectado · registrando sua rota')
   watchId.current=navigator.geolocation.watchPosition(next=>{
    if(paused)return
    const point:[number,number]=[next.coords.latitude,next.coords.longitude]
    setCenter(point)
    const prev=lastPoint.current
    if(prev){const delta=distBetween(prev,point); if(delta>=2 && delta<100){distRef.current+=delta/1000;setDistance(distRef.current);setPath(old=>[...old,point])}}
    else setPath([point])
    lastPoint.current=point;lastAt.current=Date.now()
   },err=>setGpsStatus(err.code===1?'Permissão de localização negada. Ative nas configurações do navegador.':'Sinal GPS indisponível. Vá para uma área aberta.'),{enableHighAccuracy:true,maximumAge:1000,timeout:15000})
  },err=>setGpsStatus(err.code===1?'Permissão de localização negada. Autorize o GPS para gravar uma atividade.':'Não foi possível obter GPS. Tente novamente em área aberta.'),{enableHighAccuracy:true,timeout:15000,maximumAge:0})
 }
 const pauseGPS=()=>{setPaused(p=>!p)}
 const finish=()=>{
  if(watchId.current!==null){navigator.geolocation?.clearWatch(watchId.current);watchId.current=null}
  setTracking(false);setPaused(false)
  const item:SavedActivity={id:crypto.randomUUID(),sport,date:new Date().toISOString(),distance,seconds,pace:distance>0?seconds/distance:0,path}
  setSummary(item);setActivities(old=>[item,...old]);setShowTracker(false);setTab('Início');setGpsStatus('Atividade finalizada')
 }
 const startAgain=()=>{setSummary(null);setDetail(null);setPath([]);setDistance(0);setSeconds(0);setGpsStatus('GPS ainda não iniciado');openTracker(sport)}
 const demo=()=>{
  const now=Date.now(); const base:Point=center||[-23.5505,-46.6333]
  const p:Point[]=[base,[base[0]+.001,base[1]+.0008],[base[0]+.0018,base[1]+.002],[base[0]+.0007,base[1]+.003],[base[0]-.0007,base[1]+.002]]
  const item:SavedActivity={id:crypto.randomUUID(),sport,date:new Date(now).toISOString(),distance:3.2,seconds:19*60+45,pace:371,path:p,demo:true}
  setActivities(old=>[item,...old]);setSummary(item);setNotice('Atividade de demonstração salva. Não usa dados reais de GPS.')
 }
 const clearWatch=()=>{if(watchId.current!==null){navigator.geolocation?.clearWatch(watchId.current);watchId.current=null}}
 const nav=[{name:'Início',icon:Home},{name:'Estatísticas',icon:ChartNoAxesColumn},{name:'+',icon:Plus},{name:'Rotas',icon:MapIcon},{name:'Perfil',icon:Settings}]
 const renderNav=()=> <nav className="bottom-nav">{nav.map(({name,icon:Icon})=><button key={name} className={`nav-item ${tab===name?'active':''} ${name==='+'?'add':''}`} onClick={()=>name==='+'?openTracker():setTab(name)} aria-label={name==='+'?'Iniciar atividade':name}><Icon size={name==='+'?30:23}/>{name!=='+'&&<span>{name}</span>}</button>)}</nav>
 const activityCard=(a:SavedActivity)=><button className="activity-row" key={a.id} onClick={()=>setDetail(a)}><div className="activity-map-mini"><MapPinned size={28}/><span>{a.path.length} pontos GPS</span></div><div className="activity-info"><b>{a.sport}{a.demo&&<small className="demo-tag">DEMO</small>}</b><span>{new Date(a.date).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</span><div className="activity-stats"><strong>{a.distance.toFixed(2)} <small>km</small></strong><strong>{a.distance?fmtPace(a.seconds/a.distance):'—'} <small>/km</small></strong><strong>{fmtTime(a.seconds)}</strong></div></div><ChevronRight size={18}/></button>
 if(showTracker) return <div className="app-shell tracker-shell">
  <header className="tracker-head"><button className="icon-btn" onClick={()=>{if(tracking){setNotice('Finalize ou pause a atividade antes de sair.');return}setShowTracker(false);setTab('Início')}}><X/></button><div><span className="eyebrow">MOVVA · ATIVIDADE</span><h2>{sport}</h2></div><button className="icon-btn" onClick={()=>setNotice('Mantenha o GPS ativado para registrar a rota.')}><Settings/></button></header>
  <div className="tracker-metrics"><div><span>Distância</span><b>{distance.toFixed(2)} <small>km</small></b></div><div><span>Ritmo médio</span><b>{distance>0?fmtPace(pace):'--:--'} <small>/km</small></b></div><div><span>Tempo</span><b>{fmtTime(seconds)}</b></div></div>
  <div className="map-wrap tracker-map"><MapView path={path} center={center}/><button className="map-locate" onClick={()=>center&&setCenter([...center] as Point)}><LocateFixed/></button><div className="map-attribution-note">Mapa © OpenStreetMap</div></div>
  <div className="gps-status"><span className={tracking&&!paused?'live-dot':''}/>{gpsStatus}</div>
  <div className="tracker-bottom"><div className="tracker-extra"><div><HeartPulse/><span>FC</span><b>—</b></div><div><Flame/><span>Calorias estimadas</span><b>{Math.round(distance*62)} kcal</b></div><div><Mountain/><span>Elevação</span><b>—</b></div></div>
   {!tracking?<><button className="primary-btn start-btn" onClick={beginGPS}><Play fill="currentColor"/> Iniciar GPS real</button><button className="secondary-btn" onClick={demo}>Experimentar com dados de demonstração</button></>:<div className="control-row"><button className="round-control" onClick={pauseGPS}>{paused?<Play fill="currentColor"/>:<Pause fill="currentColor"/>}<span>{paused?'Continuar':'Pausar'}</span></button><button className="finish-btn" onClick={finish}><Square fill="currentColor"/><span>Finalizar</span></button></div>}
   {notice&&<p className="notice">{notice}</p>}
  </div>{renderNav()}
 </div>
 if(summary||detail){const a=detail||summary!;return <div className="app-shell"><header className="topbar"><button className="icon-btn" onClick={()=>{setSummary(null);setDetail(null)}}><X/></button><div className="brand-small">MOVVA</div><span className="eyebrow">RESUMO</span></header><main className="summary-page"><div className="summary-icon"><Trophy size={34}/></div><h1>{detail?'Detalhes da atividade':'Atividade concluída!'}</h1><p className="muted">{a.demo?'Dados de demonstração':new Date(a.date).toLocaleString('pt-BR')}</p><div className="summary-map"><MapView path={a.path} center={a.path[0]||null} follow={false}/></div><div className="summary-grid"><div><span>Distância</span><b>{a.distance.toFixed(2)} km</b></div><div><span>Tempo</span><b>{fmtTime(a.seconds)}</b></div><div><span>Ritmo médio</span><b>{a.distance?fmtPace(a.seconds/a.distance):'--:--'} /km</b></div><div><span>Calorias est.</span><b>{Math.round(a.distance*62)} kcal</b></div></div>{a.demo&&<p className="notice">Esta atividade é apenas demonstrativa, não representa uma rota GPS real.</p>}<button className="primary-btn" onClick={()=>{setSummary(null);setDetail(null);setTab('Início')}}>Voltar ao início</button><button className="secondary-btn" onClick={()=>{setSummary(null);setDetail(null);openTracker(a.sport)}}>Nova atividade</button></main>{renderNav()}</div>}
 return <div className="app-shell">
  <header className="home-header"><div className="brand"><div className="brand-mark">M</div><div><strong>MOVVA</strong><span>Corre. Evolua. Conquiste.</span></div></div><button className="icon-btn notification" onClick={()=>setNotice('Você está em dia! Continue registrando suas atividades.')} aria-label="Notificações"><Bell/><i/></button></header>
  {tab==='Início'&&<main className="home-content">
   <div className="welcome"><div><h1>Olá, atleta!</h1><p>Pronto para sua próxima atividade?</p></div><div className="avatar"><CircleUserRound/></div></div>
   <button className="hero-cta" onClick={()=>openTracker('Corrida')}><span className="runner-icon"><Activity size={34}/></span><span><b>Iniciar atividade</b><small>Corrida, caminhada ou ciclismo</small></span><ChevronRight className="cta-arrow"/></button>
   <div className="section-title"><h2>Seu progresso</h2><button onClick={()=>setTab('Estatísticas')}>Ver detalhes <ChevronRight size={17}/></button></div>
   <div className="metric-grid"><div className="metric-card"><Route/><span>Total de km</span><b>{totalKm.toFixed(1).replace('.',',')}</b><small>km registrados</small></div><div className="metric-card"><Footprints/><span>Atividades</span><b>{activities.length}</b><small>no histórico</small></div><div className="metric-card"><Flame/><span>Calorias</span><b>{calories.toLocaleString('pt-BR')}</b><small>kcal estimadas</small></div><div className="metric-card"><Timer/><span>Tempo total</span><b className="time-stat">{fmtTime(totalSeconds)}</b><small>tempo registrado</small></div></div>
   <section className="light-panel"><div className="section-title"><h2>Última atividade</h2><button onClick={()=>setTab('Estatísticas')}>Ver histórico <ChevronRight size={17}/></button></div>{activities.length?activityCard(activities[0]):<div className="empty-activity"><div className="empty-map"><MapPinned size={32}/></div><div><b>Sua jornada começa aqui</b><p>Registre sua primeira corrida para ver seus resultados.</p></div></div>}
    <div className="section-title activity-title"><h2>Suas atividades</h2><button onClick={()=>setTab('Rotas')}>Explorar <ChevronRight size={17}/></button></div>
    <div className="sports-grid">{([{name:'Corrida' as Sport,icon:Activity},{name:'Caminhada' as Sport,icon:Footprints},{name:'Ciclismo' as Sport,icon:Bike}] ).map(({name,icon:Icon})=><button key={name} onClick={()=>openTracker(name)}><Icon/><span>{name}</span></button>)}</div>
    <div className="challenge-banner"><div className="banner-orbit">↗</div><div><b>Desafie seus limites</b><p>Cada quilômetro conta. Comece hoje!</p></div><Trophy/></div>
    <div className="section-title feature-title"><h2>Explore o MOVVA</h2></div><div className="feature-grid"><button onClick={()=>setTab('Rotas')}><MapIcon/><span>Rotas</span></button><button onClick={()=>setTab('Estatísticas')}><ChartNoAxesColumn/><span>Estatísticas</span></button><button onClick={()=>setNotice('Desafios avançados estarão disponíveis em uma próxima versão.')}><Trophy/><span>Desafios</span></button></div>
   </section>
   {notice&&<button className="notice notice-dismiss" onClick={()=>setNotice('')}>{notice} <X size={14}/></button>}
  </main>}
  {tab==='Estatísticas'&&<main className="inner-page"><div className="page-heading"><span className="eyebrow">SEU DESEMPENHO</span><h1>Estatísticas</h1><p>Todos os dados vêm das atividades salvas neste aparelho.</p></div><div className="stats-big"><span>Distância total</span><b>{totalKm.toFixed(2)} km</b><div className="progress-line"><i style={{width:`${Math.min(totalKm/50*100,100)}%`}}/></div><small>Meta ilustrativa de 50 km</small></div><div className="stats-cards"><div><Flame/><span>Calorias estimadas</span><b>{calories.toLocaleString('pt-BR')} kcal</b></div><div><Timer/><span>Tempo total</span><b>{fmtTime(totalSeconds)}</b></div><div><Activity/><span>Atividades</span><b>{activities.length}</b></div><div><Gauge/><span>Ritmo médio</span><b>{totalKm?fmtPace(totalSeconds/totalKm):'--:--'} /km</b></div></div><h2 className="subheading">Histórico</h2>{activities.length?activities.map(activityCard):<div className="empty-state"><History size={36}/><b>Nenhuma atividade ainda</b><p>Comece uma corrida para construir seu histórico.</p><button className="primary-btn" onClick={()=>openTracker()}>Iniciar atividade</button></div>}</main>}
  {tab==='Rotas'&&<main className="inner-page"><div className="page-heading"><span className="eyebrow">DESCUBRA CAMINHOS</span><h1>Rotas</h1><p>Use o GPS para registrar seus próprios percursos.</p></div><div className="route-promo"><div className="route-promo-icon"><Navigation/></div><h2>Seu próximo caminho começa aqui</h2><p>O mapa gratuito aparece ao iniciar uma atividade e autorizar a localização do aparelho.</p><button className="primary-btn" onClick={()=>openTracker('Corrida')}>Abrir mapa e correr</button></div><h2 className="subheading">Suas atividades recentes</h2>{activities.length?activities.slice(0,5).map(activityCard):<p className="muted">As rotas que você registrar aparecerão aqui.</p>}</main>}
  {tab==='Perfil'&&<main className="inner-page"><div className="profile-hero"><div className="profile-avatar"><CircleUserRound size={48}/></div><span className="eyebrow">SEU ESPAÇO</span><h1>Atleta MOVVA</h1><p>Corre. Evolua. Conquiste.</p></div><div className="settings-list"><button onClick={()=>setNotice('O MOVVA salva as atividades localmente neste aparelho.')}><Settings/><span><b>Preferências</b><small>Dados e armazenamento local</small></span><ChevronRight/></button><button onClick={()=>setNotice('Versão inicial do MOVVA · PWA')}><Activity/><span><b>Sobre o MOVVA</b><small>Versão inicial</small></span><ChevronRight/></button><button onClick={()=>{if(confirm('Apagar todas as atividades salvas neste aparelho?')){setActivities([]);localStorage.removeItem(STORAGE);setNotice('Histórico apagado.')}}}><X/><span><b>Apagar histórico</b><small>Remove dados deste aparelho</small></span><ChevronRight/></button></div>{notice&&<p className="notice">{notice}</p>}</main>}
  {renderNav()}
 </div>
}