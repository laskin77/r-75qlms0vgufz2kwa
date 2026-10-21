/* 二擇一：同 data-excl 群組的勾選框互斥，可都不選 */
document.querySelectorAll('input[data-excl]').forEach(function(e){e.addEventListener('change',function(){if(e.checked)document.querySelectorAll('input[data-excl="'+e.dataset.excl+'"]').forEach(function(o){if(o!==e)o.checked=false})})});
