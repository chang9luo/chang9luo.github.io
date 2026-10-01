// The reference drawer of /latexsvg: a cheat sheet that slides in from the right edge when
// its tab is pressed.  It lists the commands covered by two pages of the University of
// Tokyo's Hyper Workbook, "20.8 数式の書き方 (1)" and "20.6 文字修飾とフォント"; the symbols are
// drawn here by MathJax and the notes are our own.  It is for reading only: nothing in it
// is inserted into the equation.  Uses $, lang, ready and symbolNode() of the page.
(() => {
  const R = String.raw;
  const list = text => text.trim().split(/\s+/);

  // A section: title, columns, and either `items` (LaTeX to draw, shown with its code;
  // [tex, code] when the code to show differs) or `text` rows drawn with CSS.
  const SECTIONS = [
    {
      en: 'Basics', zh: '基础', cols: 1,
      items: [R`x^{2}`, R`x_{ij}`, R`\frac{a}{b}`, R`\sum_{i=1}^{n} i^2`, R`\prod_{i=1}^{n} a_i`, R`\int_0^1 f(x)\,dx`],
      note: {
        en: 'In a document, `$ … $` sets a formula inside a line and `\\[ … \\]` on a line of its own, where it is given more height. Spaces inside a formula are ignored.',
        zh: '在文档里，`$ … $` 是行内公式，`\\[ … \\]` 是独立成行的公式（会排得更高）。公式里的空格会被忽略。',
      },
    },
    {
      en: 'Roots, lines and braces', zh: '根号、横线与花括号', cols: 2,
      items: list(R`\sqrt{ABC} \overline{ABC} \underline{ABC} \widehat{ABC} \widetilde{ABC} \overrightarrow{ABC} \overleftarrow{ABC} \overbrace{ABC} \underbrace{ABC}`),
    },
    {
      en: 'Dots and mod', zh: '省略号与取模', cols: 1,
      items: [R`x_1,\ldots,x_n`, R`x_1+\cdots+x_n`, R`a\equiv b \pmod 3`, R`4\bmod 42`],
      note: { en: '`\\ldots` sits on the baseline, `\\cdots` at mid height.', zh: '`\\ldots` 在基线上，`\\cdots` 在中间高度。' },
    },
    {
      en: 'Accents', zh: '重音符号', cols: 3,
      items: list(R`\acute{x} \grave{x} \ddot{x} \tilde{x} \bar{x} \breve{x} \check{x} \hat{x} \vec{x} \dot{x}`),
      note: { en: 'Under an accent, use the dotless `\\imath` and `\\jmath` for i and j.', zh: '给 i、j 加重音时，用不带点的 `\\imath` 和 `\\jmath`。' },
    },
    {
      en: 'Greek letters', zh: '希腊字母', cols: 3,
      items: list(R`\alpha \beta \gamma \delta \epsilon \zeta \eta \theta \iota \kappa \lambda \mu \nu \xi \pi \rho \sigma \tau \upsilon \phi \chi \psi \omega
        \varepsilon \vartheta \varpi \varrho \varsigma \varphi
        \Gamma \Delta \Theta \Lambda \Xi \Pi \Sigma \Upsilon \Phi \Psi \Omega`),
      note: { en: 'The capitals not listed look like Latin letters (capital alpha is A), so the Latin letter is used.', zh: '没有列出的大写字母与拉丁字母同形（如大写 alpha 就是 A），直接用拉丁字母。' },
    },
    {
      en: 'Miscellaneous symbols', zh: '其他符号', cols: 3,
      items: list(R`\aleph \hbar \imath \jmath \ell \wp \Re \Im \partial \infty \prime \emptyset \nabla \surd \top \bot \angle \triangle \forall \exists \neg \flat \natural \sharp \clubsuit \diamondsuit \heartsuit \spadesuit`),
    },
    {
      en: 'Large operators', zh: '大型运算符', cols: 2,
      items: list(R`\sum \prod \coprod \int \oint \bigcup \bigcap \bigsqcup \biguplus \bigvee \bigwedge \bigodot \bigoplus \bigotimes`)
        .map(c => [R`{\textstyle${c}}\;{\displaystyle${c}}`, c]),
      note: { en: 'Left: the size inside a line of text. Right: the size in a formula on its own line.', zh: '左边是行内公式里的大小，右边是独立成行时的大小。' },
    },
    {
      en: 'Function names', zh: '函数名', cols: 3,
      items: list(R`\log \lg \ln \exp \sin \cos \tan \cot \sec \csc \arcsin \arccos \arctan \sinh \cosh \tanh \coth \arg \deg \dim \hom \ker \lim \limsup \liminf \max \min \sup \inf \det \gcd \Pr`),
      note: {
        en: 'Write `\\lim`, not `lim`: bare letters are read as a product of variables. On a line of their own, `\\lim` `\\limsup` `\\liminf` `\\max` `\\min` `\\sup` `\\inf` `\\det` `\\gcd` `\\Pr` put their subscript underneath.',
        zh: '要写 `\\lim` 而不是 `lim`：直接写字母会被当成几个变量相乘。独立成行时，`\\lim` `\\limsup` `\\liminf` `\\max` `\\min` `\\sup` `\\inf` `\\det` `\\gcd` `\\Pr` 的下标排在正下方。',
      },
    },
    {
      en: 'Binary operators', zh: '二元运算符', cols: 3,
      items: list(R`\cdot \times \ast \div \diamond \pm \mp \oplus \ominus \otimes \oslash \odot \bigcirc \circ \bullet \bigtriangleup \bigtriangledown \cup \cap \uplus \wedge \vee \setminus \wr \amalg \sqcup \sqcap \dagger \ddagger \triangleright \triangleleft \star`),
      note: {
        en: 'A sign is spaced as a binary operator only between two things: `b-a` but `-a`. Force either reading with braces: `{}-a` is binary, `|{-a}|` is a sign.',
        zh: '符号只有夹在两个量之间才按二元运算符留空：`b-a` 与 `-a` 不同。可以用花括号指定：`{}-a` 按二元运算符排，`|{-a}|` 按正负号排。',
      },
    },
    {
      en: 'Relations', zh: '关系符号', cols: 3,
      items: list(R`< > : \neq \leq \geq \ll \gg \equiv \sim \simeq \approx \cong \doteq \asymp \propto \in \ni \notin \subset \supset \subseteq \supseteq \sqsubseteq \sqsupseteq \prec \succ \preceq \succeq \parallel \mid \perp \vdash \dashv \models \bowtie \smile \frown`),
    },
    {
      en: 'Arrows', zh: '箭头', cols: 2,
      items: list(R`\leftarrow \rightarrow \leftrightarrow \Leftarrow \Rightarrow \Leftrightarrow \longleftarrow \longrightarrow \longleftrightarrow \Longleftarrow \Longrightarrow \Longleftrightarrow \longmapsto \hookleftarrow \hookrightarrow \leftharpoonup \leftharpoondown \rightharpoonup \rightharpoondown \rightleftharpoons \uparrow \downarrow \updownarrow \Uparrow \Downarrow \Updownarrow \nearrow \searrow \nwarrow \swarrow`),
    },
    {
      en: 'Delimiters', zh: '括号与定界符', cols: 3,
      items: list(R`( ) [ ] \{ \} | \| \langle \rangle \lceil \rceil \lfloor \rfloor / \backslash \uparrow \downarrow \updownarrow \Uparrow \Downarrow \Updownarrow`),
    },
    {
      en: 'Sizing delimiters', zh: '调整括号大小', cols: 1,
      items: [
        R`( \bigl( \Bigl( \biggl( \Biggl(`,
        R`\bigl| |a|-|b| \bigr|`,
        R`\bigl\{\, x \bigm| x>0 \,\bigr\}`,
        R`\left( \frac{a}{b} \right)^{2}`,
        R`\left. \frac{df}{dx} \right|_{x=0}`,
      ],
      note: {
        en: 'By hand: `\\big` `\\Big` `\\bigg` `\\Bigg` before the delimiter, with `l` added for an opening one, `r` for a closing one and `m` for one in the middle (`\\bigl(` … `\\bigr)`). Automatically: `\\left(` … `\\right)`; a `.` stands for a side that is not drawn. When the automatic size looks wrong, as with nested brackets, size by hand.',
        zh: '手动：在括号前加 `\\big` `\\Big` `\\bigg` `\\Bigg`，左括号再加 `l`、右括号加 `r`、中间的符号加 `m`（`\\bigl(` … `\\bigr)`）。自动：`\\left(` … `\\right)`，不想画的一侧写 `.`。自动大小不合适时（如括号嵌套），改用手动。',
      },
    },
    {
      en: 'Punctuation', zh: '标点', cols: 3,
      items: [',', ';', '.', R`\cdotp`, R`\ldotp`, R`\colon`],
      note: { en: 'A plain `:` is spaced as a relation; for a colon as punctuation write `\\colon`.', zh: '直接写 `:` 会按关系符号留空；作标点用的冒号要写 `\\colon`。' },
    },
    {
      en: 'Math fonts', zh: '数学字体', cols: 1,
      items: [
        [R`Total = \Gamma x^{2k} + 10`, 'Total = \\Gamma x^{2k} + 10'],
        ...['mathrm', 'mathit', 'mathbf', 'mathsf', 'mathtt', 'mathcal'].map(f => ['\\' + f + R`{Total = \Gamma x^{2k} + 10}`, `\\${f}{…}`]),
        [R`\boldsymbol{Total = \Gamma x^{2k} + 10}`, '\\bm{…}  (\\boldsymbol{…})'],
      ],
      note: {
        en: 'These act on Latin letters, digits and capital Greek. `\\mathit` suits variable names of several letters. `\\mathcal` has capitals only. `\\bm` needs the bm package; `\\boldsymbol` is its amsmath counterpart and the one this page understands.',
        zh: '这些命令只对拉丁字母、数字和大写希腊字母起作用。多个字母组成的变量名适合用 `\\mathit`。`\\mathcal` 只有大写。`\\bm` 需要 bm 宏包；`\\boldsymbol` 是 amsmath 里对应的命令，本页面支持的是它。',
      },
    },
    {
      en: 'Text fonts (in a document)', zh: '正文字体（用于文档）', cols: 1,
      text: [  // CSS for the sample, sample, command, use (en, zh)
        ['font-family: serif', 'Roman', R`\textrm{Roman}`, 'the default text face', '正文默认字体'],
        ['font-family: serif; font-weight: bold', 'Boldface', R`\textbf{Boldface}`, 'headings', '标题'],
        ['font-family: serif; font-style: italic', 'Italic', R`\textit{Italic}`, 'emphasis, titles of books', '强调、书名'],
        ['font-family: serif; font-style: oblique', 'Slanted', R`\textsl{Slanted}`, 'when there is no italic', '没有 Italic 时代用'],
        ['font-family: serif; font-variant: small-caps', 'Small Caps', R`\textsc{Small Caps}`, 'headings', '标题'],
        ['font-family: sans-serif', 'Sans Serif', R`\textsf{Sans Serif}`, 'headings', '标题'],
        ['font-family: monospace', 'Typewriter', R`\texttt{Typewriter}`, 'what is typed into a computer', '计算机输入'],
        ['font-family: "Noto Serif CJK JP", "Hiragino Mincho ProN", "Yu Mincho", serif', '明朝体', R`\textmc{明朝体}`, 'Japanese: the default text face', '日文：正文默认字体'],
        ['font-family: "Noto Sans CJK JP", "Hiragino Sans", "Yu Gothic", sans-serif', 'ゴシック体', R`\textgt{ゴシック体}`, 'Japanese: emphasis, headings', '日文：强调、标题'],
      ],
      note: { en: 'Each changes the font of the text in its braces. For bold Japanese, `\\textgt` is the safer choice.', zh: '这些命令改变花括号内文字的字体。日文加粗建议用 `\\textgt`。' },
    },
    {
      en: 'Text sizes (in a document)', zh: '字号（用于文档）', cols: 1,
      text: [
        ['tiny', 5], ['scriptsize', 7], ['footnotesize', 8], ['small', 9], ['normalsize', 10],
        ['large', 12], ['Large', 14.4], ['LARGE', 17.28], ['huge', 20.74], ['Huge', 24.88],
      ].map(([name, pt]) => [`font-family: serif; font-size: ${pt}pt; line-height: 1.1`, 'Sample', `\\${name}`, `${pt} pt`, `${pt} pt`]),
      note: {
        en: 'Sizes for a 10 pt document class; `\\normalsize` is the default. A size command holds from where it stands, so limit it with braces: `{\\small …}`.',
        zh: '以上是 10 pt 文档类下的大小，默认是 `\\normalsize`。字号命令从出现的位置起一直有效，所以要用花括号限定范围：`{\\small …}`。',
      },
    },
    {
      en: 'Emphasis (in a document)', zh: '强调（用于文档）', cols: 1,
      text: [['font-family: serif; font-style: italic', 'emphasis', R`\emph{emphasis}`, '', '']],
      note: { en: '`\\emph` sets Western text in italic and Japanese in Gothic; an `\\emph` inside another goes back to upright.', zh: '`\\emph` 把西文排成 Italic、日文排成ゴシック体；嵌套的 `\\emph` 会变回直立体。' },
    },
    {
      en: 'Font packages (in a document)', zh: '字体宏包（用于文档）', cols: 1,
      text: [
        ['', 'Latin Modern', R`\usepackage{lmodern}`, 'with \\usepackage[T1]{fontenc}', '配合 \\usepackage[T1]{fontenc}'],
        ['', 'Times', R`\usepackage{mathptmx}`, 'text and part of the math', '正文和部分数学符号'],
        ['', 'Times', R`\usepackage{txfonts}`, 'more math symbols, Helvetica for sans serif', '更多数学符号，无衬线为 Helvetica'],
        ['', 'Palatino', R`\usepackage{mathpazo}`, '', ''],
        ['', 'Palatino', R`\usepackage{pxfonts}`, '', ''],
        ['', 'OpenType', R`\usepackage{otf}`, 'Japanese fonts: \\UTF{hex}, \\CID{number}; option deluxe for more weights', '日文字体：\\UTF{十六进制}、\\CID{编号}；deluxe 选项提供更多字重'],
      ],
      note: { en: 'These change the text and the math fonts together.', zh: '这些宏包会同时更换正文和数学公式的字体。' },
    },
  ];

  const LABEL = {
    en: { tab: 'Reference', title: 'LaTeX reference', close: 'Close', loading: 'Loading…', source: 'Commands as listed in the University of Tokyo Hyper Workbook:' },
    zh: { tab: '速查表', title: 'LaTeX 速查表', close: '关闭', loading: '加载中…', source: '命令列表依据东京大学「はいぱーワークブック」：' },
  };
  const SOURCES = [
    ['20.8 数式の書き方 (1)', 'https://hwb.ecc.u-tokyo.ac.jp/hwb2023/applications/latex/math/'],
    ['20.6 文字修飾とフォント', 'https://hwb.ecc.u-tokyo.ac.jp/hwb2023/applications/latex/font/'],
  ];

  document.head.append(Object.assign(document.createElement('style'), { textContent: `
.ref {
  position: fixed; z-index: 40; top: 0; right: 0; bottom: 0; width: min(520px, 92vw);
  display: flex; flex-direction: column; background: var(--panel); color: var(--text);
  border-left: 1px solid var(--line); transform: translateX(100%); transition: transform .25s ease;
}
.ref.open { transform: none; box-shadow: -8px 0 28px rgba(0, 0, 0, .2); }
.ref .ref-tab {
  position: absolute; top: 108px; left: 0; transform: translateX(-100%);
  writing-mode: vertical-rl; padding: 12px 6px; border-radius: 8px 0 0 8px; border-right: 0;
  background: var(--accent); border-color: var(--accent); color: var(--on-accent);
  font-weight: 600; letter-spacing: .06em;
}
.ref .ref-tab:hover { background: var(--accent); filter: brightness(1.12); }
.ref-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--line); }
.ref-head b { font-size: 15px; }
.ref-body { flex: 1; overflow-y: auto; padding: 0 16px 28px; user-select: text; }
.ref-body h3 { margin: 20px 0 8px; font-size: 13px; font-weight: 600; color: var(--accent); }
.ref-grid { display: grid; gap: 7px 12px; align-items: center; }
.ref-item { display: flex; align-items: center; gap: 10px; min-width: 0; font-size: 16px; }
.ref-item > :first-child { flex: none; min-width: 30px; text-align: center; }
.ref-grid.c1 .ref-item > :first-child { min-width: 124px; text-align: left; }
.ref-grid.c1 .ref-item code { flex: none; }
.ref-item svg { overflow: visible; }
.ref-item code, .ref-note code { font: 11px var(--mono); }
.ref-item code { color: var(--muted); overflow-wrap: anywhere; }
.ref-item small { margin-left: auto; padding-left: 8px; font-size: 11.5px; color: var(--muted); text-align: right; }
.ref-note { margin: 10px 0 0; font-size: 12px; line-height: 1.6; color: var(--muted); }
.ref-note code { color: var(--text); }
.ref-note a { color: var(--accent); }
` }));

  const drawer = document.createElement('aside');
  drawer.className = 'ref';
  drawer.innerHTML = '<button type="button" class="ref-tab"></button><div class="ref-head"><b></b><button type="button" class="ref-close"></button></div><div class="ref-body"></div>';
  const tab = drawer.querySelector('.ref-tab'), close = drawer.querySelector('.ref-close'), body = drawer.querySelector('.ref-body');
  document.body.append(drawer);

  let built = false;  // the body is filled on first opening, once MathJax can draw

  // `like this` in a note becomes code
  function note(text) {
    const p = document.createElement('p');
    p.className = 'ref-note';
    text.split('`').forEach((part, i) => p.append(i % 2 ? Object.assign(document.createElement('code'), { textContent: part }) : part));
    return p;
  }

  function build() {
    body.textContent = '';
    for (const sec of SECTIONS) {
      body.append(Object.assign(document.createElement('h3'), { textContent: sec[lang] }));
      const grid = document.createElement('div');
      grid.className = 'ref-grid c' + sec.cols;
      grid.style.gridTemplateColumns = `repeat(${sec.cols}, minmax(0, 1fr))`;
      for (const item of sec.items || []) {
        const [tex, code = tex] = [].concat(item), row = document.createElement('div');
        row.className = 'ref-item';
        const glyph = document.createElement('span');
        glyph.append(symbolNode(tex));
        row.append(glyph, Object.assign(document.createElement('code'), { textContent: code }));
        grid.append(row);
      }
      for (const [css, sample, code, en, zh] of sec.text || []) {
        const row = document.createElement('div'), shown = document.createElement('span');
        row.className = 'ref-item';
        shown.style.cssText = css;
        shown.textContent = sample;
        row.append(shown, Object.assign(document.createElement('code'), { textContent: code }));
        const use = lang === 'zh' ? zh : en;
        if (use) row.append(Object.assign(document.createElement('small'), { textContent: use }));
        grid.append(row);
      }
      body.append(grid);
      if (sec.note) body.append(note(sec.note[lang]));
    }
    const credit = note(LABEL[lang].source + ' ');
    SOURCES.forEach(([name, url], i) => {
      credit.append(i ? ' · ' : '', Object.assign(document.createElement('a'), { textContent: name, href: url, target: '_blank', rel: 'noopener' }));
    });
    credit.style.marginTop = '24px';
    body.append(credit);
    built = true;
  }

  function label() {
    tab.textContent = LABEL[lang].tab;
    drawer.querySelector('.ref-head b').textContent = LABEL[lang].title;
    close.textContent = '×';
    close.title = LABEL[lang].close;
    if (built) build();
  }

  function toggle(open = !drawer.classList.contains('open')) {
    drawer.classList.toggle('open', open);
    if (!open || built) return;
    if (ready) { build(); return; }
    body.textContent = LABEL[lang].loading;
    const wait = setInterval(() => {
      if (ready) { clearInterval(wait); build(); }
    }, 100);
  }

  tab.onclick = () => toggle();
  close.onclick = () => toggle(false);
  addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
  addEventListener('langchange', label);
  label();
})();
