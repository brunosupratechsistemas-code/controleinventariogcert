window.utils = (function(){
  "use strict";

  function escapeHtml(s){
    return (s == null ? "" : String(s)).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function statusClass(s){
    return 'status-' + String(s || '').replace(/\s+/g, '-');
  }
  function fmtDate(iso){
    if(!iso) return '';
    try{ return new Date(iso).toLocaleDateString('pt-BR'); }catch(e){ return ''; }
  }
  function fmtMes(isoDate){
    if(!isoDate) return '';
    var d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
  }
  function mesAtualISO(){
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-01';
  }
  function toast(msg, kind){
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function(){ el.remove(); }, 2800);
  }
  function itemPublicUrl(codigo){
    var base = location.href.replace(/index\.html.*$/, '').replace(/\?.*$/, '');
    if(!/\/$/.test(base)) base += '/';
    return base + 'item.html?codigo=' + encodeURIComponent(codigo);
  }
  function renderQrInto(el, text, size){
    el.innerHTML = '';
    try{
      new QRCode(el, {
        text: text, width: size, height: size,
        colorDark: "#1B2430", colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    }catch(e){
      el.textContent = '[QR indisponível]';
    }
  }
  function errMsg(err){
    return (err && (err.message || err.error_description)) || 'Ocorreu um erro. Tente novamente.';
  }

  return { escapeHtml, statusClass, fmtDate, fmtMes, mesAtualISO, toast, itemPublicUrl, renderQrInto, errMsg };
})();
