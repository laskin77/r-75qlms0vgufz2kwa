document.querySelectorAll('.score').forEach(function(s){var v=(s.dataset.score||'').trim(),n=parseFloat(v),lb=s.dataset.label||'小測驗';
s.textContent=lb+' '+(v===''?'—':v+' 分');s.classList.add(v===''||isNaN(n)?'sc-none':n>=90?'sc-hi':n>=70?'sc-mid':'sc-low');});
