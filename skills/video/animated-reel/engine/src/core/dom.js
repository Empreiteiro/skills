// DOM helpers for animated typography. Nothing here animates on its own: the shot writes the styles on every
// frame from t (no CSS transitions or animations).

export function el(parent, cls = '', html = null, tag = 'div') {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (html != null) d.innerHTML = html;
  parent.appendChild(d);
  return d;
}

/** Splits the element's text into one <span class="ch"> per letter; returns the spans. */
export function letters(node, text) {
  node.textContent = '';
  return [...text].map(ch => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = ch === ' ' ? ' ' : ch;
    node.appendChild(s);
    return s;
  });
}

/** Splits into words (one span.ch per word, with the spaces between them preserved). */
export function words(node, text) {
  node.textContent = '';
  const out = [];
  text.split(' ').forEach((w, i, arr) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = w;
    node.appendChild(s);
    out.push(s);
    if (i < arr.length - 1) node.appendChild(document.createTextNode(' '));
  });
  return out;
}

export function css(node, o) {
  for (const k in o) node.style[k] = o[k];
  return node;
}

/** Shortcut: transform + opacity in one call. */
export function tf(node, transform, opacity = 1) {
  node.style.transform = transform;
  node.style.opacity = opacity;
}
