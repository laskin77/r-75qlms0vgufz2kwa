(function(){/* 小時鐘（僅顯示台北時間；鬧鐘版備份在 /workspace/roby/backup_alarm/）*/
var fmt=new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
var c=document.createElement('div');c.id='clk';c.innerHTML='<span class="cf"><i class="hh"></i><i class="mm"></i></span><span class="ct">--:--</span><small class="cs"></small>';
var bar=document.createElement('div');bar.id='clkbar';bar.appendChild(c);document.body.appendChild(bar);
function tick(){var o={};fmt.formatToParts(new Date()).forEach(p=>o[p.type]=p.value);
c.querySelector('.ct').textContent=o.hour+':'+o.minute;c.querySelector('.cs').textContent=o.second;
var h=+o.hour%12,m=+o.minute;c.querySelector('.hh').style.transform='rotate('+(h*30+m/2)+'deg)';c.querySelector('.mm').style.transform='rotate('+(m*6)+'deg)';}
setInterval(tick,1000);document.addEventListener('visibilitychange',tick);tick();})();
