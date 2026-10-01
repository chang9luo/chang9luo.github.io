// The colour picker of the tool pages (/crop, /latexsvg).  It opens in place of the browser's
// own popup for <input type="color"> and shows the colour as Hex, RGB 0-255 and RGB 0-1 at
// the same time, each of them editable, where the browser's popup shows one notation at a
// time.  The input remains the holder of the value and still fires `input` and `change`, so a
// page only calls ColorPicker.attach(input).  Colours come from the page's own CSS variables.
const ColorPicker = (() => {
  const threeNumbers = (text, max) => {
    const n = (text.match(/\d*\.?\d+/g) || []).map(Number);
    return (n.length === 3 || n.length === 4) && n.slice(0, 3).every(v => v <= max) ? n.slice(0, 3) : null;
  };

  // each notation: how to write an [r, g, b] of 0-255, and how to read one back (null if it is not a colour)
  const FORMATS = {
    hex: {
      label: 'Hex',
      show: rgb => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join(''),
      read(text) {  // with or without the #, three or six digits
        const m = /^\s*#?([0-9a-f]{3}|[0-9a-f]{6})\s*$/i.exec(text);
        if (!m) return null;
        const h = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1];
        return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
      },
    },
    rgb255: {
      label: 'RGB 0–255',
      show: rgb => rgb.join(', '),
      read: text => threeNumbers(text, 255)?.map(Math.round) ?? null,
    },
    rgb01: {
      label: 'RGB 0–1',
      show: rgb => rgb.map(v => +(v / 255).toFixed(3)).join(', '),
      read: text => threeNumbers(text, 1)?.map(v => Math.round(v * 255)) ?? null,
    },
  };

  // '#1f77b4', '1f77b4' or 'rgb(31, 119, 180)' -> [31, 119, 180]
  const read = text => FORMATS.hex.read(text) || FORMATS.rgb255.read(text);

  function toHsv([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    return [h, max ? d / max : 0, max];
  }

  function toRgb([h, s, v]) {
    const f = n => {
      const k = (n + h / 60) % 6;
      return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
    };
    return [f(5), f(3), f(1)];
  }

  const CSS = `
.cp-pop {
  position: fixed; z-index: 100; display: grid; gap: 10px; width: 284px; padding: 12px;
  background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, .3); font-size: 13px; user-select: none;
}
.cp-pop[hidden] { display: none; }
.cp-sv {
  position: relative; height: 150px; border-radius: 6px; cursor: crosshair; touch-action: none;
  background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(var(--cp-hue) 100% 50%));
}
.cp-sv i {
  position: absolute; width: 12px; height: 12px; margin: -6px; border-radius: 50%;
  border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0, 0, 0, .6); pointer-events: none;
}
.cp-row { display: flex; align-items: center; gap: 10px; }
.cp-pick { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 28px; padding: 0; }
.cp-pick[hidden] { display: none; }
.cp-pick svg { width: 15px; height: 15px; }
.cp-now { flex: none; width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--line); }
.cp-hue {
  flex: 1; min-width: 0; height: 12px; margin: 0; border-radius: 6px; cursor: pointer;
  -webkit-appearance: none; appearance: none;
  background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
}
.cp-hue::-webkit-slider-thumb {
  -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
  background: #fff; border: 1px solid rgba(0, 0, 0, .5); box-shadow: 0 1px 3px rgba(0, 0, 0, .4);
}
.cp-hue::-moz-range-thumb {
  width: 14px; height: 14px; border-radius: 50%;
  background: #fff; border: 1px solid rgba(0, 0, 0, .5); box-shadow: 0 1px 3px rgba(0, 0, 0, .4);
}
.cp-pop label { display: grid; grid-template-columns: 70px 1fr; align-items: center; gap: 8px; color: var(--muted); }
.cp-pop input[type=text] {
  width: 100%; min-width: 0; padding: 4px 8px; border: 1px solid var(--line); border-radius: 6px;
  background: var(--bg); color: var(--text); font: 13px ui-monospace, Menlo, Consolas, monospace;
  user-select: text;
}
.cp-pop input[type=text]:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
.cp-pop input[type=text].bad { outline: 2px solid var(--bad, #c62828); outline-offset: -1px; }
`;

  let pop = null;        // the one popup, built on first use
  let target = null;     // the <input type="color"> it is open for
  let hsv = [0, 0, 0];   // what the popup shows; kept as HSV so that greys do not lose their hue
  let applying = false;  // we are the ones changing the input
  let typing = null;     // the text field the change comes from: the one not to rewrite under the cursor
  const el = {};         // parts of the popup

  // Writes a colour into an input as if it had been picked there.
  function write(input, rgb, events = ['input', 'change']) {
    input.value = FORMATS.hex.show(rgb);
    applying = true;
    for (const name of events) input.dispatchEvent(new Event(name, { bubbles: true }));
    applying = false;
    if (input === target) paint();
  }

  // The same for a page's own use, e.g. its eyedropper button.
  function set(input, rgb) {
    if (input === target) hsv = toHsv(rgb);
    write(input, rgb);
  }

  function build() {
    document.head.append(Object.assign(document.createElement('style'), { textContent: CSS }));
    pop = document.createElement('div');
    pop.className = 'cp-pop';
    pop.hidden = true;
    pop.innerHTML = `
      <div class="cp-sv"><i></i></div>
      <div class="cp-row">
        <button type="button" class="cp-pick" title="Pick a color from the screen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg></button>
        <span class="cp-now"></span>
        <input class="cp-hue" type="range" min="0" max="360" step="1" aria-label="Hue">
      </div>`;
    el.sv = pop.querySelector('.cp-sv');
    el.thumb = el.sv.firstElementChild;
    el.now = pop.querySelector('.cp-now');
    el.hue = pop.querySelector('.cp-hue');
    el.pick = pop.querySelector('.cp-pick');
    el.fields = {};

    for (const kind in FORMATS) {
      const label = document.createElement('label'), name = document.createElement('span'), field = document.createElement('input');
      name.textContent = FORMATS[kind].label;
      field.type = 'text';
      field.spellcheck = false;
      field.autocomplete = 'off';
      field.dataset.kind = kind;
      field.oninput = () => {
        const rgb = FORMATS[kind].read(field.value);
        field.classList.toggle('bad', !rgb);
        if (!rgb) return;
        const [h, s, v] = toHsv(rgb);
        hsv = [s && v ? h : hsv[0], s, v];
        typing = field;
        write(target, rgb);
        typing = null;
      };
      field.onblur = paint;  // tidy the notation, or put the colour back if it was not one
      field.onkeydown = e => { if (e.key === 'Enter') field.blur(); };
      label.append(name, field);
      pop.append(label);
      el.fields[kind] = field;
    }

    // drag in the square: saturation across, brightness down
    const drag = e => {
      const r = el.sv.getBoundingClientRect(), unit = v => Math.max(0, Math.min(1, v));
      hsv = [hsv[0], unit((e.clientX - r.left) / r.width), 1 - unit((e.clientY - r.top) / r.height)];
      write(target, toRgb(hsv), ['input']);
    };
    el.sv.onpointerdown = e => {
      if (e.button !== 0) return;
      e.preventDefault();  // keep the text fields from being selected by the drag
      try { el.sv.setPointerCapture(e.pointerId); } catch {}
      el.sv.onpointermove = drag;
      drag(e);
    };
    el.sv.onpointerup = el.sv.onpointercancel = () => {
      if (!el.sv.onpointermove) return;
      el.sv.onpointermove = null;
      write(target, toRgb(hsv), ['change']);
    };
    el.hue.oninput = () => { hsv = [+el.hue.value, hsv[1], hsv[2]]; write(target, toRgb(hsv), ['input']); };
    el.hue.onchange = () => write(target, toRgb(hsv), ['change']);

    if (window.EyeDropper) {
      el.pick.onclick = async () => {
        let picked;
        try { picked = await new EyeDropper().open(); } catch { return; }  // Esc
        const rgb = read(picked.sRGBHex);
        if (rgb && target) { hsv = toHsv(rgb); write(target, rgb); }
      };
    } else {
      el.pick.hidden = true;
    }

    document.body.append(pop);
    addEventListener('pointerdown', e => {
      if (target && !pop.contains(e.target) && e.target !== target) close();
    }, true);
    addEventListener('keydown', e => { if (e.key === 'Escape' && target) { e.stopPropagation(); close(); } }, true);
    addEventListener('resize', close);
  }

  function paint() {
    if (!target) return;
    const rgb = FORMATS.hex.read(target.value) || [0, 0, 0];
    el.sv.style.setProperty('--cp-hue', hsv[0]);
    el.thumb.style.left = hsv[1] * 100 + '%';
    el.thumb.style.top = (1 - hsv[2]) * 100 + '%';
    el.hue.value = hsv[0];
    el.now.style.background = target.value;
    for (const kind in el.fields) {
      if (el.fields[kind] === typing) continue;
      el.fields[kind].value = FORMATS[kind].show(rgb);
      el.fields[kind].classList.remove('bad');
    }
  }

  function open(input) {
    if (!pop) build();
    target = input;
    hsv = toHsv(FORMATS.hex.read(input.value) || [0, 0, 0]);
    pop.hidden = false;
    paint();
    // under the swatch; with no room there, beside it on the left, or else above it;
    // never off the edge of the window
    const r = input.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    let left = r.left, top = r.bottom + 6;
    if (top + h > innerHeight) {
      if (r.left - w - 8 >= 8) { left = r.left - w - 8; top = r.bottom - h; }
      else top = r.top - 6 - h;
    }
    pop.style.left = Math.max(8, Math.min(left, innerWidth - w - 8)) + 'px';
    pop.style.top = Math.max(8, Math.min(top, innerHeight - h - 8)) + 'px';
  }

  function close() {
    if (!target) return;
    target = null;
    pop.hidden = true;
  }

  function attach(input) {
    input.addEventListener('click', e => {
      e.preventDefault();  // not the browser's popup
      if (target === input) close();
      else open(input);
    });
    // the page changed the colour itself (its own eyedropper button, a stored value)
    const follow = () => {
      if (applying || input !== target) return;
      hsv = toHsv(FORMATS.hex.read(input.value) || [0, 0, 0]);
      paint();
    };
    input.addEventListener('input', follow);
    input.addEventListener('change', follow);
  }

  return { attach, set, read };
})();
