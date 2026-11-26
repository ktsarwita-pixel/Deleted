import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { GameEngine } from './game/engine';
import type { Destination, GameSnapshot } from './game/model';
import { CUTSCENE } from './canvas/worldData';
import { renderGameWorld, warmupWorldAssets } from './canvas/pixelRenderer';
import { warmupSprites } from './canvas/sprites';
import { warmupTrees } from './canvas/trees';
import { Icon, type IconName } from './components/Icon';
import { BigBucketPixelIcon, FireFlameIcon, NewShoesPixelIcon, NormalBucketPixelIcon, PortraitPixelArt, RupiahCoinIcon } from './components/PixelIcons';
import { Modal } from './components/Modal';
import { WarungBudiModal } from './components/WarungBudiModal';
import { EMOTE_OPTIONS, EmoteWheel } from './components/EmoteWheel';
import { formatRupiah } from './utils/formatRupiah';

function GameCanvas({ engine }: { engine: GameEngine }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => engine.mount(ref.current!), [engine]);
  return <canvas ref={ref} className="game-canvas" tabIndex={0} aria-label="Area permainan Wira. Gunakan WASD atau tombol panah untuk bergerak, E untuk berinteraksi. Klik tanah untuk berjalan."
    onPointerDown={e => { e.currentTarget.focus({ preventScroll: true }); engine.clickCanvas(e.clientX, e.clientY, e.pointerType === 'touch'); }} />;
}

function MobileJoystick({ engine }: { engine: GameEngine }) {
  const pointer = useRef<number | null>(null);
  const [held, setHeld] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  useEffect(() => () => engine.setAnalog(0, 0), [engine]);
  const move = (el: HTMLElement, x: number, y: number) => {
    const rect = el.getBoundingClientRect();
    const dx = x - rect.left - rect.width / 2;
    const dy = y - rect.top - rect.height / 2;
    const radius = rect.width * 0.36;
    const length = Math.hypot(dx, dy);
    const factor = length > radius ? radius / length : 1;
    const nx = dx * factor, ny = dy * factor;
    setOffset({ x: nx, y: ny });
    engine.setAnalog(nx / radius, ny / radius);
  };
  const release = () => { pointer.current = null; setHeld(false); setOffset({ x: 0, y: 0 }); engine.setAnalog(0, 0); };
  return <div className="mobile-joystick-wrap">
    <button type="button" className={`mobile-joystick ${held ? 'is-held' : ''}`} aria-label="Joystick gerak" title="Geser untuk bergerak ke segala arah"
      onPointerDown={e => { e.preventDefault(); pointer.current = e.pointerId; setHeld(true); e.currentTarget.setPointerCapture(e.pointerId); move(e.currentTarget, e.clientX, e.clientY); }}
      onPointerMove={e => { if (pointer.current === e.pointerId) move(e.currentTarget, e.clientX, e.clientY); }}
      onPointerUp={e => { if (pointer.current === e.pointerId) release(); }}
      onPointerCancel={release} onLostPointerCapture={release}>
      <span className="joystick-ring" />
      <span className="joystick-thumb" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}><Icon name="pin" size={20} /></span>
    </button>
    <span className="joystick-caption">GESER UNTUK GERAK</span>
  </div>;
}

function currentMission(s: GameSnapshot): { number: string; title: string; description: string; button: string; destination: Destination; icon: IconName } {
  if(s.progress===100) return { number:'SELESAI',title:'Hutan kembali bernapas.',description:'Berkatmu, semua titik api sudah padam. Nikmati kembali desa yang tenang.',button:s.scene==='house'?'Jelajahi desa':'Kembali ke rumah',destination:s.scene==='house'?'exit':'home',icon:'leaf' };
  if(!s.discovered) return { number:'01',title:'Ada sesuatu di luar...',description:'Wira mencium bau asap. Jelajahi rumah, lalu periksa keadaan di luar.',button:'Keluar rumah',destination:'exit',icon:'home' };
  if(s.scene==='house') return { number:'02',title:'Desa membutuhkanmu.',description:'Kembali ke luar dan lanjutkan perjalanan untuk menyelamatkan hutan.',button:'Keluar rumah',destination:'exit',icon:'home' };
  if(s.player.bucketType==='none') return { number:'02',title:'Siapkan perlengkapan.',description:'Kunjungi Warung Budi dan beli ember untuk mengambil air dari danau.',button:'Menuju Warung Budi',destination:'shop',icon:'bag' };
  if(!s.player.waterUnits) { const nearCanal = s.scene==='village' && s.player.x > 920; return { number:'03',title:'Setiap tetes berarti.',description:nearCanal?'Embermu kosong. Isi ulang cepat di kanal sekat bakar hutan.':'Embermu kosong. Berjalanlah ke dermaga dan isi air dari danau.',button:nearCanal?'Menuju kanal gambut':'Menuju danau',destination:nearCanal?'canal':'lake',icon:'drop' }; }
  return { number:'04',title:'Bawa harapan ke hutan.',description:'Air sudah siap. Dekati titik api dan siram hingga seluruh api padam.',button:'Menuju titik api',destination:'fire',icon:'shield' };
}

function Sidebar({ state:s, engine }: { state:GameSnapshot; engine:GameEngine }) {
  const mission=currentMission(s);
  return <aside className="sidebar" aria-label="Informasi dan misi Wira">
    <div className="player-profile"><div className="profile-portrait"><PortraitPixelArt size={52} /></div><div><h2>Wira</h2><span>Warga Desa Rantau</span></div><span className="online-dot" title="Siap berpetualang" /></div>
    <section className="wallet"><div className="section-label"><RupiahCoinIcon size={21} /><span>Uang Wira</span></div><strong key={s.player.rupiah} className="wallet-value">{formatRupiah(s.player.rupiah)}</strong></section>
    <section className="mission-section"><div className="section-heading"><span className="section-label"><Icon name="shield" size={16} />MISI SAAT INI</span><span className="chapter-number">{mission.number}</span></div><h3>{mission.title}</h3><p>{mission.description}</p>
      <button className="mission-button" disabled={!!s.dialogue} onClick={()=>engine.go(mission.destination)}>{s.walking?'Sedang berjalan...':mission.button}<Icon name="arrow" size={17} /></button>
    </section>
    <section className="progress-section"><div className="section-heading"><span className="section-label">PEMADAMAN HUTAN</span><strong className={s.progress===100?'completed-text':''}>{s.progress}<small>%</small></strong></div>
      <div className="fire-progress" role="progressbar" aria-label="Kemajuan pemadaman hutan" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.progress}>{Array.from({length:10},(_,i)=><span key={i} className={i<s.progress/10?'is-complete':''}/>)}</div>
      <p>{s.progress/10} dari 10 titik api padam <Icon name="leaf" size={14} /></p>
    </section>
    <section className="equipment-section"><div className="section-label">PERLENGKAPAN</div>
      <button className="equipment-row" onClick={()=>engine.setPanel('shop')} aria-label="Lihat perlengkapan ember di Warung Budi">
        <span className={`equipment-art ${s.player.bucketType==='none'?'not-owned':''}`}>{s.player.bucketType==='big'?<BigBucketPixelIcon filled={s.player.waterUnits>0} size={36}/>:<NormalBucketPixelIcon filled={s.player.waterUnits>0} size={36}/>}</span>
        <span><strong>{s.player.bucketType==='big'?'Ember besar':'Ember air'}</strong><small>{s.player.bucketType==='none'?'Belum dimiliki':`${s.player.waterUnits} / ${s.player.maxWaterUnits} takar air`}</small></span>
        {s.player.bucketType!=='none'?<span className="water-units">{Array.from({length:s.player.maxWaterUnits},(_,i)=><Icon key={i} name="drop" size={14} className={i<s.player.waterUnits?'filled':''}/>)}</span>:<Icon name="chevron" size={15}/>}
      </button>
      <button className="equipment-row" onClick={()=>engine.setPanel('shop')} aria-label="Lihat sepatu baru di Warung Budi"><span className={`equipment-art ${!s.player.hasNewShoes?'not-owned':''}`}><NewShoesPixelIcon size={36}/></span><span><strong>Sepatu baru</strong><small>{s.player.hasNewShoes?'Kecepatan +20%':'Kecepatan normal'}</small></span><Icon name={s.player.hasNewShoes?'check':'chevron'} size={15}/></button>
    </section>
  </aside>;
}

function VillageMap({ engine,state }: {engine:GameEngine;state:GameSnapshot}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const ctx=ref.current!.getContext('2d')!;
    const world={...engine.world,scene:'village' as const,prompt:null,path:[],destination:null,effects:[],action:null,transition:0,reducedMotion:true,player:{...engine.world.player,x:state.scene==='house'?210:engine.world.player.x,y:state.scene==='house'?300:engine.world.player.y}};
    renderGameWorld(ctx,world,{x:980,y:510,width:745,height:388,scale:.38},{preview:true});
  },[engine,state.scene,state.progress]);
  return <><p className="modal-description">{state.scene==='house'?'Kamu masih di dalam rumah. Keluar dahulu untuk menjelajahi desa.':'Pilih tujuan di Desa Rantau atau Hutan Gambut. Wira akan otomatis mencari jalan.'}</p>
    <div className="village-map"><canvas ref={ref} width={745} height={388} aria-label="Peta Desa Rantau dengan rumah, Warung Budi, danau, kanal sekat bakar, dan hutan gambut"/>
      {([
        {id:'home',label:'Rumah Wira',x:11,y:28,icon:'home'},
        {id:'shop',label:'Warung Budi',x:29,y:27,icon:'bag'},
        {id:'chief',label:'Posko RT',x:43,y:29,icon:'shield'},
        {id:'lake',label:'Danau',x:23,y:62,icon:'drop'},
        {id:'canal',label:'Kanal Gambut',x:70,y:49,icon:'drop'},
        {id:'fire',label:state.progress===100?'Hutan aman':'Titik api',x:86,y:38,icon:'leaf'},
      ] as {id:Destination;label:string;x:number;y:number;icon:IconName}[]).map(p=><button key={p.id} className="map-marker" style={{left:`${p.x}%`,top:`${p.y}%`}} disabled={state.scene==='house'||!!state.dialogue||(p.id==='fire'&&state.progress===100)} onClick={()=>engine.go(p.id)}><Icon name={p.icon} size={14}/>{p.label}</button>)}
    </div>
    {state.scene==='house'&&<button className="button button-primary map-exit" onClick={()=>engine.go('exit')}>Keluar rumah<Icon name="arrow" size={17}/></button>}
  </>;
}

function Help() {
  return <><p className="modal-description">Kamu adalah Wira, warga Kalimantan. Mulai dari rumah, temukan sumber asap, dan bantu selamatkan hutan. Di ponsel, geser joystick untuk berjalan ke segala arah atau sentuh tujuan di peta.</p>
    <div className="help-steps">{[
      ['01','Jelajahi rumah','Klik atau sentuh tanah untuk berjalan. Sentuh objek untuk otomatis mendekat dan berinteraksi, atau tekan E saat di dekatnya. Ambil tabungan sebelum keluar.'],
      ['02','Beli perlengkapan','Ember air Rp 12.000,00. Ember besar Rp 24.000,00 menampung dua kali air. Sepatu baru Rp 22.000,00 menambah kecepatan 20%.'],
      ['03','Isi air, lalu padamkan','Isi ember di dermaga danau. Siram titik api untuk menambah progres 10% dan menerima bantuan Rp 6.000,00. Ulangi hingga 100%.'],
    ].map(([n,h,p])=><div key={n}><span>{n}</span><div><h3>{h}</h3><p>{p}</p></div></div>)}</div>
    <div className="help-shortcuts"><span><kbd>W A S D</kbd> atau panah untuk bergerak</span><span><kbd>E</kbd> berinteraksi</span><span><kbd>G</kbd> roda emote</span><span><kbd>B</kbd> warung</span><span><kbd>M</kbd> peta</span><span><kbd>Esc</kbd> jeda</span></div>
    <p className="safety-note"><Icon name="shield" size={19}/><span>Ini permainan fiksi. Di dunia nyata, jangan mendekati karhutla. Jauhi asap, evakuasi ke tempat aman, dan hubungi petugas.</span></p>
  </>;
}

function PauseSettings({engine,state}:{engine:GameEngine;state:GameSnapshot}) {
  const [confirm,setConfirm]=useState(false);
  return <>
    <p className="modal-description">Tarik napas sejenak. Petualanganmu menunggu.</p>
    <button className="settings-row" onClick={engine.toggleMute}><span><Icon name={state.muted?'muted':'sound'}/>Efek suara</span><span className={`switch ${!state.muted?'on':''}`} role="switch" aria-checked={!state.muted} aria-label="Efek suara"><i/></span></button>
    <button className="settings-row" onClick={engine.toggleMotion}><span><Icon name="leaf"/>Kurangi gerakan dekoratif</span><span className={`switch ${state.reducedMotion?'on':''}`} role="switch" aria-checked={state.reducedMotion} aria-label="Kurangi gerakan dekoratif"><i/></span></button>
    <button className="button button-primary resume-button" onClick={()=>engine.setPanel(null)}><Icon name="play" size={17}/>Lanjutkan petualangan</button>
    {!confirm?<button className="text-button reset-button" onClick={()=>setConfirm(true)}><Icon name="reset" size={16}/>Ulang dari awal</button>:<div className="reset-confirm"><p>Hapus progres dan mulai lagi dari rumah Wira?</p><div><button className="button button-secondary" onClick={()=>setConfirm(false)}>Batal</button><button className="button button-danger" onClick={engine.reset}>Ya, mulai ulang</button></div></div>}
  </>;
}

export default function App() {
  const [engine]=useState(()=>new GameEngine());
  const state=useSyncExternalStore(engine.subscribe,engine.getSnapshot,engine.getSnapshot);
  const consoleRef=useRef<HTMLElement>(null);
  const [isFullscreen,setFullscreen]=useState(false);
  const [emoteWheelOpen,setEmoteWheelOpen]=useState(false);
  const [resetConfirmOpen,setResetConfirmOpen]=useState(false);

  useEffect(()=>{
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const run = () => { warmupSprites(); warmupTrees(); warmupWorldAssets(); };
    if (idle) { const id = idle(run); return () => (window as unknown as { cancelIdleCallback?: (n: number) => void }).cancelIdleCallback?.(id); }
    const t = window.setTimeout(run, 120);
    return () => window.clearTimeout(t);
  },[]);

  useEffect(()=>{
    if(state.panel||state.dialogue||state.cutscene>=0) setEmoteWheelOpen(false);
  },[state.panel,state.dialogue,state.cutscene]);

  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey) return;
      const target=e.target as HTMLElement;
      if(target.closest('[role="dialog"]')||['INPUT','TEXTAREA','SELECT'].includes(target.tagName)) return;
      const key=e.key.toLowerCase();
      if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)) { e.preventDefault();engine.setKey(key,true);return; }
      if(e.repeat) return;
      if(key==='escape') {
        e.preventDefault();
        if(resetConfirmOpen)setResetConfirmOpen(false);
        else if(emoteWheelOpen)setEmoteWheelOpen(false);
        else if(engine.world.panel)engine.setPanel(null);else if(engine.world.dialogue)engine.skipCutscene();else engine.setPanel('pause');
      } else if(key==='g') {
        if(!engine.world.panel&&!engine.world.dialogue&&engine.world.cutscene<0) {
          e.preventDefault();
          setEmoteWheelOpen(v=>!v);
        }
      } else if(['1','2','3','4'].includes(key)&&!engine.world.panel&&!engine.world.dialogue&&engine.world.cutscene<0) {
        const picked=EMOTE_OPTIONS.find(o=>o.hotkey===key);
        if(picked) { e.preventDefault(); engine.triggerEmote(picked.id); setEmoteWheelOpen(false); }
      } else if(key==='e'||((key===' '||key==='enter')&&target.tagName!=='BUTTON')) {e.preventDefault();engine.interact();}
      else if(key==='m') {e.preventDefault();engine.setPanel(engine.world.panel==='map'?null:'map');}
      else if(key==='b') {e.preventDefault();engine.setPanel(engine.world.panel==='shop'?null:'shop');}
    };
    const up=(e:KeyboardEvent)=>engine.setKey(e.key,false);
    const onFullscreen=()=>setFullscreen(!!document.fullscreenElement);
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);document.addEventListener('fullscreenchange',onFullscreen);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);document.removeEventListener('fullscreenchange',onFullscreen);};
  },[engine,emoteWheelOpen,resetConfirmOpen]);

  const toggleFullscreen=async()=>{
    try { if(document.fullscreenElement)await document.exitFullscreen();else if(consoleRef.current?.requestFullscreen)await consoleRef.current.requestFullscreen();else engine.notify('Layar penuh tidak tersedia di peramban ini.'); }
    catch { engine.notify('Peramban tidak mengizinkan layar penuh.'); }
  };
  const closePanel=()=>engine.setPanel(null);
  const panelTitle=state.panel==='shop'?'Warung Budi':state.panel==='map'?'Peta Desa Rantau':state.panel==='help'?'Bekal petualanganmu':state.panel==='victory'?'Hutan kembali bernapas.':'Permainan dijeda';
  const canAct=!!state.prompt&&!state.dialogue&&!state.panel;

  return <div className={`app-shell ${state.reducedMotion?'reduce-motion':''}`}>
    <header className="site-header">
      <a className="brand" href="#permainan" aria-label="Karhutla, ke permainan"><FireFlameIcon size={38}/><div><span className="brand-name">KARHUTLA</span><span className="brand-caption">KISAH DARI KALIMANTAN</span></div></a>
      <nav className="main-nav" aria-label="Navigasi utama">
        <button className={!state.panel?'nav-link active':'nav-link'} onClick={closePanel} aria-label="Permainan"><Icon name="play" size={16}/><span>Permainan</span></button>
        <button className={state.panel==='map'?'nav-link active':'nav-link'} onClick={()=>engine.setPanel('map')} aria-label="Peta desa"><Icon name="map" size={17}/><span>Peta desa</span></button>
        <button className={state.panel==='help'?'nav-link active':'nav-link'} onClick={()=>engine.setPanel('help')} aria-label="Panduan"><Icon name="help" size={17}/><span>Panduan</span></button>
      </nav>
      <div className="header-actions"><span className="sound-label">{state.muted?'Suara mati':'Suara aktif'}</span><button className="icon-button" onClick={engine.toggleMute} aria-label={state.muted?'Aktifkan suara':'Matikan suara'} aria-pressed={!state.muted}><Icon name={state.muted?'muted':'sound'} size={19}/></button><span className="header-separator"/><button className="header-reset-button" onClick={()=>{setEmoteWheelOpen(false);setResetConfirmOpen(true);}} aria-label="Reset permainan" title="Ulang permainan dari awal"><Icon name="reset" size={15}/><span>Reset</span></button><button className="icon-button" onClick={()=>engine.setPanel('pause')} aria-label="Jeda permainan"><Icon name="pause" size={18}/></button></div>
    </header>

    <main id="permainan" className="main-content">
      <div className="page-intro"><div><div className="eyebrow intro-eyebrow"><span/>SEBUAH PETUALANGAN PIXEL</div><h1>Petualangan Wira<span>.</span></h1><p>Rumah adalah awal. Hutan adalah tujuan.</p></div><div className="season"><Icon name="sun" size={29}/><div><span>Musim kemarau</span><small>Hari 01 di Kalimantan</small></div></div></div>
      <div className="workspace">
        <section className="game-console" ref={consoleRef} aria-label="Permainan Karhutla">
          <div className="console-header"><div className="location"><Icon name={state.scene==='house'?'home':'pin'} size={17}/><strong>{state.scene==='house'?'Rumah Wira':'Desa Rantau'}</strong><span className="location-divider"/><span className="location-caption">{state.scene==='house'?'Awal sebuah perjalanan':'Kalimantan, Indonesia'}</span></div><div className="console-tools"><span className="chapter">BAB {state.discovered?'02':'01'}</span><button className="console-reset-button" onClick={()=>{setEmoteWheelOpen(false);setResetConfirmOpen(true);}} aria-label="Reset permainan" title="Ulang permainan dari awal"><Icon name="reset" size={13}/><span>Reset</span></button><button className="icon-button" onClick={toggleFullscreen} aria-label={isFullscreen?'Keluar layar penuh':'Layar penuh'}><Icon name="expand" size={17}/></button></div></div>
          <div className="mobile-wallet"><span><RupiahCoinIcon size={19}/>Uang Wira</span><strong>{formatRupiah(state.player.rupiah)}</strong>{state.player.bucketType!=='none'&&<span className="mobile-water"><Icon name="drop" size={15}/>{state.player.waterUnits}/{state.player.maxWaterUnits}</span>}</div>
          <div className={`canvas-stage ${state.cutscene>=0?'is-cinematic':''}`}>
            <GameCanvas engine={engine}/>
            <div className="stage-location"><span className="tiny-square"/>{state.cutscene>=0?'KABUT DI UJUNG DESA':state.scene==='house'?'RUMAH PANGGUNG WIRA':'DESA RANTAU'}</div>
             {!state.discovered&&<div className="canvas-hint"><span className="hint-dot"/>Sentuh atau klik objek untuk berinteraksi</div>}
            {state.cutscene>=0&&<button className="skip-scene" onClick={engine.skipCutscene}>Lewati cerita<Icon name="chevron" size={13}/></button>}
            {state.dialogue&&<div className="dialogue" key={state.dialogue.text} role="region" aria-label="Dialog cerita"><PortraitPixelArt portrait={state.dialogue.portrait} size={48} animated/><div className="dialogue-text"><div><strong>{state.dialogue.speaker}</strong><span>{state.cutscene>=0?`${state.cutscene+1} / ${CUTSCENE.length}`:state.dialogue.role}</span></div><p>{state.dialogue.text}</p></div><button className="dialogue-next" onClick={engine.advanceDialogue} aria-label={state.cutscene>=0?'Lanjutkan cerita':'Tutup dialog'}><span>{state.cutscene===CUTSCENE.length-1?'Mulai misi':state.cutscene>=0?'Lanjut':'Tutup'}</span><Icon name="arrow" size={18}/></button></div>}
            {state.notice&&!state.panel&&<div className={`game-notice notice-${state.notice.tone}`} key={state.notice.id} role="status"><Icon name={state.notice.tone==='success'?'check':state.notice.tone==='error'?'help':'leaf'} size={17}/><span>{state.notice.text}</span></div>}
            <EmoteWheel
              open={emoteWheelOpen}
              disabled={!!state.panel || !!state.dialogue || state.cutscene >= 0}
              activeEmote={state.activeEmote ?? null}
              onToggle={() => setEmoteWheelOpen(v => !v)}
              onClose={() => setEmoteWheelOpen(false)}
              onSelect={engine.triggerEmote}
            />
          </div>
          <div className="console-controls">
            <div className="keyboard-controls"><span className="key-group"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span>Bergerak</span><i/><span className="mouse-control"><svg width="13" height="18" viewBox="0 0 14 18" fill="none" aria-hidden="true"><rect x="1" y="1" width="12" height="16" rx="5" stroke="currentColor"/><path d="M7 1v6M1 7h12" stroke="currentColor"/></svg>Klik untuk berjalan</span></div>
            <MobileJoystick engine={engine} />
            <button className={`interact-button desktop-action ${canAct?'available':''}`} onClick={()=>engine.interact()} disabled={!canAct}><kbd>E</kbd><span>{state.prompt?.label??'Dekati objek'}</span><Icon name="chevron" size={15}/></button>
            <button className={`interact-button mobile-action ${canAct || state.dialogue ? 'available' : ''}`} disabled={!!state.panel}
              onClick={() => { if (state.dialogue) engine.advanceDialogue(); else if (canAct) engine.interact(); else engine.go(currentMission(state).destination); }}>
              <Icon name={state.dialogue ? 'arrow' : canAct ? 'check' : 'pin'} size={22} />
              <span>{state.dialogue ? 'Lanjut cerita' : canAct ? state.prompt!.label : currentMission(state).button}</span>
            </button>
          </div>
          <div className="console-status"><span className="game-status-dot"/>{state.cutscene>=0?'Cerita sedang berlangsung':state.walking?'Wira sedang menuju tujuan':state.scene==='house'?'Jelajahi rumah dengan santai.':'Satu langkah lagi untuk hutan kita.'}<span className="save-status"><Icon name="save" size={12}/>{state.saved?'Progres tersimpan':'Simpan otomatis aktif'}</span></div>
        </section>
        <Sidebar state={state} engine={engine}/>
      </div>
      <footer className="site-footer"><span><Icon name="leaf" size={15}/>Hutan yang kita jaga, masa depan yang kita punya.</span><span className="language"><i/>Bahasa Indonesia</span></footer>
    </main>

    {state.panel&&createPortal(<Modal title={panelTitle} eyebrow={state.panel==='shop'?'PERLENGKAPAN WARGA':state.panel==='victory'?'MISI SELESAI 100%':'KARHUTLA / PETUALANGAN WIRA'} onClose={closePanel} wide={state.panel==='shop'||state.panel==='map'}>
      {state.panel==='shop'&&<WarungBudiModal player={state.player} nearby={engine.nearShop()} inHouse={state.scene==='house'} onBuyItem={engine.buy} onTravel={()=>engine.go(state.scene==='house'?'exit':'shop')}/>}
      {state.panel==='map'&&<VillageMap engine={engine} state={state}/>}
      {state.panel==='help'&&<Help/>}
      {state.panel==='pause'&&<PauseSettings engine={engine} state={state}/>}
      {state.panel==='victory'&&<div className="victory-content"><div className="victory-art"><Icon name="leaf" size={46}/></div><p>Sepuluh titik api padam. Kabut mulai menghilang.<br/>Terima kasih sudah menjaga Kalimantan, Wira.</p><div className="victory-summary"><span>Pemadaman<strong>100%</strong></span><span>Uang Wira<strong>{formatRupiah(state.player.rupiah)}</strong></span></div><button className="button button-primary" onClick={closePanel}>Jelajahi desa kembali<Icon name="arrow" size={17}/></button><button className="text-button" onClick={engine.reset}>Mulai petualangan baru</button></div>}
    </Modal>,consoleRef.current??document.body)}
    {resetConfirmOpen&&!state.panel&&createPortal(<Modal title="Mulai ulang permainan?" eyebrow="KONFIRMASI RESET" onClose={()=>setResetConfirmOpen(false)}>
      <div className="reset-modal-body">
        <p className="modal-description">Semua progres saat ini akan dihapus, api hutan kembali menyala, dan Wira akan mulai kembali dari dalam rumah.</p>
        <div className="reset-modal-actions">
          <button className="button button-secondary" onClick={()=>setResetConfirmOpen(false)}>Batal</button>
          <button className="button button-danger" onClick={()=>{setResetConfirmOpen(false);setEmoteWheelOpen(false);engine.reset();}}><Icon name="reset" size={15}/>Ya, reset permainan</button>
        </div>
      </div>
    </Modal>,consoleRef.current??document.body)}
  </div>;
}