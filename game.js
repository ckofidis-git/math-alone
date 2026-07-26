/* ============================================================
   MATH ALONE — game engine
   No build step, no dependencies. Plain script so it also runs
   straight off the file system.
   ============================================================ */
window.onerror = function(msg, src, line){
  var b = document.getElementById('jserr');
  if(b){ b.style.display='block'; b.textContent = 'The game hit an error:\n'+msg+'\n(line '+line+')'; }
};

(function(){
"use strict";

var $ = function(id){ return document.getElementById(id); };
var rnd = function(n){ return Math.floor(Math.random()*n); };
var pick = function(a){ return a[rnd(a.length)]; };
var esc = function(s){ return String(s).replace(/[&<>"]/g, function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
var SVGNS = 'http://www.w3.org/2000/svg';

/* ============================================================
   SAVE DATA
   ============================================================ */
var KEY = 'mathAlone.v2';
var save = {
  coins:0, traps:['paint','ice','feather'], badges:[], night:1,
  totalCorrect:0, bestNight:0, days:0, lastDay:'', names:['',''],
  sound:true, skill:{}
};
function load(){
  try{
    var raw = localStorage.getItem(KEY);
    if(raw){ var o = JSON.parse(raw); for(var k in o){ if(k in save) save[k]=o[k]; } }
  }catch(e){}
}
function store(){ try{ localStorage.setItem(KEY, JSON.stringify(save)); }catch(e){} }

/* ============================================================
   AUDIO — everything synthesised, no files to load
   ============================================================ */
var AU = (function(){
  var ctx=null, master=null, musicGain=null, noiseBuf=null, musicTimer=null, step=0;
  function ready(){
    if(ctx) return true;
    try{
      ctx = new (window.AudioContext||window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.0; musicGain.connect(master);
      var len = ctx.sampleRate*0.6; noiseBuf = ctx.createBuffer(1,len,ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for(var i=0;i<len;i++){ d[i] = (Math.random()*2-1) * (1-i/len); }
      return true;
    }catch(e){ return false; }
  }
  function unlock(){ if(ready() && ctx.state==='suspended') ctx.resume(); }
  function tone(o){
    if(!save.sound || !ready()) return;
    var t = ctx.currentTime + (o.at||0);
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type||'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if(o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t+o.dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol||0.14, t+0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t+o.dur);
    var node = osc;
    if(o.filter){
      var f = ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=o.filter;
      osc.connect(f); node = f;
    }
    node.connect(g).connect(o.music ? musicGain : master);
    osc.start(t); osc.stop(t+o.dur+0.06);
  }
  function noise(o){
    if(!save.sound || !ready()) return;
    var t = ctx.currentTime + (o.at||0);
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = o.type||'bandpass';
    f.frequency.setValueAtTime(o.f||900, t);
    if(o.to) f.frequency.exponentialRampToValueAtTime(o.to, t+(o.dur||0.3));
    f.Q.value = o.q||1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(o.vol||0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t+(o.dur||0.3));
    s.connect(f).connect(g).connect(master);
    s.start(t); s.stop(t+(o.dur||0.3)+0.05);
  }
  /* a slow, gentle winter loop — bell arpeggios over a soft bass */
  var CHORDS = [[262,330,392,523],[247,294,392,494],[220,277,349,440],[196,294,392,494]];
  function music(on){
    if(!ready()) return;
    if(!on){
      if(musicTimer){ clearInterval(musicTimer); musicTimer=null; }
      musicGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
      return;
    }
    if(musicTimer) return;
    musicGain.gain.setTargetAtTime(0.055, ctx.currentTime, 1.2);
    step = 0;
    var beat = function(){
      if(!save.sound) return;
      var ch = CHORDS[Math.floor(step/8) % CHORDS.length];
      var n = ch[step % 4];
      tone({f:n*2, dur:0.5, type:'triangle', vol:0.1, music:true});
      if(step % 8 === 0) tone({f:ch[0]/2, dur:1.4, type:'sine', vol:0.16, music:true});
      if(step % 4 === 2) tone({f:ch[3]*2, dur:0.35, type:'sine', vol:0.06, music:true, at:0.24});
      step++;
    };
    beat();
    musicTimer = setInterval(beat, 520);
  }
  return {
    unlock:unlock, music:music,
    correct:function(combo){
      var base = 523.25 * Math.pow(1.0595, Math.min(combo,8)*2);
      tone({f:base, dur:0.14, type:'triangle', vol:0.16});
      tone({f:base*1.26, dur:0.16, type:'triangle', vol:0.15, at:0.09});
      tone({f:base*1.5, dur:0.28, type:'triangle', vol:0.14, at:0.18});
    },
    wrong:function(){
      tone({f:300, to:110, dur:0.4, type:'sine', vol:0.16});
      noise({f:400, to:120, dur:0.3, vol:0.1});
    },
    coin:function(){
      tone({f:988, dur:0.09, type:'square', vol:0.09});
      tone({f:1319, dur:0.22, type:'square', vol:0.08, at:0.07});
    },
    trap:function(kind){
      switch(kind){
        case 'clang': tone({f:1400, to:600, dur:0.5, type:'square', vol:0.1});
                      noise({f:2600, to:700, dur:0.45, vol:0.16, q:0.6}); break;
        case 'slip':  tone({f:400, to:1700, dur:0.45, type:'sine', vol:0.13}); break;
        case 'puff':  noise({f:1800, to:500, dur:0.5, vol:0.2, type:'lowpass'}); break;
        case 'boing': tone({f:180, to:900, dur:0.18, type:'sine', vol:0.15});
                      tone({f:900, to:200, dur:0.24, type:'sine', vol:0.13, at:0.16}); break;
        case 'splat': noise({f:300, dur:0.35, vol:0.24, type:'lowpass'});
                      tone({f:120, to:60, dur:0.3, type:'sine', vol:0.14}); break;
        default:      noise({f:1200, to:400, dur:0.35, vol:0.15});
      }
    },
    fanfare:function(){
      [523,659,784,1046,1319].forEach(function(f,i){
        tone({f:f, dur:0.3, type:'triangle', vol:0.15, at:i*0.11});
      });
    },
    lose:function(){
      [440,392,349,262].forEach(function(f,i){ tone({f:f, dur:0.42, type:'sawtooth', vol:0.12, at:i*0.2}); });
    },
    boss:function(){
      tone({f:70, dur:1.6, type:'sawtooth', vol:0.2});
      tone({f:104, dur:1.6, type:'sawtooth', vol:0.12, at:0.1});
    },
    tick:function(){ tone({f:620, dur:0.04, type:'square', vol:0.05}); }
  };
})();

/* ============================================================
   TRAPS — collectibles bought with coins
   ============================================================ */
var TRAPS = [
  {id:'paint',   name:'Paint Can Swing', icon:'🎨', cost:0,   sfx:'clang', line:'Paint can on a rope — BONK!'},
  {id:'ice',     name:'Icy Steps',       icon:'🧊', cost:0,   sfx:'slip',  line:'Icy front steps — WHOOOPS!'},
  {id:'feather', name:'Feather Blizzard',icon:'🪶', cost:0,   sfx:'puff',  line:'Feather blizzard — ACHOO!'},
  {id:'cars',    name:'Toy Car Carpet',  icon:'🚗', cost:30,  sfx:'boing', line:'Toy cars everywhere — SLIP!'},
  {id:'spider',  name:'Rubber Spider',   icon:'🕷️', cost:45,  sfx:'boing', line:'Spider on a thread — AAAH!'},
  {id:'bells',   name:'Alarm Bells',     icon:'🔔', cost:60,  sfx:'clang', line:'Every bell in the house — CLANG!'},
  {id:'honey',   name:'Honey Floor',     icon:'🍯', cost:80,  sfx:'splat', line:'Sticky honey puddle — STUCK!'},
  {id:'balloon', name:'Balloon Avalanche',icon:'🎈',cost:105, sfx:'boing', line:'Balloons from the loft — POP POP!'},
  {id:'socks',   name:'Soapy Socks',     icon:'🧦', cost:135, sfx:'slip',  line:'Soapy socks on the stairs — WHEE!'},
  {id:'drums',   name:'Drum Kit Tumble', icon:'🥁', cost:170, sfx:'clang', line:'Down the drum kit — BOOM BOOM!'},
  {id:'bucket',  name:'Bucket Drop',     icon:'🪣', cost:210, sfx:'clang', line:'Bucket on the head — CLONK!'},
  {id:'sled',    name:'Runaway Sledge',  icon:'🛷', cost:260, sfx:'slip',  line:'Sledge down the path — ZOOOM!'}
];
function trapById(id){ for(var i=0;i<TRAPS.length;i++){ if(TRAPS[i].id===id) return TRAPS[i]; } return TRAPS[0]; }

var TAUNTS = ['Heh heh... nobody home!','Too easy, kid!','One step closer to that door...',
              'Get the crowbar, Lanky!','You call that a trap?'];
var CHEERS = ['NICE ONE!','BOOM!','GOT THEM!','SUPER!','TRAP TIME!','BULLSEYE!','BRILLIANT!'];

/* ============================================================
   BADGES
   ============================================================ */
var BADGES = [
  {id:'first',  icon:'🌟', name:'First Night',    desc:'Survive a whole night.'},
  {id:'combo5', icon:'🔥', name:'On Fire',        desc:'Get 5 correct in a row.'},
  {id:'combo10',icon:'⚡', name:'Unstoppable',    desc:'Get 10 correct in a row.'},
  {id:'perfect',icon:'💎', name:'Spotless',       desc:'Finish a night with no mistakes.'},
  {id:'boss',   icon:'👑', name:'Boss Beater',    desc:'Defeat the Big Bandit.'},
  {id:'tables', icon:'✖️', name:'Table Master',   desc:'40 correct times-table answers.'},
  {id:'share',  icon:'➗', name:'Fair Sharer',    desc:'30 correct division answers.'},
  {id:'bonds',  icon:'🔗', name:'Bond Builder',   desc:'20 correct number bonds.'},
  {id:'words',  icon:'📖', name:'Story Solver',   desc:'15 word problems solved.'},
  {id:'rich',   icon:'🪙', name:'Trap Tycoon',    desc:'Save up 200 coins.'},
  {id:'all',    icon:'🧰', name:'Full Workshop',  desc:'Build every trap.'},
  {id:'daily3', icon:'📅', name:'Three Nights',   desc:'Play on 3 different days.'}
];
var RANKS = [
  {at:0,   icon:'🔰', name:'Lookout'},
  {at:25,  icon:'🚪', name:'Doorkeeper'},
  {at:75,  icon:'🔧', name:'Trapsmith'},
  {at:150, icon:'🕯️', name:'Night Watch'},
  {at:275, icon:'🛡️', name:'Home Defender'},
  {at:450, icon:'👑', name:'Legend of the Street'}
];
function rankOf(n){
  var r = RANKS[0];
  for(var i=0;i<RANKS.length;i++){ if(n >= RANKS[i].at) r = RANKS[i]; }
  return r;
}
function nextRank(n){
  for(var i=0;i<RANKS.length;i++){ if(n < RANKS[i].at) return RANKS[i]; }
  return null;
}

/* ============================================================
   QUESTIONS — Year 3 shaped: tables 2,3,4,5,8,10; number bonds;
   missing numbers; fact families; comparing; word problems.
   ============================================================ */
var SKILLS = {
  add:    {label:'Adding',        icon:'➕'},
  sub:    {label:'Taking away',   icon:'➖'},
  mul:    {label:'Times tables',  icon:'✖️'},
  div:    {label:'Sharing',       icon:'➗'},
  missing:{label:'Missing number',icon:'❓'},
  bonds:  {label:'Number bonds',  icon:'🔗'},
  compare:{label:'Bigger/smaller',icon:'⚖️'},
  steps:  {label:'Counting steps',icon:'👣'},
  word:   {label:'Word problems', icon:'📖'}
};
var TABLES = [2,3,4,5,8,10];

function makeAdd(d){
  var a,b;
  if(d===1){ a=2+rnd(18); b=2+rnd(18); }
  else if(d===2){ a=11+rnd(78); b=11+rnd(78); }
  else { a=110+rnd(380); b=60+rnd(300); }
  return {prompt:a+' + '+b+' = ?', answer:a+b, skill:'add', teach:{kind:'line', a:a, b:b, op:'+'}};
}
function makeSub(d){
  var a,b;
  if(d===1){ a=6+rnd(14); b=1+rnd(a-1); }
  else if(d===2){ a=25+rnd(70); b=6+rnd(a-6); }
  else { a=130+rnd(360); b=40+rnd(a-40); }
  return {prompt:a+' − '+b+' = ?', answer:a-b, skill:'sub', teach:{kind:'line', a:a, b:b, op:'−'}};
}
function makeMul(d){
  var t = d===1 ? pick([2,5,10]) : pick(TABLES);
  var b = d===3 ? 2+rnd(11) : 2+rnd(9);
  return {prompt:t+' × '+b+' = ?', answer:t*b, skill:'mul', teach:{kind:'array', a:t, b:b}};
}
function makeDiv(d){
  var t = d===1 ? pick([2,5,10]) : pick(TABLES);
  var q = 2+rnd(d===3 ? 11 : 9);
  return {prompt:(t*q)+' ÷ '+t+' = ?', answer:q, skill:'div', teach:{kind:'groups', total:t*q, per:t}};
}
function makeMissing(d){
  var style = rnd(2);
  if(style===0){
    var t = pick(TABLES), q = 2+rnd(9);
    return {prompt:t+' × ? = '+(t*q), answer:q, skill:'missing', teach:{kind:'array', a:t, b:q}};
  }
  var a = (d===1?12:40) + rnd(d===1?12:50), b = 3+rnd(a-3);
  return {prompt:a+' − ? = '+(a-b), answer:b, skill:'missing', teach:{kind:'line', a:a, b:b, op:'−'}};
}
function makeBonds(d){
  var target = d===1 ? 20 : 100;
  var a = d===1 ? 1+rnd(19) : (1+rnd(19))*5;
  if(a>=target) a = target-5;
  return {prompt:a+' + ? = '+target, answer:target-a, skill:'bonds', teach:{kind:'bond', target:target, a:a}};
}
function makeCompare(d){
  var l = makeMul(d===3?2:1), r = makeMul(d===3?2:1);
  var lv = l.answer, rv = r.answer;
  var lt = l.prompt.replace(' = ?',''), rt = r.prompt.replace(' = ?','');
  var ans = lv>rv ? '>' : (lv<rv ? '<' : '=');
  return {prompt:lt+'   ?   '+rt, answer:ans, skill:'compare', input:'choice',
          choices:['<','=','>'], teach:{kind:'compare', l:lt, r:rt, lv:lv, rv:rv}};
}
function makeSteps(d){
  var step = pick(d===1?[2,5,10]:[3,4,8,50]);
  var start = step*(1+rnd(4));
  var seq = [start, start+step, start+step*2, start+step*3];
  var hide = 2+rnd(2);
  var shown = seq.map(function(v,i){ return i===hide ? '?' : v; }).join(', ');
  return {prompt:shown, answer:seq[hide], skill:'steps', teach:{kind:'steps', seq:seq, step:step, hide:hide}};
}
var WORDS = [
  function(d){ var a=2+rnd(4), b=2+rnd(8);
    return {prompt:'You set '+a+' toy cars on each of '+b+' steps. How many cars altogether?',
            answer:a*b, teach:{kind:'array', a:a, b:b}}; },
  function(d){ var t=pick([2,4,5]), q=2+rnd(8);
    return {prompt:'You share '+(t*q)+' marbles into '+t+' equal piles. How many in each pile?',
            answer:q, teach:{kind:'groups', total:t*q, per:t}}; },
  function(d){ var a=25+rnd(60), b=5+rnd(Math.min(20, a-6));   // never creep further than they are
    return {prompt:'The bandits are '+a+' steps away. They creep '+b+' steps closer. How far away now?',
            answer:a-b, teach:{kind:'line', a:a, b:b, op:'−'}}; },
  function(d){ var a=10+rnd(40), b=10+rnd(40);
    return {prompt:'You set '+a+' traps upstairs and '+b+' downstairs. How many traps in total?',
            answer:a+b, teach:{kind:'line', a:a, b:b, op:'+'}}; },
  function(d){ var p=4+rnd(6), n=2+rnd(4);
    return {prompt:'Each trap needs '+p+' feathers. You build '+n+' traps. How many feathers?',
            answer:p*n, teach:{kind:'array', a:p, b:n}}; },
  function(d){ var a=(2+rnd(8))*5;
    return {prompt:'You have 100 feathers and use '+a+'. How many feathers are left?',
            answer:100-a, teach:{kind:'bond', target:100, a:a}}; }
];
function makeWord(d){
  var q = pick(WORDS)(d);
  q.skill = 'word'; q.wordy = true;
  return q;
}
var MAKERS = {add:makeAdd, sub:makeSub, mul:makeMul, div:makeDiv, missing:makeMissing,
               bonds:makeBonds, compare:makeCompare, steps:makeSteps, word:makeWord};

/* Nights follow the Year 3 progression */
var NIGHTS = [
  {n:1, name:'Quiet Street',  skills:['add','sub','bonds'],              hint:'Adding & taking away to 20'},
  {n:2, name:'Back Alley',    skills:['add','sub','missing','bonds'],    hint:'Bigger numbers, missing numbers'},
  {n:3, name:'Rooftops',      skills:['mul','steps','add'],              hint:'2, 5 and 10 times tables'},
  {n:4, name:'The Cellar',    skills:['mul','div','steps'],              hint:'3s, 4s and sharing'},
  {n:5, name:'Frozen Porch',  skills:['mul','div','compare','missing'],  hint:'8 times table & comparing'},
  {n:6, name:'THE BIG BANDIT',skills:['mul','div','word','bonds','missing'], hint:'Everything — boss night', boss:true}
];

/* adaptive: prefer the skills this player gets wrong most */
function chooseSkill(pool){
  var weights = pool.map(function(k){
    var s = save.skill[k];
    if(!s || s.seen < 3) return 2.2;            // unseen skills get a look-in
    var acc = s.right / s.seen;
    return 0.5 + (1-acc)*3.5;                    // weaker skill => bigger weight
  });
  var total = weights.reduce(function(a,b){ return a+b; }, 0);
  var r = Math.random()*total;
  for(var i=0;i<pool.length;i++){ r -= weights[i]; if(r<=0) return pool[i]; }
  return pool[pool.length-1];
}
function noteSkill(k, right){
  var s = save.skill[k] || (save.skill[k] = {seen:0, right:0});
  s.seen++; if(right) s.right++;
}

/* ============================================================
   STATE
   ============================================================ */
var S = {
  mode:'story', night:1, diff:2, timer:true,
  players:[], turn:0, qIndex:0, qTotal:10,
  threat:0, maxThreat:5, bossHp:0,
  current:null, answer:'', locked:false,
  timeLeft:0, timeMax:26, tick:null,
  coinsEarned:0, correct:0, wrong:0, bestCombo:0,
  practiceSkill:'mul', tug:50
};

/* ============================================================
   SCENE
   ============================================================ */
function buildScene(){
  var stars = $('stars');
  if(stars.childNodes.length===0){
    for(var i=0;i<26;i++){
      var c = document.createElementNS(SVGNS,'circle');
      c.setAttribute('cx', 10+rnd(780)); c.setAttribute('cy', 6+rnd(96));
      c.setAttribute('r', Math.random()<0.25 ? 1.8 : 1.1);
      c.setAttribute('fill','#ffffff');
      c.setAttribute('class','twinkle');
      c.style.animationDelay = (Math.random()*3).toFixed(2)+'s';
      stars.appendChild(c);
    }
  }
  var fence = $('fence');
  if(fence.childNodes.length===0){
    var d = '';
    for(var x=10; x<580; x+=34){ d += 'M'+x+' 196 v-26 '; }
    d += 'M10 178 h560 M10 188 h560';
    var p = document.createElementNS(SVGNS,'path');
    p.setAttribute('d', d); p.setAttribute('stroke-linecap','round');
    fence.appendChild(p);
  }
  var lights = $('lights');
  if(lights.childNodes.length===0){
    var cols = ['#ff6b6b','#ffcf5c','#7fc4ff','#3fbf74','#ff9ecb'];
    for(var j=0;j<12;j++){
      var t = j/11;
      var lx = 604 + t*166;
      var ly = 128 - Math.sin(Math.PI*t)*50 + Math.abs(t-0.5)*8;
      var b = document.createElementNS(SVGNS,'circle');
      b.setAttribute('cx', lx.toFixed(1)); b.setAttribute('cy', ly.toFixed(1));
      b.setAttribute('r','3.4'); b.setAttribute('fill', cols[j%cols.length]);
      b.setAttribute('class','blink');
      b.style.animationDelay = (j*0.18).toFixed(2)+'s';
      lights.appendChild(b);
    }
  }
}
/* bandits walk from x=60 (far) to x=560 (the door) */
/* the outer <g> carries the position (CSS transform, so it animates),
   the inner .walker carries the tumble — mixing the two on one node
   would make the CSS transform clobber the SVG transform attribute */
function placeBandits(){
  var t = S.threat / S.maxThreat;
  var x = 60 + t*470;
  $('banditA').style.transform = 'translate('+x.toFixed(1)+'px,214px)';
  $('banditB').style.transform = 'translate('+(x-42).toFixed(1)+'px,216px) scale(.92)';
}
function tumbleBandits(){
  ['banditA','banditB'].forEach(function(id, i){
    var el = $(id).querySelector('.walker');
    el.classList.remove('tumble'); void el.getBoundingClientRect();
    setTimeout(function(){ el.classList.add('tumble'); }, i*110);
  });
}
function springTrapArt(trap){
  var layer = $('trapLayer');
  layer.innerHTML = '';
  var t = S.threat / S.maxThreat;
  var x = 60 + t*470;
  var g = document.createElementNS(SVGNS,'g');
  g.setAttribute('transform','translate('+x.toFixed(1)+',150)');
  g.setAttribute('class', trap.sfx==='clang' ? 'swing' : 'dropin');
  var txt = document.createElementNS(SVGNS,'text');
  txt.setAttribute('x','0'); txt.setAttribute('y','0');
  txt.setAttribute('font-size','44'); txt.setAttribute('text-anchor','middle');
  txt.textContent = trap.icon;
  if(trap.sfx==='clang'){
    var rope = document.createElementNS(SVGNS,'line');
    rope.setAttribute('x1','0'); rope.setAttribute('y1','-150');
    rope.setAttribute('x2','0'); rope.setAttribute('y2','-20');
    rope.setAttribute('stroke','#d8e4f7'); rope.setAttribute('stroke-width','2');
    g.appendChild(rope);
  }
  g.appendChild(txt);
  layer.appendChild(g);
  setTimeout(function(){ layer.innerHTML=''; }, 1200);
}
function floatText(text, colour){
  var layer = $('popLayer');
  var t = document.createElementNS(SVGNS,'text');
  var x = 60 + (S.threat/S.maxThreat)*470;
  t.setAttribute('x', x.toFixed(1)); t.setAttribute('y','150');
  t.setAttribute('font-size','26'); t.setAttribute('font-weight','bold');
  t.setAttribute('text-anchor','middle'); t.setAttribute('fill', colour);
  t.setAttribute('class','floatUp');
  t.textContent = text;
  layer.appendChild(t);
  setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 1200);
}

/* ============================================================
   TEACHING PICTURES — shown when an answer is wrong
   ============================================================ */
function drawTeach(q){
  var art = $('teachArt'), tip = '';
  art.innerHTML = '';
  var t = q.teach || {kind:'none'};
  function el(name, attrs, text){
    var e = document.createElementNS(SVGNS, name);
    for(var k in attrs) e.setAttribute(k, attrs[k]);
    if(text!=null) e.textContent = text;
    art.appendChild(e); return e;
  }
  if(t.kind==='array'){
    var cols = Math.min(t.b, 10), rows = t.a;
    var size = Math.min(18, 110/Math.max(rows,1), 260/Math.max(cols,1));
    var ox = 160 - (cols*size)/2, oy = 62 - (rows*size)/2;
    for(var r=0;r<rows;r++){
      for(var c=0;c<cols;c++){
        el('circle',{cx:ox+c*size+size/2, cy:oy+r*size+size/2, r:size*0.34, fill:'#3fbf74'});
      }
    }
    el('text',{x:160, y:120, 'text-anchor':'middle', 'font-size':15, fill:'#2b3550'},
       t.a+' rows of '+t.b+' = '+(t.a*t.b));
    tip = '<b>'+t.a+' × '+t.b+'</b> means '+t.a+' rows of '+t.b+'. Count them: <b>'+(t.a*t.b)+'</b>.';
  }
  else if(t.kind==='groups'){
    var groups = t.per, each = t.total/t.per;
    var gw = Math.min(60, 300/groups);
    for(var i=0;i<groups;i++){
      var gx = 160 - (groups*gw)/2 + i*gw;
      el('rect',{x:gx+3, y:26, width:gw-6, height:62, rx:8, fill:'none', stroke:'#7fc4ff', 'stroke-width':2});
      for(var k=0;k<each;k++){
        el('circle',{cx:gx+gw/2 + ((k%3)-1)*13, cy:40+Math.floor(k/3)*15, r:5, fill:'#ffcf5c'});
      }
    }
    el('text',{x:160, y:110, 'text-anchor':'middle', 'font-size':15, fill:'#2b3550'},
       t.total+' shared into '+groups+' groups = '+each+' each');
    tip = 'Share <b>'+t.total+'</b> into <b>'+groups+'</b> equal groups — each group gets <b>'+each+'</b>.';
  }
  else if(t.kind==='line'){
    var end = t.op==='+' ? t.a+t.b : t.a;
    var lo = t.op==='+' ? t.a : t.a-t.b;
    el('line',{x1:20, y1:70, x2:300, y2:70, stroke:'#8ea3c4', 'stroke-width':3});
    el('circle',{cx:60, cy:70, r:7, fill:'#7fc4ff'});
    el('circle',{cx:260, cy:70, r:7, fill:'#3fbf74'});
    el('path',{d:'M60 66 Q160 4 260 66', fill:'none', stroke:'#ffcf5c', 'stroke-width':3});
    el('text',{x:60, y:94, 'text-anchor':'middle', 'font-size':15, fill:'#2b3550'}, t.op==='+'? t.a : lo);
    el('text',{x:260, y:94, 'text-anchor':'middle', 'font-size':15, fill:'#2b3550'}, t.op==='+'? end : t.a);
    el('text',{x:160, y:26, 'text-anchor':'middle', 'font-size':15, fill:'#b8862a'},
       (t.op==='+'?'+':'−')+' '+t.b);
    tip = t.op==='+'
      ? 'Start at <b>'+t.a+'</b> and hop <b>'+t.b+'</b> forward.'
      : 'Start at <b>'+t.a+'</b> and hop <b>'+t.b+'</b> back.';
  }
  else if(t.kind==='bond'){
    var w = 260, aw = Math.max(24, w*(t.a/t.target));
    el('rect',{x:30, y:40, width:w, height:34, rx:8, fill:'#e6edfa'});
    el('rect',{x:30, y:40, width:aw, height:34, rx:8, fill:'#7fc4ff'});
    el('text',{x:30+aw/2, y:63, 'text-anchor':'middle', 'font-size':15, fill:'#10233f'}, t.a);
    el('text',{x:30+aw+(w-aw)/2, y:63, 'text-anchor':'middle', 'font-size':15, fill:'#2b3550'}, t.target-t.a);
    el('text',{x:160, y:100, 'text-anchor':'middle', 'font-size':15, fill:'#2b3550'},
       t.a+' + '+(t.target-t.a)+' = '+t.target);
    tip = 'The whole bar is <b>'+t.target+'</b>. Take away <b>'+t.a+'</b> and <b>'+(t.target-t.a)+'</b> is left.';
  }
  else if(t.kind==='steps'){
    t.seq.forEach(function(v,i){
      var x = 40+i*75;
      el('circle',{cx:x, cy:60, r:20, fill: i===t.hide ? '#ffcf5c' : '#e6edfa'});
      el('text',{x:x, y:66, 'text-anchor':'middle', 'font-size':15, fill:'#10233f'}, v);
      if(i<3) el('text',{x:x+37, y:36, 'text-anchor':'middle', 'font-size':13, fill:'#b8862a'}, '+'+t.step);
    });
    tip = 'The numbers go up in <b>'+t.step+'</b>s each time.';
  }
  else if(t.kind==='compare'){
    el('text',{x:80, y:56, 'text-anchor':'middle', 'font-size':18, fill:'#2b3550'}, t.l);
    el('text',{x:80, y:86, 'text-anchor':'middle', 'font-size':22, fill:'#1a7a45', 'font-weight':'bold'}, t.lv);
    el('text',{x:240, y:56, 'text-anchor':'middle', 'font-size':18, fill:'#2b3550'}, t.r);
    el('text',{x:240, y:86, 'text-anchor':'middle', 'font-size':22, fill:'#1a7a45', 'font-weight':'bold'}, t.rv);
    el('text',{x:160, y:78, 'text-anchor':'middle', 'font-size':30, fill:'#b8862a'},
       t.lv>t.rv?'>':(t.lv<t.rv?'<':'='));
    tip = 'Work out both sides first: <b>'+t.lv+'</b> and <b>'+t.rv+'</b>. The open mouth always eats the bigger number.';
  }
  else {
    el('text',{x:160, y:70, 'text-anchor':'middle', 'font-size':22, fill:'#2b3550'}, 'The answer was '+q.answer);
  }
  $('teachQ').textContent = q.prompt.replace(' = ?','') + '  →  ' + q.answer;
  $('teachTip').innerHTML = tip;
}

/* ============================================================
   SCREENS
   ============================================================ */
function show(id){
  var list = document.querySelectorAll('.screen');
  for(var i=0;i<list.length;i++) list[i].classList.remove('on');
  $(id).classList.add('on');
  window.scrollTo(0,0);
}
function onTap(el, fn){
  var touched=false, x0=0, y0=0, moved=false;
  el.addEventListener('touchstart', function(e){
    var t=e.changedTouches[0]; x0=t.clientX; y0=t.clientY; moved=false;
  }, {passive:true});
  el.addEventListener('touchmove', function(e){
    var t=e.changedTouches[0];
    if(Math.abs(t.clientX-x0)>14 || Math.abs(t.clientY-y0)>14) moved=true;
  }, {passive:true});
  el.addEventListener('touchend', function(e){
    touched=true; if(moved) return; e.preventDefault(); AU.unlock(); fn();
  }, {passive:false});
  el.addEventListener('click', function(){
    if(touched){ touched=false; return; } AU.unlock(); fn();
  });
}
function group(box, multi){
  var chips = box.querySelectorAll('.chip, .night');
  for(var i=0;i<chips.length;i++){
    (function(c){
      onTap(c, function(){
        if(c.classList.contains('locked')) return;
        if(multi){
          c.classList.toggle('sel');
          if(!box.querySelector('.sel')) c.classList.add('sel');
        } else {
          var all = box.querySelectorAll('.chip, .night');
          for(var j=0;j<all.length;j++) all[j].classList.remove('sel');
          c.classList.add('sel');
        }
        AU.tick();
      });
    })(chips[i]);
  }
}

function paintHome(){
  var r = rankOf(save.totalCorrect), nx = nextRank(save.totalCorrect);
  $('rankIcon').textContent = r.icon;
  $('rankName').textContent = r.name;
  $('rankNext').textContent = nx ? (nx.at - save.totalCorrect)+' more correct → '+nx.name : 'Top rank reached!';
  $('coinCount').textContent = save.coins;
  $('trapOwned').textContent = save.traps.length;
  $('badgeOwned').textContent = save.badges.length;
  $('storyProg').textContent = 'Night '+Math.min(save.night,6);
  $('n1').value = save.names[0]||'';
  $('n2').value = save.names[1]||'';
  $('soundBtn').textContent = save.sound ? '🔊' : '🔇';
  $('soundBtn').classList.toggle('off', !save.sound);
  var today = new Date().toDateString();
  $('dailyLine').textContent = save.lastDay===today
    ? '🔥 Played today — '+save.days+' day'+(save.days===1?'':'s')+' altogether.'
    : 'Tonight is a new night. Ready?';
}

/* ---------- setup screen ---------- */
function openSetup(mode){
  S.mode = mode;
  $('nightPanel').style.display = mode==='story' ? '' : 'none';
  $('skillPanel').style.display = mode==='practice' ? '' : 'none';
  $('setupTitle').textContent = mode==='story' ? 'Six Nights' :
                                mode==='practice' ? 'Practice Range' : 'Twin Duel';
  if(mode==='story'){
    var box = $('nightList'); box.innerHTML='';
    NIGHTS.forEach(function(n){
      var unlocked = n.n <= save.night;
      var b = document.createElement('button');
      b.type='button';
      b.className = 'night' + (n.boss?' boss':'') + (unlocked?'':' locked') + (n.n===Math.min(save.night,6)?' sel':'');
      b.setAttribute('data-night', n.n);
      b.innerHTML = '<span>'+(unlocked ? (n.boss?'👺':'🌙') : '🔒')+'</span>'+n.name+'<i>'+n.hint+'</i>';
      box.appendChild(b);
    });
    group(box, false);
  }
  if(mode==='practice'){
    var sb = $('skillList'); sb.innerHTML='';
    Object.keys(SKILLS).forEach(function(k, i){
      var b = document.createElement('button');
      b.type='button'; b.className='chip'+(k===S.practiceSkill?' sel':'');
      b.setAttribute('data-skill', k);
      b.innerHTML = SKILLS[k].icon+' '+SKILLS[k].label;
      sb.appendChild(b);
    });
    group(sb, false);
  }
  show('s-setup');
}

/* ============================================================
   GAME LOOP
   ============================================================ */
function startGame(){
  var d = document.querySelector('#diffList .sel');
  S.diff = d ? +d.getAttribute('data-diff') : 2;
  var t = document.querySelector('#timerList .sel');
  S.timer = t ? t.getAttribute('data-timer')==='1' : true;
  S.timeMax = S.diff===1 ? 30 : (S.diff===2 ? 25 : 20);

  save.names[0] = $('n1').value.trim();
  save.names[1] = $('n2').value.trim();
  var n1 = save.names[0] || 'Player 1', n2 = save.names[1] || 'Player 2';

  S.players = [{name:n1, score:0, combo:0, right:0, wrong:0}];
  if(S.mode==='duel') S.players.push({name:n2, score:0, combo:0, right:0, wrong:0});

  if(S.mode==='story'){
    var sel = document.querySelector('#nightList .sel');
    S.night = sel ? +sel.getAttribute('data-night') : 1;
    S.qTotal = 10; S.maxThreat = 5;
    var cfg = NIGHTS[S.night-1];
    S.bossHp = cfg.boss ? 6 : 0;
  } else if(S.mode==='practice'){
    var ps = document.querySelector('#skillList .sel');
    S.practiceSkill = ps ? ps.getAttribute('data-skill') : 'mul';
    S.qTotal = 12; S.maxThreat = 99; S.bossHp = 0;
  } else {
    S.qTotal = 12; S.maxThreat = 99; S.bossHp = 0;
  }

  S.turn=0; S.qIndex=0; S.threat=0; S.locked=false;
  S.coinsEarned=0; S.correct=0; S.wrong=0; S.bestCombo=0; S.tug=50;

  buildScene();
  buildHud();
  show('s-game');
  AU.unlock();
  AU.music(true);
  if(S.bossHp) { AU.boss(); toast('👺 THE BIG BANDIT<small>He needs '+S.bossHp+' good traps to send him packing</small>','bad'); }
  nextQuestion();
}

function buildHud(){
  var h = '';
  S.players.forEach(function(p,i){
    h += '<div class="score" id="sc'+i+'"><div class="nm">'+esc(p.name)+'</div>'+
         '<div class="pts" id="pts'+i+'">0</div><div class="cmb" id="cmb'+i+'"></div></div>';
  });
  $('hud').innerHTML = h;
  var old = document.querySelector('.tug');
  if(old) old.parentNode.removeChild(old);
  if(S.mode==='duel'){
    var tug = document.createElement('div');
    tug.className='tug';
    tug.innerHTML = '<div id="tugFill"></div><span>'+esc(S.players[0].name)+'  ⟷  '+esc(S.players[1].name)+'</span>';
    $('hud').parentNode.insertBefore(tug, $('hud').nextSibling);
  }
}
function paintHud(){
  S.players.forEach(function(p,i){
    $('pts'+i).textContent = p.score;
    $('cmb'+i).textContent = p.combo>1 ? '🔥 '+p.combo+' in a row' : '';
    $('sc'+i).classList.toggle('active', i===S.turn);
  });
  $('turnLine').textContent = S.players.length>1
    ? S.players[S.turn].name.toUpperCase()+"'S TURN"
    : (S.mode==='practice' ? 'PRACTICE — TAKE YOUR TIME' : 'YOUR TURN');
  var label;
  if(S.mode==='story') label = 'Night '+S.night+' · '+NIGHTS[S.night-1].name+' · Q'+(S.qIndex+1)+'/'+S.qTotal;
  else if(S.mode==='practice') label = SKILLS[S.practiceSkill].label+' · Q'+(S.qIndex+1)+'/'+S.qTotal;
  else label = 'Duel · Q'+(S.qIndex+1)+'/'+S.qTotal;
  $('statusLine').textContent = label;
  $('heartRow').textContent = S.bossHp ? '👺 '+S.bossHp
    : (S.maxThreat<90 ? new Array(Math.max(0,S.maxThreat-S.threat)+1).join('❤️') : '🎯');
  if(S.mode==='duel') $('tugFill').style.width = S.tug+'%';
  placeBandits();
}

function nextQuestion(){
  S.answer=''; $('answer').innerHTML='&nbsp;';
  var skill;
  if(S.mode==='practice') skill = S.practiceSkill;
  else if(S.mode==='duel') skill = chooseSkill(Object.keys(SKILLS));
  else skill = chooseSkill(NIGHTS[S.night-1].skills);
  S.current = MAKERS[skill](S.diff);
  S.current.skill = S.current.skill || skill;

  var q = $('question');
  q.textContent = S.current.prompt;
  q.classList.toggle('wordy', !!S.current.wordy || S.current.prompt.length>26);

  /* choice questions swap the number pad for big buttons */
  var isChoice = S.current.input==='choice';
  $('pad').style.display = isChoice ? 'none' : '';
  var cp = $('choicePad');
  cp.classList.toggle('on', isChoice);
  if(isChoice){
    cp.innerHTML='';
    S.current.choices.forEach(function(c){
      var b=document.createElement('button');
      b.type='button'; b.textContent=c;
      onTap(b, function(){ if(!S.locked) judge(c); });
      cp.appendChild(b);
    });
  }

  paintHud();
  S.locked=false;
  clearInterval(S.tick);
  if(S.timer && S.mode!=='practice'){
    S.timeLeft = S.timeMax;
    $('tbar').style.width='100%';
    S.tick = setInterval(function(){
      S.timeLeft -= 0.25;
      $('tbar').style.width = Math.max(0,S.timeLeft/S.timeMax*100)+'%';
      if(S.timeLeft<=0){ clearInterval(S.tick); judge(null); }
    },250);
  } else {
    $('tbar').style.width='100%';
  }
}

function typeDigit(d){
  if(S.locked || S.answer.length>=5) return;
  S.answer += d; $('answer').textContent = S.answer; AU.tick();
}
function backspace(){
  if(S.locked) return;
  S.answer = S.answer.slice(0,-1);
  $('answer').innerHTML = S.answer || '&nbsp;';
  AU.tick();
}
function submit(){ if(!S.locked && S.answer!=='') judge(S.answer); }

function judge(given){
  S.locked = true;
  clearInterval(S.tick);
  var p = S.players[S.turn];
  var expect = S.current.answer;
  var right = given!==null && (typeof expect==='string'
      ? String(given)===expect
      : parseInt(given,10)===expect);

  noteSkill(S.current.skill, right);

  if(right){
    p.combo++; p.right++; S.correct++;
    if(p.combo > S.bestCombo) S.bestCombo = p.combo;
    save.totalCorrect++;
    var timeBonus = (S.timer && S.mode!=='practice') ? Math.max(0,Math.round(S.timeLeft)) : 5;
    var pts = 10 + timeBonus + (p.combo-1)*3;
    var coins = 2 + Math.floor(p.combo/3);
    p.score += pts; S.coinsEarned += coins; save.coins += coins;
    store();                    // keep coins even if they wander off mid-night

    var trap = trapById(pick(save.traps));
    springTrapArt(trap);
    tumbleBandits();
    AU.correct(p.combo);
    AU.trap(trap.sfx);
    floatText('+'+pts, '#3fbf74');
    if(S.bossHp){ S.bossHp--; }
    else if(S.threat>0) S.threat--;
    if(S.mode==='duel') S.tug = Math.max(4, Math.min(96, S.tug + (S.turn===0 ? 7 : -7)));
    toast(pick(CHEERS)+'<small>'+trap.icon+' '+trap.line+'  +'+pts+' · 🪙'+coins+'</small>','good');
  } else {
    p.combo = 0; p.wrong++; S.wrong++;
    if(S.mode!=='practice') S.threat++;
    if(S.bossHp) S.bossHp = Math.min(S.bossHp+1, 9);
    if(S.mode==='duel') S.tug = Math.max(4, Math.min(96, S.tug + (S.turn===0 ? -7 : 7)));
    AU.wrong();
    $('alarm').classList.remove('go'); void $('alarm').offsetWidth; $('alarm').classList.add('go');
    floatText(given===null?'⏰':'✗', '#ff8a8d');
  }
  paintHud();

  if(!right){
    drawTeach(S.current);
    setTimeout(function(){ $('teach').classList.add('on'); }, 420);
    return;                       // the overlay's button continues the game
  }
  setTimeout(afterQuestion, 1150);
}

function afterQuestion(){
  if(S.mode==='story' && S.threat >= S.maxThreat){ endGame(false); return; }
  S.qIndex++;
  if(S.players.length>1) S.turn = (S.turn+1) % S.players.length;
  if(S.qIndex >= S.qTotal){
    if(S.mode==='story' && S.bossHp>0){ S.qTotal += 4; toast('👺 He is still coming!<small>Keep trapping</small>','bad'); }
    else { endGame(true); return; }
  }
  nextQuestion();
}

/* ============================================================
   RESULTS + REWARDS
   ============================================================ */
function grantBadge(id, list){
  if(save.badges.indexOf(id)>=0) return;
  save.badges.push(id);
  var b = null;
  for(var i=0;i<BADGES.length;i++){ if(BADGES[i].id===id) b = BADGES[i]; }
  if(b) list.push(b);
}
function skillTotal(keys){
  var n=0;
  keys.forEach(function(k){ if(save.skill[k]) n += save.skill[k].right; });
  return n;
}
function endGame(won){
  clearInterval(S.tick);
  AU.music(false);
  var newBadges = [];
  if(won && S.mode==='story'){
    grantBadge('first', newBadges);
    if(S.wrong===0) grantBadge('perfect', newBadges);
    if(NIGHTS[S.night-1].boss) grantBadge('boss', newBadges);
    if(S.night >= save.night && save.night < 6){ save.night = S.night+1; }
    if(S.night > save.bestNight) save.bestNight = S.night;
  }
  if(S.bestCombo>=5) grantBadge('combo5', newBadges);
  if(S.bestCombo>=10) grantBadge('combo10', newBadges);
  if(skillTotal(['mul'])>=40) grantBadge('tables', newBadges);
  if(skillTotal(['div'])>=30) grantBadge('share', newBadges);
  if(skillTotal(['bonds'])>=20) grantBadge('bonds', newBadges);
  if(skillTotal(['word'])>=15) grantBadge('words', newBadges);
  if(save.coins>=200) grantBadge('rich', newBadges);
  if(save.traps.length>=TRAPS.length) grantBadge('all', newBadges);

  var today = new Date().toDateString();
  if(save.lastDay !== today){ save.lastDay = today; save.days++; }
  if(save.days>=3) grantBadge('daily3', newBadges);
  store();

  var asked = S.correct + S.wrong;
  var pct = asked ? Math.round(S.correct/asked*100) : 0;
  var stars = pct>=95?5 : pct>=85?4 : pct>=70?3 : pct>=50?2 : 1;

  $('endTitle').textContent = won
    ? (S.mode==='story' ? 'House saved!' : (S.mode==='duel' ? 'Duel over!' : 'Good practice!'))
    : 'They got in!';
  $('endTitle').style.color = won ? 'var(--gold)' : '#ff8a8d';

  var html = '<div style="font-size:52px">'+(won?'🏠✨':'🦹💨')+'</div>';
  html += '<div class="line">'+(won
      ? 'The Slush Bandits ran off into the snow.'
      : 'They slipped past this time — set your traps quicker!')+'</div>';
  S.players.forEach(function(p){
    var a = p.right+p.wrong, pc = a?Math.round(p.right/a*100):0;
    html += '<div class="line"><b>'+esc(p.name)+'</b><br>'+p.score+' points · '+p.right+'/'+a+' correct ('+pc+'%)</div>';
  });
  if(S.mode==='duel' && S.players.length>1){
    var a=S.players[0], b=S.players[1];
    html += '<div class="line">'+(a.score===b.score ? '🤝 A perfect tie!'
      : '👑 Winner: <b>'+esc(a.score>b.score?a.name:b.name)+'</b>')+'</div>';
  } else {
    html += '<div class="stars">'+new Array(stars+1).join('⭐')+new Array(6-stars).join('☆')+'</div>';
  }
  $('endBody').innerHTML = html;

  var rw = '<div class="reward">🪙 '+S.coinsEarned+' coins earned</div>';
  if(S.bestCombo>1) rw += '<div class="reward">🔥 best run: '+S.bestCombo+'</div>';
  newBadges.forEach(function(b){ rw += '<div class="reward">'+b.icon+' '+b.name+'!</div>'; });
  if(won && S.mode==='story' && S.night<6) rw += '<div class="reward">🔓 Night '+(S.night+1)+' unlocked</div>';
  $('rewardBox').innerHTML = rw;

  won ? AU.fanfare() : AU.lose();
  show('s-end');
}

/* ============================================================
   SHOP + STICKERS
   ============================================================ */
function paintShop(){
  var g = $('shopGrid'); g.innerHTML='';
  TRAPS.forEach(function(t){
    var owned = save.traps.indexOf(t.id)>=0;
    var afford = save.coins >= t.cost;
    var d = document.createElement('div');
    d.className = 'item'+(owned?' owned':(afford?'':' locked'));
    d.innerHTML = '<span class="art">'+t.icon+'</span><b>'+t.name+'</b>'+
      '<span style="color:var(--frost-dim)">'+t.line+'</span>'+
      (owned ? '<span class="cost">✓ built</span>'
             : '<button type="button" class="cost'+(afford?'':' no')+'" data-buy="'+t.id+'">🪙 '+t.cost+'</button>');
    g.appendChild(d);
  });
  var buys = g.querySelectorAll('[data-buy]');
  for(var i=0;i<buys.length;i++){
    (function(btn){
      onTap(btn, function(){
        var t = trapById(btn.getAttribute('data-buy'));
        if(save.coins < t.cost){ toast('Not enough coins yet<small>Answer more questions to earn them</small>','bad'); AU.wrong(); return; }
        save.coins -= t.cost; save.traps.push(t.id); store();
        AU.fanfare();
        toast(t.icon+' '+t.name+' built!<small>It will join your traps tonight</small>','coin');
        paintShop(); paintHome();
      });
    })(buys[i]);
  }
}
function paintStickers(){
  var g = $('badgeGrid'); g.innerHTML='';
  BADGES.forEach(function(b){
    var owned = save.badges.indexOf(b.id)>=0;
    var d = document.createElement('div');
    d.className = 'item badge'+(owned?' owned':'');
    d.innerHTML = '<span class="art">'+b.icon+'</span><b>'+b.name+'</b>'+
                  '<span style="color:var(--frost-dim)">'+(owned?b.desc:'Locked — '+b.desc)+'</span>';
    g.appendChild(d);
  });
  var s = '<h4>How the practice is going</h4>';
  var any = false;
  Object.keys(SKILLS).forEach(function(k){
    var d = save.skill[k];
    if(!d || !d.seen) return;
    any = true;
    var pc = Math.round(d.right/d.seen*100);
    s += '<div class="bar"><span>'+SKILLS[k].icon+' '+SKILLS[k].label+'</span>'+
         '<span class="track"><span class="fill" style="width:'+pc+'%"></span></span>'+
         '<span class="pct">'+pc+'%</span></div>';
  });
  if(!any) s += '<p style="color:var(--frost-dim)">Play a night and your skills will show up here.</p>';
  else s += '<p style="color:var(--frost-dim);font-size:12px">The game asks more questions on the skills with the lowest bars.</p>';
  $('statBox').innerHTML = s;
}

/* ============================================================
   TOAST
   ============================================================ */
var toastTimer=null;
function toast(html, kind){
  var t = $('toast');
  t.innerHTML = html;
  t.className = 'toast '+kind;
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 1600);
}

/* ============================================================
   SNOW
   ============================================================ */
(function snow(){
  var box = $('snow'), g = ['❄','❅','•','❆'];
  for(var i=0;i<42;i++){
    var f = document.createElement('div');
    f.className='flake'; f.textContent = g[i%g.length];
    f.style.left = Math.random()*100+'vw';
    f.style.fontSize = (7+Math.random()*15)+'px';
    f.style.animationDuration = (7+Math.random()*11)+'s';
    f.style.animationDelay = (-Math.random()*14)+'s';
    f.style.opacity = (0.25+Math.random()*0.55);
    box.appendChild(f);
  }
})();

/* ============================================================
   WIRING
   ============================================================ */
load();
buildScene();
paintHome();

var modeBtns = document.querySelectorAll('[data-mode]');
for(var i=0;i<modeBtns.length;i++){
  (function(b){
    onTap(b, function(){
      var m = b.getAttribute('data-mode');
      AU.unlock();
      if(m==='shop'){ paintShop(); show('s-shop'); }
      else if(m==='stickers'){ paintStickers(); show('s-stickers'); }
      else openSetup(m);
    });
  })(modeBtns[i]);
}
group($('diffList'), false);
group($('timerList'), false);
onTap($('goBtn'), startGame);
onTap($('againBtn'), function(){
  if(S.mode==='story'){ openSetup('story'); } else { startGame(); }
});
onTap($('coinPill'), function(){ paintShop(); show('s-shop'); });
onTap($('soundBtn'), function(){
  save.sound = !save.sound; store();
  $('soundBtn').textContent = save.sound ? '🔊' : '🔇';
  $('soundBtn').classList.toggle('off', !save.sound);
  if(!save.sound) AU.music(false);
  else { AU.unlock(); AU.coin(); }
});
onTap($('teachBtn'), function(){
  $('teach').classList.remove('on');
  afterQuestion();
});
var backs = document.querySelectorAll('[data-back]');
for(var k=0;k<backs.length;k++){
  (function(b){
    onTap(b, function(){
      clearInterval(S.tick); AU.music(false);
      save.names[0] = $('n1').value.trim(); save.names[1] = $('n2').value.trim();
      store(); paintHome(); show('s-home');
    });
  })(backs[k]);
}
var keys = $('pad').querySelectorAll('.key');
for(var j=0;j<keys.length;j++){
  (function(kk){
    var act = kk.getAttribute('data-act');
    onTap(kk, function(){
      if(act==='del') backspace();
      else if(act==='ok') submit();
      else typeDigit(kk.textContent.trim());
    });
  })(keys[j]);
}
document.addEventListener('keydown', function(e){
  if(!$('s-game').classList.contains('on')) return;
  if($('teach').classList.contains('on')){
    if(e.key==='Enter'){ $('teach').classList.remove('on'); afterQuestion(); }
    return;
  }
  if(e.key>='0' && e.key<='9') typeDigit(e.key);
  else if(e.key==='Backspace'){ e.preventDefault(); backspace(); }
  else if(e.key==='Enter') submit();
  else if(S.current && S.current.input==='choice' && '<=>'.indexOf(e.key)>=0) judge(e.key);
});
['n1','n2'].forEach(function(id){
  $(id).addEventListener('change', function(){
    save.names[0]=$('n1').value.trim(); save.names[1]=$('n2').value.trim(); store();
  });
});

/* test seam: ?selftest exposes the question generators so the maths
   can be checked in bulk without playing thousands of rounds by hand */
var selftest = false;
try{ selftest = location.search.indexOf('selftest')>=0 || localStorage.getItem('mathAlone.selftest')==='1'; }catch(e){}
if(selftest){
  window.__MA = {MAKERS:MAKERS, SKILLS:SKILLS, NIGHTS:NIGHTS, TRAPS:TRAPS, BADGES:BADGES, RANKS:RANKS};
}

})();
