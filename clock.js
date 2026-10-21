(function(){
var AK='roby-alarms',FK='roby-alarm-fired',SK='roby-alarm-snooze';
var fmt=new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function tp(){var o={};fmt.formatToParts(new Date()).forEach(p=>o[p.type]=p.value);return o}
var J=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}},W=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
var esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
var c=document.createElement('button');c.id='clk';c.title='App 內小鬧鐘（需開著 App）';c.innerHTML='<span class="cf"><i class="hh"></i><i class="mm"></i></span><span class="ct">--:--</span><small class="cs"></small><span class="cb">⏰</span>';
var bar=document.createElement('div');bar.id='clkbar';
var sa=document.createElement('a');sa.id='sysal';sa.href='clock-alarm://';sa.textContent='⏰ 開啟 iPad 鬧鐘';
sa.onclick=function(e){e.preventDefault();var t0=Date.now();try{location.href='clock-alarm://'}catch(_){}
 setTimeout(function(){if(!document.hidden&&Date.now()-t0<2500){try{location.href='clock-timer://'}catch(_){}}},900)};
bar.appendChild(sa);bar.appendChild(c);document.body.appendChild(bar);
var ac;function unlock(){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();ac.resume();var b=ac.createBuffer(1,1,22050),s=ac.createBufferSource();s.buffer=b;s.connect(ac.destination);s.start(0)}catch(e){}}
function ring(){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();[0,.25,.5].forEach(function(d){var o=ac.createOscillator(),g=ac.createGain();o.type='triangle';o.frequency.value=d==.25?1046:784;o.connect(g);g.connect(ac.destination);var t=ac.currentTime+d;g.gain.setValueAtTime(.35,t);g.gain.exponentialRampToValueAtTime(.001,t+.22);o.start(t);o.stop(t+.22)})}catch(e){}if(navigator.vibrate)navigator.vibrate(300)}
// 設定面板
var pn=document.createElement('div');pn.id='alp';pn.style.display='none';document.body.appendChild(pn);
function draw(){var A=J(AK,[]);pn.innerHTML='<div class="alb"><h2>⏰ 鬧鐘</h2><div class="all">'+(A.length?A.map(a=>'<div class="ali"><label class="sw"><input type="checkbox" data-on="'+a.id+'"'+(a.on?' checked':'')+'></label><b>'+a.t+'</b><span>'+esc(a.label||'')+'</span><button data-del="'+a.id+'">刪除</button></div>').join(''):'<p class="aln">還沒有鬧鐘</p>')+
'</div><div class="ala"><input type="time" id="alT" value="19:30"><input id="alL" placeholder="標籤，例如：開始寫功課" maxlength="20"><button id="alAdd">＋ 新增</button></div><small class="alh">需開著 App 才會響（台北時間）</small><button id="alX" class="alclose">關閉</button></div>';
pn.querySelectorAll('[data-on]').forEach(e=>e.onchange=function(){unlock();var A=J(AK,[]);A.forEach(a=>{if(a.id==e.dataset.on)a.on=e.checked});W(AK,A)});
pn.querySelectorAll('[data-del]').forEach(e=>e.onclick=function(){W(AK,J(AK,[]).filter(a=>a.id!=e.dataset.del));draw()});
pn.querySelector('#alAdd').onclick=function(){unlock();var t=pn.querySelector('#alT').value;if(!t)return;var A=J(AK,[]);A.push({id:Date.now().toString(36),t:t,label:pn.querySelector('#alL').value.trim(),on:true});A.sort((a,b)=>a.t<b.t?-1:1);W(AK,A);draw()};
pn.querySelector('#alX').onclick=function(){pn.style.display='none'};}
c.onclick=function(){unlock();draw();pn.style.display=''};pn.onclick=function(e){if(e.target==pn)pn.style.display='none'};
// 響鈴彈窗
var rg=null,rgT=null;
function fire(a){if(rg)return;unlock();ring();rgT=setInterval(ring,1200);rg=document.createElement('div');rg.id='alr';
rg.innerHTML='<div class="alb"><div class="alrt">'+a.t+'</div><div class="alrl">'+esc(a.label||'鬧鐘')+'</div><div class="tbtns"><button class="sn">稍後 5 分鐘</button><button class="of">關閉</button></div></div>';
document.body.appendChild(rg);var close=function(){clearInterval(rgT);rg.remove();rg=null};
rg.querySelector('.of').onclick=close;rg.querySelector('.sn').onclick=function(){var S=J(SK,{});S[a.id]=Date.now()+5*60e3;W(SK,S);close()};}
function tick(){var p=tp(),hm=p.hour+':'+p.minute,day=p.year+'-'+p.month+'-'+p.day;
c.querySelector('.ct').textContent=hm;c.querySelector('.cs').textContent=p.second;
var h=+p.hour%12,m=+p.minute;c.querySelector('.hh').style.transform='rotate('+(h*30+m/2)+'deg)';c.querySelector('.mm').style.transform='rotate('+(m*6)+'deg)';
var A=J(AK,[]),F=J(FK,{}),S=J(SK,{}),now=Date.now();
A.forEach(function(a){if(!a.on)return;var key=day+' '+a.t;if(a.t==hm&&F[a.id]!=key){F[a.id]=key;W(FK,F);fire(a)}
 if(S[a.id]&&now>=S[a.id]){delete S[a.id];W(SK,S);fire(a)}});
c.classList.toggle('has',A.some(a=>a.on));}
setInterval(tick,1000);document.addEventListener('visibilitychange',tick);tick();
})();
