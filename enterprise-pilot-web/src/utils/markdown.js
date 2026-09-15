import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
  typographer: false
})

const defaultLinkOpen = md.renderer.rules.link_open || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

// Turn [n] in plain text into Perplexity-style citation superscripts.
function applyCites(html) {
  return html.replace(/(<[^>]+>)|(\[[0-9]+\])/g, (match, tag, cite) => {
    if (tag) return match
    if (cite) return `<sup class="cite">${cite.slice(1, -1)}</sup>`
    return match
  })
}

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'sup', 'sub', 'hr'
])

const DROP_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta'])

function sanitize(html) {
  if (typeof DOMParser === 'undefined') return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const walk = (node) => {
    for (const child of [...node.children]) {
      const tag = child.tagName.toLowerCase()
      if (DROP_TAGS.has(tag)) {
        child.remove()
        continue
      }
      if (!ALLOWED_TAGS.has(tag)) {
        child.replaceWith(...child.childNodes)
        continue
      }
      for (const attr of [...child.attributes]) {
        const name = attr.name.toLowerCase()
        if (name.startsWith('on')) child.removeAttribute(attr.name)
        else if (name === 'href' || name === 'src') {
          const val = attr.value.trim().toLowerCase()
          if (val.startsWith('javascript:') || val.startsWith('data:text/html')) child.removeAttribute(attr.name)
        }
      }
      walk(child)
    }
  }
  walk(doc.body)
  return doc.body.innerHTML
}

export function renderRich(text, opts = {}) {
  if (!text) return ''
  let html = md.render(text)
  if (opts.cites) html = applyCites(html)
  return sanitize(html)
}
