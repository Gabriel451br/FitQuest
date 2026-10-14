// Leitura de código de barras / QR para cadastrar alimentos de embalagem.
// 1) leitor nativo (BarcodeDetector) quando existe; senão ZXing (carregado sob demanda);
// 2) procura primeiro nos alimentos já salvos; depois na Open Food Facts (base aberta
//    com milhares de produtos brasileiros); se não achar, abre o cadastro manual com o código.
import { html, useState, useEffect, useRef } from '../lib.js';
import { getState } from '../store.js';
import { Sheet, openModal, toast } from '../ui.js';
import { parseScan, fromOpenFoodFacts } from '../barcode.js';

export { parseScan, fromOpenFoodFacts };

let zxingPromise = null;
function loadZXing() {
  zxingPromise ??= new Promise((resolve, reject) => {
    if (window.ZXing) return resolve(window.ZXing);
    const sc = document.createElement('script');
    sc.src = './vendor/zxing.min.js';
    sc.onload = () => resolve(window.ZXing);
    sc.onerror = () => { zxingPromise = null; reject(new Error('Não foi possível carregar o leitor')); };
    document.head.appendChild(sc);
  });
  return zxingPromise;
}

async function lookup(code) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_pt,brands,nutriments,serving_quantity`, { signal: ctrl.signal });
    if (!r.ok) return null;
    return fromOpenFoodFacts(code, await r.json());
  } finally {
    clearTimeout(t);
  }
}

/**
 * openScanner({ onFound(food, servingG) , onNew(prefill) })
 *  onFound: alimento já salvo (pronto para escolher a porção)
 *  onNew: dados para o cadastro (da OFF ou só com o código)
 */
export function openScanner(handlers) {
  openModal((close) => html`<${Scanner} close=${close} ...${handlers} />`);
}

function Scanner({ close, onFound, onNew }) {
  const video = useRef(null);
  const [status, setStatus] = useState('Abrindo a câmera…');
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const stopRef = useRef(() => {});
  const doneRef = useRef(false);

  const handle = async (text) => {
    if (doneRef.current) return;
    const res = parseScan(text);
    if (!res) return setStatus('Código não reconhecido. Tente de novo ou digite abaixo.');
    doneRef.current = true;
    stopRef.current();
    navigator.vibrate?.(60);
    if (res.food) {
      close();
      return onNew({ ...res.food });
    }
    const code = res.code;
    const local = (getState().customFoods ?? []).find((f) => f.barcode === code);
    if (local) {
      close();
      return onFound(local, local.serving ?? 100);
    }
    setBusy(true);
    setStatus(`Código ${code}: buscando na Open Food Facts…`);
    try {
      const info = await lookup(code);
      close();
      if (info) {
        toast('Produto encontrado — confira os valores');
        onNew(info);
      } else {
        toast('Produto não está na base — preencha pelo rótulo');
        onNew({ barcode: code, name: '' });
      }
    } catch {
      close();
      toast('Sem conexão — preencha pelo rótulo');
      onNew({ barcode: code, name: '' });
    }
  };

  useEffect(() => {
    let stream = null;
    let raf = 0;
    let reader = null;
    let alive = true;
    const stop = () => {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    stopRef.current = stop;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setStatus('Câmera indisponível neste navegador. Digite o código abaixo.');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
        if (!alive) return stop();
        video.current.srcObject = stream;
        await video.current.play().catch(() => {});
        setStatus('Aponte para o código de barras ou QR');
        const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128'];
        let detector = null;
        if ('BarcodeDetector' in window) {
          try {
            const sup = await window.BarcodeDetector.getSupportedFormats();
            if (sup.includes('ean_13')) detector = new window.BarcodeDetector({ formats: formats.filter((f) => sup.includes(f)) });
          } catch { /* sem suporte */ }
        }
        if (detector) {
          const tick = async () => {
            if (!alive) return;
            try {
              const codes = await detector.detect(video.current);
              if (codes[0]?.rawValue) return handle(codes[0].rawValue);
            } catch { /* frame ainda não pronto */ }
            raf = requestAnimationFrame(tick);
          };
          tick();
        } else {
          const ZX = await loadZXing();
          if (!alive) return;
          const hints = new Map();
          hints.set(ZX.DecodeHintType.POSSIBLE_FORMATS, [ZX.BarcodeFormat.EAN_13, ZX.BarcodeFormat.EAN_8, ZX.BarcodeFormat.UPC_A, ZX.BarcodeFormat.UPC_E, ZX.BarcodeFormat.QR_CODE, ZX.BarcodeFormat.CODE_128]);
          hints.set(ZX.DecodeHintType.TRY_HARDER, true);
          // Lê quadros do vídeo num canvas e decodifica direto (o leitor de vídeo
          // do ZXing não dispara no iPhone quando o vídeo já está tocando).
          reader = new ZX.MultiFormatReader();
          reader.setHints(hints);
          const canvas = document.createElement('canvas');
          const c2 = canvas.getContext('2d', { willReadFrequently: true });
          // faixa central (onde fica a moldura) primeiro; depois o quadro inteiro
          const regions = [[0.08, 0.28, 0.84, 0.44], [0, 0, 1, 1]];
          let n = 0;
          const scanFrame = () => {
            if (!alive) return;
            const v = video.current;
            const w = v?.videoWidth, h = v?.videoHeight;
            if (w && h) {
              const [rx, ry, rw, rh] = regions[n++ % regions.length];
              const sw = Math.round(w * rw), sh = Math.round(h * rh);
              const scale = Math.min(1, 1000 / sw);
              canvas.width = Math.round(sw * scale);
              canvas.height = Math.round(sh * scale);
              try {
                c2.drawImage(v, Math.round(w * rx), Math.round(h * ry), sw, sh, 0, 0, canvas.width, canvas.height);
                const bmp = new ZX.BinaryBitmap(new ZX.HybridBinarizer(new ZX.HTMLCanvasElementLuminanceSource(canvas)));
                const res = reader.decode(bmp);
                if (res?.getText()) return handle(res.getText());
              } catch { /* nada neste quadro */ }
              reader.reset?.();
            } else if (v?.paused) {
              v.play().catch(() => {});
            }
            raf = setTimeout(scanFrame, 120);
          };
          scanFrame();
        }
      } catch (e) {
        setStatus(e?.name === 'NotAllowedError' ? 'Permita o acesso à câmera (Ajustes do iPhone → Safari → Câmera) ou digite o código.' : 'Não foi possível abrir a câmera. Digite o código abaixo.');
      }
    })();
    return stop;
  }, []);

  return html`
    <${Sheet} title="Escanear código" onClose=${() => { stopRef.current(); close(); }} full>
      <div class="scan-box">
        <video ref=${video} playsinline muted autoplay></video>
        <div class="scan-frame" aria-hidden="true"></div>
      </div>
      <p class="small center" role="status">${busy ? '⏳ ' : ''}${status}</p>
      <div class="row">
        <input class="input num grow" inputmode="numeric" placeholder="Ou digite o código (EAN)" value=${manual} onInput=${(e) => setManual(e.target.value.replace(/\D/g, ''))} />
        <button class="btn dark" disabled=${manual.length < 8 || busy} onClick=${() => handle(manual)}>Buscar</button>
      </div>
      <p class="tiny muted">Dados de produtos: Open Food Facts (base colaborativa). Confira os valores com o rótulo antes de salvar.</p>
    <//>
  `;
}

