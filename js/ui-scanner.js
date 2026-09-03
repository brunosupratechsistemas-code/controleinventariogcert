// Busca rápida de item pela câmera: aponta pra etiqueta impressa e o app já abre a edição.
window.uiScanner = (function(){
  "use strict";
  var U = utils;
  var videoEl, stream = null, scanning = false, scanLoopId = null;
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d', { willReadFrequently: true });

  function codigoFromScan(text){
    try{
      var url = new URL(text);
      var c = url.searchParams.get('codigo');
      if(c) return c;
    }catch(e){ /* não é uma URL, segue com o texto puro */ }
    return text;
  }

  function start(){
    videoEl = document.getElementById('scanVideo');
    document.getElementById('scanStatus').textContent = 'Solicitando acesso à câmera...';
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function(s){
      stream = s;
      videoEl.srcObject = s;
      return videoEl.play();
    }).then(function(){
      scanning = true;
      document.getElementById('startScanBtn').style.display = 'none';
      document.getElementById('stopScanBtn').style.display = '';
      document.getElementById('scanStatus').textContent = 'Aponte a câmera para o QR Code da etiqueta...';
      loop();
    }).catch(function(){
      document.getElementById('scanStatus').textContent = 'Não foi possível acessar a câmera. Verifique a permissão do navegador.';
      U.toast('Erro ao acessar a câmera', 'err');
    });
  }

  function loop(){
    if(!scanning) return;
    if(videoEl.readyState === videoEl.HAVE_ENOUGH_DATA){
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      try{
        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var code = jsQR(imgData.data, imgData.width, imgData.height);
        if(code && code.data){
          onResult(codigoFromScan(code.data));
          return;
        }
      }catch(e){ /* frame inválido, ignora */ }
    }
    scanLoopId = requestAnimationFrame(loop);
  }

  function onResult(codigo){
    var item = state.itens.find(function(i){ return i.codigo === codigo; });
    if(!item){
      document.getElementById('scanStatus').textContent = 'Código não encontrado: ' + codigo + '. Continuando...';
      scanLoopId = requestAnimationFrame(loop);
      return;
    }
    stop();
    U.toast('Encontrado: ' + item.nome, 'ok');
    uiEstoque.openEdit(item);
  }

  function stop(){
    scanning = false;
    if(scanLoopId) cancelAnimationFrame(scanLoopId);
    if(stream){ stream.getTracks().forEach(function(t){ t.stop(); }); stream = null; }
    if(videoEl) videoEl.srcObject = null;
    document.getElementById('startScanBtn').style.display = '';
    document.getElementById('stopScanBtn').style.display = 'none';
    document.getElementById('scanStatus').textContent = 'Câmera desligada';
  }

  function initForm(){
    document.getElementById('startScanBtn').addEventListener('click', start);
    document.getElementById('stopScanBtn').addEventListener('click', stop);
  }

  return { initForm: initForm, stop: stop };
})();
