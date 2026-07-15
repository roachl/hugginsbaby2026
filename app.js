const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const toast=(msg)=>{const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)};
const gameStarts={};
const gameInstructions={mini:{title:'The Midi',text:'Solve the interlocking Across and Down clues. Tap a crossing twice to switch direction, then use Check when every square is filled.'},wordle:{title:'Baby Word',text:'Guess the five-letter baby-themed word in six tries. Green is correct, gold belongs elsewhere, and gray is not in the word.'},connections:{title:'Connections',text:'Find four groups of four related words. Select four cards and submit your guess—you have four mistakes available.'},strands:{title:'Strands',text:'Find all six baby-themed words. Tap adjacent letters to connect them. The blue word is the spangram and stretches across the theme.'}};
function showView(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));if(gameInstructions[id]&&!gameStarts[id]&&!completedGames?.[id])showGameIntro(id);if(id==='leaderboard')loadLeaderboard();scrollTo({top:0,behavior:'smooth'})}
function showGameIntro(game){const info=gameInstructions[game],dialog=$('#modal');dialog.classList.add('game-intro');$('#modalContent').innerHTML=`<p class="eyebrow">How to play</p><h2>${info.title}</h2><p>${info.text}</p><p class="timer-note">Your timer starts when you press the button.</p><button class="start-game-button" id="startGameButton">Start game</button>`;dialog.showModal();$('#startGameButton').onclick=()=>{gameStarts[game]=Date.now();updateTimers();dialog.classList.remove('game-intro');dialog.close()}}
const formatTime=seconds=>`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
function updateTimers(){$$('.game-timer').forEach(timer=>{const game=timer.dataset.timer,start=gameStarts[game],saved=completedGames?.[game];const seconds=saved?.elapsed??(start?Math.max(0,Math.floor((Date.now()-start)/1000)):0);$('strong',timer).textContent=formatTime(seconds);timer.classList.toggle('finished',!!saved)})}
setInterval(updateTimers,500);
$$('[data-game]').forEach(el=>{el.addEventListener('click',()=>showView(el.dataset.game));el.addEventListener('keydown',e=>{if(e.key==='Enter')showView(el.dataset.game)})});
$$('[data-go]').forEach(el=>el.addEventListener('click',()=>showView(el.dataset.go)));

// Shared leaderboard; local previews use localStorage, deployed sites use Netlify.
const isLocal=location.protocol==='file:'||['localhost','127.0.0.1'].includes(location.hostname);
const playerId=localStorage.getItem('babyPlayerId')||crypto.randomUUID();localStorage.setItem('babyPlayerId',playerId);
let playerName=localStorage.getItem('babyPlayerName')||'';
const completedGames=JSON.parse(localStorage.getItem('babyCompletedGames')||'{}');
const cleanName=name=>name.trim().replace(/[^a-z0-9 .,'-]/gi,'').slice(0,24);
function updatePlayerUI(){$('#currentPlayer').textContent=playerName||'Guest'}
function askForName(){const dialog=$('#nameModal');$('#playerName').value=playerName;dialog.showModal();setTimeout(()=>$('#playerName').focus(),50)}
$('#nameForm').addEventListener('submit',e=>{e.preventDefault();const name=cleanName($('#playerName').value);if(!name)return;const changed=playerName&&normalizePlayerName(playerName)!==normalizePlayerName(name);playerName=name;localStorage.setItem('babyPlayerName',name);if(changed)syncPlayerName(name);updatePlayerUI();$('#nameModal').close()});
$('#changeName').onclick=askForName;updatePlayerUI();if(!playerName)setTimeout(askForName,100);
const localScores=()=>JSON.parse(localStorage.getItem('babyLocalLeaderboard')||'[]');
function syncPlayerName(name){Object.values(completedGames).forEach(entry=>entry.name=name);localStorage.setItem('babyCompletedGames',JSON.stringify(completedGames));if(isLocal){const rows=localScores().map(entry=>entry.playerId===playerId?{...entry,name}:entry);localStorage.setItem('babyLocalLeaderboard',JSON.stringify(rows))}else Object.values(completedGames).forEach(entry=>fetch('/api/leaderboard',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...entry,name})}).catch(()=>{}))}
const normalizePlayerName=name=>cleanName(name).toLocaleLowerCase();
let activeLeaderFilter='all',leaderboardData=[];
function leaderboardRows(entries){const people={};entries.forEach(x=>{const key=normalizePlayerName(x.name);if(!key)return;if(!people[key])people[key]={key,name:cleanName(x.name),playerIds:new Set(),games:{},total:0};people[key].playerIds.add(x.playerId);const old=people[key].games[x.game];if(!old||x.score>old.score)people[key].games[x.game]=x});return Object.values(people).map(p=>{p.total=Object.values(p.games).reduce((sum,g)=>sum+g.score,0);return p})}
async function loadLeaderboard(){const list=$('#leaderboardList');list.innerHTML='<p class="empty-board">Loading scores…</p>';try{const entries=isLocal?localScores():await fetch('/api/leaderboard').then(r=>{if(!r.ok)throw Error();return r.json()});leaderboardData=leaderboardRows(entries);renderLeaderboard()}catch{list.innerHTML='<p class="empty-board">The leaderboard is taking a nap. Try refresh.</p>'}}
function renderLeaderboard(){const list=$('#leaderboardList'),game=activeLeaderFilter;let rows=leaderboardData.filter(p=>game==='all'||p.games[game]);rows.sort((a,b)=>game==='all'?(b.total-a.total||a.name.localeCompare(b.name)):(b.games[game].score-a.games[game].score||b.total-a.total||a.name.localeCompare(b.name)));rows=rows.slice(0,50);$$('[data-leader-filter]').forEach(b=>{const on=b.dataset.leaderFilter===game;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on)});if(!rows.length){list.innerHTML=`<p class="empty-board">No ${game==='all'?'':game+' '}scores yet. Be the first!</p>`;return}list.innerHTML=`<div class="leader-row header"><span>#</span><span>Player</span><span>Midi</span><span>Word</span><span>Connect</span><span>Strands</span><span>Total</span></div>`+rows.map((p,i)=>`<div class="leader-row ${p.key===normalizePlayerName(playerName)?'me':''}"><span class="leader-rank">${i+1}</span><span class="leader-name">${p.name}</span>${['mini','wordle','connections','strands'].map(g=>`<span class="leader-score ${game===g?'ranked-game':''}"><strong>${p.games[g]?.score??'—'}</strong></span>`).join('')}<span class="leader-score ${game==='all'?'ranked-game':''}"><strong>${p.total}</strong></span></div>`).join('')}
$$('[data-leader-filter]').forEach(button=>button.onclick=()=>{activeLeaderFilter=button.dataset.leaderFilter;renderLeaderboard()});
async function recordGame(game,extras={}){if(completedGames[game]||!playerName)return;const elapsed=Math.max(1,Math.round((Date.now()-(gameStarts[game]||Date.now()))/1000));let score=1000-Math.min(600,elapsed*2);if(game==='wordle')score=1200-(extras.guesses-1)*100-Math.min(300,elapsed);if(game==='connections')score=1200-extras.mistakes*150-Math.min(300,elapsed);if(game==='strands')score=1200-extras.hints*100-Math.min(300,elapsed);score=Math.max(100,Math.round(score));const entry={playerId,name:playerName,game,score,elapsed,detail:extras,completedAt:new Date().toISOString()};completedGames[game]=entry;localStorage.setItem('babyCompletedGames',JSON.stringify(completedGames));updateTimers();if(isLocal){const rows=localScores().filter(x=>!(x.playerId===playerId&&x.game===game));rows.push(entry);localStorage.setItem('babyLocalLeaderboard',JSON.stringify(rows))}else{try{await fetch('/api/leaderboard',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(entry)})}catch{toast('Score saved on this device')}}}
$('#refreshLeaderboard').onclick=loadLeaderboard;
function resetLocalGameProgress(){
  localStorage.removeItem('babyCompletedGames');
  Object.keys(completedGames).forEach(game=>delete completedGames[game]);
  Object.keys(gameStarts).forEach(game=>delete gameStarts[game]);
  updateTimers();
}
$('#clearLeaderboard').onclick=async()=>{
  const password=isLocal?'local-preview':prompt('Enter the host password to clear all scores:');
  if(!password)return;
  try{
    if(isLocal)localStorage.removeItem('babyLocalLeaderboard');
    else{
      const r=await fetch('/api/leaderboard',{method:'DELETE',headers:{'x-admin-password':password}});
      if(!r.ok){const data=await r.json().catch(()=>({}));throw Error(data.error||'That password did not work')}
    }
    resetLocalGameProgress();
    leaderboardData=[];
    renderLeaderboard();
    toast('Leaderboard cleared');
  }catch(error){toast(error.message||'That password did not work')}
};

// A true interlocking Midi with both Across and Down entries.
const midiEntries=[
  {id:'a1',number:1,direction:'across',row:0,col:0,answer:'BLANKET',clue:'Cozy stroller layer'},
  {id:'d1',number:1,direction:'down',row:0,col:0,answer:'BOOTIES',clue:'Tiny foot warmers'},
  {id:'d2',number:2,direction:'down',row:0,col:3,answer:'NAP',clue:'Short baby snooze'},
  {id:'d3',number:3,direction:'down',row:0,col:6,answer:'TEDDY',clue:'Soft bear for cuddles'},
  {id:'d4',number:4,direction:'down',row:0,col:8,answer:'CARRIER',clue:'Hands-free way to hold baby'},
  {id:'a5',number:5,direction:'across',row:2,col:3,answer:'POWDER',clue:'Classic changing-table item'},
  {id:'a6',number:6,direction:'across',row:3,col:0,answer:'TOY',clue:'Playmat entertainment'},
  {id:'a7',number:7,direction:'across',row:4,col:3,answer:'BABY',clue:'Guest of honor'},
  {id:'d8',number:8,direction:'down',row:5,col:2,answer:'BURP',clue:'Post-bottle pat goal'},
  {id:'a9',number:9,direction:'across',row:6,col:0,answer:'SNUGGLE',clue:'Cozy cuddle'},
  {id:'a10',number:10,direction:'across',row:8,col:0,answer:'WIPES',clue:'Diaper-bag cleanup supply'}
];
const midiSize=9,midiCells=new Map();let activeEntry=midiEntries[0],activeMidiInput=null;
midiEntries.forEach(entry=>[...entry.answer].forEach((letter,i)=>{const r=entry.row+(entry.direction==='down'?i:0),c=entry.col+(entry.direction==='across'?i:0),key=`${r},${c}`;if(!midiCells.has(key))midiCells.set(key,{r,c,letter,entries:[]});midiCells.get(key).entries.push(entry.id)}));
const midiEntry=id=>midiEntries.find(e=>e.id===id);
function selectMidi(entryId,key){
  activeEntry=midiEntry(entryId)||activeEntry;
  $$('.cell').forEach(cell=>{const ids=(cell.dataset.entries||'').split(',');cell.classList.toggle('active-word',ids.includes(activeEntry.id));cell.classList.toggle('selected',cell.dataset.key===key)});
  $$('.clues li').forEach(li=>li.classList.toggle('active-clue',li.dataset.entry===activeEntry.id));
  $('#activeClueBar').innerHTML=`<strong>${activeEntry.number} ${activeEntry.direction==='across'?'Across':'Down'}</strong><span>${activeEntry.clue}</span>`;
}
function focusMidi(entry,index){
  const r=entry.row+(entry.direction==='down'?index:0),c=entry.col+(entry.direction==='across'?index:0),input=$(`.cell[data-key="${r},${c}"] input`);if(input){input.focus();selectMidi(entry.id,`${r},${c}`)}
}
function buildMini(){
  const board=$('#crossword');board.innerHTML='';
  for(let r=0;r<midiSize;r++)for(let c=0;c<midiSize;c++){
    const key=`${r},${c}`,data=midiCells.get(key),cell=document.createElement('div');cell.dataset.key=key;
    if(!data){cell.className='cell block';board.append(cell);continue}
    cell.className='cell';cell.dataset.entries=data.entries.join(',');
    const starter=midiEntries.find(e=>e.row===r&&e.col===c);if(starter)cell.innerHTML=`<span class="num">${starter.number}</span>`;
    const input=document.createElement('input');input.maxLength=1;input.dataset.answer=data.letter;input.setAttribute('aria-label',`Row ${r+1} column ${c+1}`);
    input.addEventListener('focus',()=>{activeMidiInput=input;const ids=data.entries;if(ids.length>1&&ids.includes(activeEntry.id))selectMidi(activeEntry.id,key);else selectMidi(ids[0],key)});
    input.addEventListener('click',()=>{if(data.entries.length>1){const next=data.entries.find(id=>id!==activeEntry.id)||data.entries[0];selectMidi(next,key)}});
    input.addEventListener('input',e=>{e.target.value=e.target.value.replace(/[^a-z]/gi,'').toUpperCase();cell.classList.remove('wrong');if(e.target.value){const idx=(activeEntry.direction==='down'?r-activeEntry.row:c-activeEntry.col);focusMidi(activeEntry,idx+1)}});
    input.addEventListener('keydown',e=>{const idx=(activeEntry.direction==='down'?r-activeEntry.row:c-activeEntry.col);if(e.key==='Backspace'&&!input.value){e.preventDefault();focusMidi(activeEntry,idx-1)}if(e.key==='ArrowRight'){e.preventDefault();const across=data.entries.map(midiEntry).find(x=>x.direction==='across');if(across){activeEntry=across;focusMidi(across,c-across.col+1)}}if(e.key==='ArrowLeft'){e.preventDefault();const across=data.entries.map(midiEntry).find(x=>x.direction==='across');if(across){activeEntry=across;focusMidi(across,c-across.col-1)}}if(e.key==='ArrowDown'){e.preventDefault();const down=data.entries.map(midiEntry).find(x=>x.direction==='down');if(down){activeEntry=down;focusMidi(down,r-down.row+1)}}if(e.key==='ArrowUp'){e.preventDefault();const down=data.entries.map(midiEntry).find(x=>x.direction==='down');if(down){activeEntry=down;focusMidi(down,r-down.row-1)}}});
    cell.append(input);board.append(cell);
  }
  ['across','down'].forEach(direction=>{const list=$(`#${direction}Clues`),entries=midiEntries.filter(e=>e.direction===direction).sort((a,b)=>a.number-b.number);list.innerHTML=entries.map(e=>`<li value="${e.number}" data-entry="${e.id}">${e.clue}</li>`).join('');$$('li',list).forEach(li=>li.onclick=()=>{activeEntry=midiEntry(li.dataset.entry);focusMidi(activeEntry,0)})});
  const keyboard=$('#midiKeyboard');keyboard.innerHTML='';['QWERTYUIOP','ASDFGHJKL','ZXCVBNM⌫'].forEach(row=>{const line=document.createElement('div');[...row].forEach(letter=>{const key=document.createElement('button');key.textContent=letter;key.className=letter==='⌫'?'wide':'';key.onclick=()=>midiType(letter);line.append(key)});keyboard.append(line)});
  selectMidi(activeEntry.id,`${activeEntry.row},${activeEntry.col}`);
}
function midiType(letter){if(!activeMidiInput){focusMidi(activeEntry,0);return}if(letter==='⌫'){if(activeMidiInput.value){activeMidiInput.value='';activeMidiInput.closest('.cell').classList.remove('wrong')}else{const cell=activeMidiInput.closest('.cell'),[r,c]=cell.dataset.key.split(',').map(Number),idx=activeEntry.direction==='down'?r-activeEntry.row:c-activeEntry.col;focusMidi(activeEntry,idx-1)}return}activeMidiInput.value=letter;activeMidiInput.dispatchEvent(new Event('input',{bubbles:true}))}
$('#miniCheck').onclick=()=>{let wrong=0,empty=0;$$('.cell:not(.block)').forEach(cell=>{const input=$('input',cell),bad=!!input.value&&input.value!==input.dataset.answer;cell.classList.toggle('wrong',bad);if(!input.value)empty++;else if(bad)wrong++});if(!wrong&&!empty){recordGame('mini');win('Midi complete!','Across and Down, all wrapped up. Brilliant!')}else toast(wrong?`${wrong} letter${wrong>1?'s':''} need another look`:'A few squares are still empty')};
$('#miniClear').onclick=()=>{$$('.cell input').forEach(i=>i.value='');$$('.cell').forEach(c=>c.classList.remove('wrong'))};
buildMini();

const answer='CRAWL';let guesses=[],current='';
function buildWord(){const b=$('#wordBoard');b.innerHTML='';for(let i=0;i<30;i++){const t=document.createElement('div');t.className='word-tile';b.append(t)};const rows=['QWERTYUIOP','ASDFGHJKL','ENTERZXCVBNM⌫'];const k=$('#keyboard');k.innerHTML='';rows.forEach(row=>{const d=document.createElement('div');d.className='key-row';(row.includes('ENTER')?['ENTER',...row.slice(5,-1),'⌫']:[...row]).forEach(ch=>{const key=document.createElement('button');key.className='key'+(ch.length>1||ch==='⌫'?' wide':'');key.textContent=ch;key.dataset.key=ch;key.onclick=()=>wordKey(ch);d.append(key)});k.append(d)});renderWord()}
function renderWord(){const letters=[...guesses.join(''),...current];$$('.word-tile').forEach((t,i)=>{t.textContent=letters[i]||'';t.className='word-tile'+(letters[i]?' filled':'')});guesses.forEach((g,r)=>{const remaining={};[...answer].forEach(ch=>remaining[ch]=(remaining[ch]||0)+1);[...g].forEach((ch,c)=>{if(ch===answer[c]){tile(r,c).className='word-tile correct';remaining[ch]--}});[...g].forEach((ch,c)=>{if(ch!==answer[c]){const state=remaining[ch]>0?'present':'absent';tile(r,c).className=`word-tile ${state}`;if(remaining[ch]>0)remaining[ch]--;const key=$(`[data-key="${ch}"]`);if(key&&!key.classList.contains('correct'))key.className=`key ${state}`}})})}
const tile=(r,c)=>$$('.word-tile')[r*5+c];
function wordKey(ch){if(guesses.length>=6)return;if(ch==='⌫')current=current.slice(0,-1);else if(ch==='ENTER'){if(current.length<5)return toast('Not enough letters');guesses.push(current);current='';renderWord();if(guesses.at(-1)===answer){recordGame('wordle',{guesses:guesses.length});return setTimeout(()=>win('Bundle of brilliance!','You found the baby word!'),350)}if(guesses.length===6)setTimeout(()=>win('The word was CRAWL','A tricky one! Reset the page to play again.'),350);return}else if(current.length<5)current+=ch;renderWord()}
document.addEventListener('keydown',e=>{if(!$('#wordle').classList.contains('active'))return;if(/^[a-z]$/i.test(e.key))wordKey(e.key.toUpperCase());if(e.key==='Enter')wordKey('ENTER');if(e.key==='Backspace')wordKey('⌫')});buildWord();

const groups=[
 {name:'___ shower',words:['BABY','BRIDAL','METEOR','RAIN']},
 {name:'Types of cake',words:['BUNDT','POUND','SHEET','SPONGE']},
 {name:'Can follow “baby”',words:['BLUE','BOOMER','CARROT','GRAND']},
 {name:'Things with pins',words:['BOWLING','DIAPER','MAP','SAFETY']}
];
let pool=groups.flatMap((g,gi)=>g.words.map(word=>({word,gi}))),selected=[],solved=[],mistakes=4;
function shuffle(a){for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function renderConnections(){const grid=$('#connectionGrid');grid.innerHTML='';pool.filter(x=>!solved.includes(x.gi)).forEach(item=>{const b=document.createElement('button');b.className='connection-card'+(selected.includes(item)?' selected':'');b.textContent=item.word;b.onclick=()=>{if(selected.includes(item))selected=selected.filter(x=>x!==item);else if(selected.length<4)selected.push(item);renderConnections()};grid.append(b)});$('#solvedGroups').innerHTML=solved.map(gi=>`<div class="solved-group level-${gi}"><div><h3>${groups[gi].name}</h3><p>${groups[gi].words.join(', ')}</p></div></div>`).join('');$('#mistakesText').textContent='Mistakes remaining: '+Array(mistakes).fill('●').join(' ')}
$('#shuffleConnections').onclick=()=>{shuffle(pool);renderConnections()};$('#deselectConnections').onclick=()=>{selected=[];renderConnections()};
$('#submitConnections').onclick=()=>{if(selected.length!==4)return toast('Select exactly four cards');const gis=[...new Set(selected.map(x=>x.gi))];if(gis.length===1){solved.push(gis[0]);selected=[];renderConnections();if(solved.length===4){recordGame('connections',{mistakes:4-mistakes});setTimeout(()=>win('Perfect connections!','Four groups found—and one very clever guest.'),250)}}else{const counts={};selected.forEach(x=>counts[x.gi]=(counts[x.gi]||0)+1);mistakes--;toast(Math.max(...Object.values(counts))===3?'One away…':'Not quite');selected=[];renderConnections();if(!mistakes)setTimeout(()=>{solved=[0,1,2,3];renderConnections();win('So close!','Here are the four baby-shower connections.')},300)}};shuffle(pool);renderConnections();

// Original baby-themed Strands puzzle. The solution path snakes through every cell.
const strandTargets=[{word:'BABYSHOWER',spangram:true},{word:'BASSINET'},{word:'SWADDLE'},{word:'ONESIE'},{word:'RATTLE'},{word:'TOY'}];
const strandSequence=strandTargets.map(x=>x.word).join('');
const strandCells=Array(40);let strandOffset=0;
const strandPath=[
  [0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4],[3,4],[4,4],[5,4],
  [6,4],[7,4],[7,3],[7,2],[7,1],[7,0],[6,0],[5,0],
  [4,0],[3,0],[2,0],[1,0],[1,1],[1,2],[1,3],
  [2,3],[3,3],[4,3],[5,3],[6,3],[6,2],
  [6,1],[5,1],[4,1],[3,1],[2,1],[2,2],
  [3,2],[4,2],[5,2]
];
strandTargets.forEach(target=>{target.sequence=[];[...target.word].forEach((letter,j)=>{const [r,c]=strandPath[strandOffset+j],physical=r*5+c;strandCells[physical]={letter,r,c,physical,target:target.word};target.sequence.push(physical)});strandOffset+=target.word.length});
let strandSelected=[],strandFound=[],strandHints=0,strandHinted=new Set(),strandDragging=false,strandDragCell=-1;
const adjacentStrand=(a,b)=>Math.max(Math.abs(strandCells[a].r-strandCells[b].r),Math.abs(strandCells[a].c-strandCells[b].c))===1;
function renderStrands(){
  const grid=$('#strandsGrid');
  if(!grid.querySelector('.strand-letter')){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='strandsLines';svg.setAttribute('viewBox','0 0 5 8');svg.setAttribute('preserveAspectRatio','none');grid.append(svg);strandCells.forEach((data,i)=>{const b=document.createElement('button');b.className='strand-letter';b.textContent=data.letter;b.dataset.index=i;b.setAttribute('aria-label',`Letter ${data.letter}`);grid.append(b)});grid.onpointerdown=e=>{const b=e.target.closest('.strand-letter');if(!b)return;e.preventDefault();strandDragging=true;strandDragCell=Number(b.dataset.index);pickStrand(strandDragCell)};grid.onpointermove=e=>{if(!strandDragging)return;e.preventDefault();const b=document.elementFromPoint(e.clientX,e.clientY)?.closest('.strand-letter');if(!b||!grid.contains(b))return;const i=Number(b.dataset.index);if(i!==strandDragCell){strandDragCell=i;pickStrand(i)}};grid.onpointerup=grid.onpointercancel=()=>{strandDragging=false;strandDragCell=-1}};
  $$('.strand-letter',grid).forEach((b,i)=>{const data=strandCells[i],target=strandTargets.find(x=>x.word===data.target);b.className='strand-letter'+(strandSelected.includes(i)?' selected':'')+(strandFound.includes(data.target)?` found${target.spangram?' spangram':''}`:'')+(strandHinted.has(i)?' hinted':'')});
  drawStrandLines();const current=strandSelected.map(i=>strandCells[i].letter).join('');$('#strandsCurrent').textContent=current||'Drag or tap adjacent letters';$('#strandsFound').textContent=`${strandFound.length} of ${strandTargets.length} theme words found.`;$('#strandsWords').innerHTML=strandFound.map(word=>{const t=strandTargets.find(x=>x.word===word);return `<span class="strands-word${t.spangram?' spangram':''}">${word}</span>`}).join('')
}
function drawStrandLines(){const svg=$('#strandsLines');if(!svg)return;svg.innerHTML='';const paths=[...strandTargets.filter(t=>strandFound.includes(t.word)).map(t=>({cells:t.sequence,type:t.spangram?'spangram':'found'})),...(strandSelected.length>1?[{cells:strandSelected,type:'selected'}]:[])];paths.forEach(path=>{for(let i=1;i<path.cells.length;i++){const a=strandCells[path.cells[i-1]],b=strandCells[path.cells[i]],line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',a.c+.5);line.setAttribute('y1',a.r+.5);line.setAttribute('x2',b.c+.5);line.setAttribute('y2',b.r+.5);line.setAttribute('class',`strand-line ${path.type}`);svg.append(line)}})}
function pickStrand(i){
  if(strandFound.includes(strandCells[i].target))return;
  if(strandSelected.includes(i)){if(strandSelected.at(-1)===i)strandSelected.pop();else strandSelected=[];return renderStrands()}
  if(strandSelected.length&&!adjacentStrand(strandSelected.at(-1),i)){strandSelected=[i]}else strandSelected.push(i);
  const letters=strandSelected.map(x=>strandCells[x].letter).join(''),match=strandTargets.find(t=>!strandFound.includes(t.word)&&(letters===t.word||[...letters].reverse().join('')===t.word));
  if(match){strandFound.push(match.word);strandSelected=[];strandDragging=false;strandDragCell=-1;match.sequence.forEach(x=>strandHinted.delete(x));toast(match.spangram?'Spangram found!':`${match.word} found`);if(strandFound.length===strandTargets.length){recordGame('strands',{hints:strandHints});setTimeout(()=>win('Every strand found!','You uncovered the whole baby-ready theme.'),300)}}renderStrands()
}
window.addEventListener('pointerup',()=>{strandDragging=false;strandDragCell=-1});
$('#strandsClear').onclick=()=>{strandSelected=[];renderStrands()};
$('#strandsHint').onclick=()=>{const target=strandTargets.find(t=>!strandFound.includes(t.word));if(!target)return;const cell=target.sequence[0];if(!strandHinted.has(cell)){strandHints++;strandHinted.add(cell)}strandSelected=[];renderStrands();toast('The first letter is glowing')};
renderStrands();

const modal=$('#modal'),content=$('#modalContent');function win(title,text){modal.classList.remove('game-intro');content.innerHTML=`<p class="eyebrow">Oh, baby!</p><h2>${title}</h2><p>${text}</p>`;modal.showModal()}$('.modal-close').onclick=()=>modal.close();$('#helpBtn').onclick=()=>{modal.classList.remove('game-intro');content.innerHTML='<h2>How to play</h2><p><strong>The Midi:</strong> solve the interlocking Across and Down clues, then check your answers.</p><p><strong>Baby Word:</strong> guess the five-letter word. Green is correct, gold is misplaced, and gray is absent.</p><p><strong>Connections:</strong> select four words that share a hidden link. You have four mistakes.</p><p><strong>Strands:</strong> connect adjacent letters to find six themed words, including the blue spangram.</p>';modal.showModal()};modal.addEventListener('cancel',e=>{if(modal.classList.contains('game-intro'))e.preventDefault()});modal.addEventListener('click',e=>{if(e.target===modal&&!modal.classList.contains('game-intro'))modal.close()});
