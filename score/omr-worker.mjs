// Optical music recognition, entirely in the browser.
// homr (https://github.com/liebharc/homr, AGPL-3.0) is a Python program: its own code runs here
// unchanged in Pyodide, and its neural networks run in onnxruntime-web through a small stand-in
// for the onnxruntime package (homr/onnxruntime_shim.py). This file is under AGPL-3.0 as well.
import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.29.5/full/pyodide.mjs';
import * as ort from 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/ort.all.min.mjs';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/';

const HOMR = 'homr/homr-f6d0111bbe2c.zip';
// homr's released checkpoints, under the names homr itself asks for
const MODELS = {
  'segnet_308-3296ccd40960f90ca6ab9c035cca945675d30a0f.onnx': 57311361,
  'encoder_pytorch_model_509-2293bba14bfea47d9d28411339362af15fce4c31.onnx': 52861122,
  'decoder_pytorch_model_509-2293bba14bfea47d9d28411339362af15fce4c31.onnx': 47356003,
  'staff_relations_pdmx2-cc40992a36690003f7ed2bebe197016f19242fa6.onnx': 1573197,
  'staff_pieces_h1-165e413e0edb2d8d2486e2bface8f345e6641ec9.onnx': 1378747,
};
const TOTAL = Object.values(MODELS).reduce((a, b) => a + b, 0);
const CACHE = 'score-omr-models-v1';

let modelBase = 'models/';
let ready = null;            // promise of the Pyodide instance, set up once
const buffers = new Map();   // model name -> bytes, until its session exists
const sessions = new Map();  // model name -> promise of its index in `list`
const list = [];
let loaded = 0;
let current = 0;             // the id of the image being read

const say = (stage, extra) => postMessage({ type: 'stage', stage, extra });

// The models are large: they are kept in Cache Storage, which the browser does not evict
// the way it does its HTTP cache.
async function fetchModel(name) {
  const url = new URL(modelBase + name, self.location.href).href;
  let cache = null;
  try { cache = await caches.open(CACHE); } catch {}
  const hit = cache && await cache.match(url);
  if (hit) {
    const bytes = new Uint8Array(await hit.arrayBuffer());
    loaded += bytes.length;
    return bytes;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`model ${name}: HTTP ${res.status}`);
  const bytes = new Uint8Array(MODELS[name]);
  const reader = res.body.getReader();
  for (let at = 0; ;) {
    const { done, value } = await reader.read();
    if (done) { if (at !== bytes.length) throw new Error(`model ${name}: incomplete download`); break; }
    bytes.set(value, at);
    at += value.length; loaded += value.length;
    say('download', Math.round(100 * loaded / TOTAL));
  }
  try { await cache?.put(url, new Response(bytes.slice(), { headers: { 'Content-Type': 'application/octet-stream' } })); } catch {}
  return bytes;
}

// What the stand-in onnxruntime module calls.
const bridge = {
  // the strip of the picture above the first staff, where the title and the tempo are
  header(png, unit, width) { postMessage({ type: 'header', id: current, png: png.slice().buffer, unit, width }); },
  tensor: (type, data, dims) => new ort.Tensor(type, data, Array.from(dims)),
  create(name) {
    if (!sessions.has(name)) sessions.set(name, (async () => {
      const bytes = buffers.get(name) || await fetchModel(name);
      buffers.delete(name);
      list.push(await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] }));
      return list.length - 1;
    })());
    return sessions.get(name);
  },
  async run(id, keys, values, names) {
    const session = list[id], feeds = {};
    keys.forEach((k, i) => { feeds[k] = values[i]; });
    const wanted = names ? Array.from(names) : session.outputNames;
    const out = await session.run(feeds, wanted);
    return wanted.map(n => out[n]);
  },
};

// homr reports its progress on stderr; the lines that mark a new stage are passed on.
function onLog(line) {
  let m;
  if (/^header:/.test(line)) postMessage({ type: 'log', line });
  else if (/Starting Inference/.test(line)) say('segment');
  else if ((m = /Found (\d+) connected staffs/.exec(line))) say('staffs', +m[1]);
  else if ((m = /Running TrOmr inference on staff image (\d+)/.exec(line))) say('read', +m[1] + 1);
}

function setUp() {
  if (!ready) ready = (async () => {
    say('runtime');
    const [py] = await Promise.all([
      loadPyodide({ stdout: () => {}, stderr: onLog }),
      // the downloads start at once, next to the Python runtime
      ...Object.keys(MODELS).map(async name => { buffers.set(name, await fetchModel(name)); }),
    ]);
    await py.loadPackage(['numpy', 'opencv-python', 'pillow', 'typing-extensions', 'lzma'], { messageCallback: () => {} });
    py.registerJsModule('omr_js', bridge);
    const [zip, shim] = await Promise.all([
      fetch(HOMR).then(r => r.arrayBuffer()),
      fetch('homr/onnxruntime_shim.py').then(r => r.text()),
    ]);
    py.FS.mkdirTree('/omr/onnxruntime');
    py.FS.writeFile('/omr/onnxruntime/__init__.py', shim);
    // packages homr imports but does not need here: downloads, title OCR and PDF input
    const stubs = { requests: 'class exceptions:\n    RequestException = Exception\n', rapidocr: 'class RapidOCR:\n    pass\n', pypdfium2: '' };
    for (const [name, source] of Object.entries(stubs)) py.FS.writeFile(`/omr/${name}.py`, source);
    py.unpackArchive(zip, 'zip', { extractDir: '/omr' });
    py.FS.mkdirTree('/work');
    await py.runPythonAsync(`
import sys
sys.path.insert(0, '/omr')
from concurrent.futures import Future
import cv2
import omr_js
from pyodide.ffi import to_js
import homr.main
from homr.main import process_image, ProcessingConfig
from homr.music_xml_generator import XmlGeneratorArguments

# homr reads the title with an OCR package that does not run here. Its hook is used to hand
# the part of the picture above the first staff to the page, which reads title and tempo itself.
def header(debug, top_staff):
    try:
        top = int(top_staff.min_y)
        if top >= 30:
            ok, png = cv2.imencode('.png', debug.original_image[:top, :])
            if ok:
                # with the size of the staff, so that the page can engrave at the same proportions
                omr_js.header(to_js(png.tobytes()), float(top_staff.average_unit_size), float(top_staff.max_x - top_staff.min_x))
    except Exception as e:
        print('header:', e, file=sys.stderr)
    nothing = Future()
    nothing.set_result('')
    return nothing

homr.main.detect_title = header

def recognise():
    config = ProcessingConfig(
        enable_debug=False, enable_cache=False, write_staff_positions=False, read_staff_positions=False,
        selected_staff=-1, transformer_use_gpu=False, segnet_use_gpu=False, coreml_encoder=False,
        title_detection=True,
    )
    process_image('/work/page.png', config, XmlGeneratorArguments())
    with open('/work/page.musicxml', encoding='utf-8') as f:
        return f.read()
`);
    return py;
  })();
  ready.catch(() => { ready = null; });   // so that the next image tries again
  return ready;
}

let queue = Promise.resolve();
onmessage = e => {
  const { id, image, models } = e.data;
  if (models) modelBase = models;
  // one at a time: there is one Python interpreter
  queue = queue.then(async () => {
    try {
      const py = await setUp();
      current = id;
      py.FS.writeFile('/work/page.png', new Uint8Array(image));
      const recognise = py.globals.get('recognise');
      // callPromising lets the Python code wait for the models, which run asynchronously
      const xml = await recognise.callPromising();
      recognise.destroy();
      postMessage({ type: 'done', id, xml });
    } catch (err) {
      console.error(err);
      // the last line of a Python traceback is the message
      const text = String(err?.message || err).trim().split('\n').pop();
      postMessage({ type: 'error', id, message: text });
    }
  });
};
