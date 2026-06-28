const lsKey = 'sh-state'
const state = {
  text: '',
  designations: []
}

const mainView = document.querySelector('pre')

body.onclick = handleClick

loadDesignations()
loadExampleState() // TODO: remove
render(mainView)

function loadDesignations() {
  const json = localStorage.getItem(lsKey)

  if (json) Object.assign(state, JSON.parse(json))
}

function saveDesignations() {
  localStorage.setItem(lsKey, JSON.stringify(state))
}

function render(view, id = null) {
  let {text, designations} = state

  if (id) {
    const designation = getDesignation(id)
    const {start, end} = designation

    text = designation.text
    designations = designations.filter(
      d => d.start >= start && d.end <= end
    )
  }
  
  
  
   
}

function handleClick(e) {
  if (e.target.matches('button.edit')) return handleEdit(e)
}

function handleEdit(e) {
  const form = e.target.closest('form')
  const id = form.id?.value

  if (!id) return showDialog('edit', { text: state.text })

  const { text } = getDesignation(id)

  showDialog('edit', { id, text })
}

function loadExampleState() {
  state.text = 'console.log(4)'
  state.designations = [
    { id: 1, start: 0, end: 7, text: 'console', kind: 'identifier', role: 'property source provider', color: '#8ed6f3' },
    { id: 2, start: 0, end: 11, text: 'console.log', kind: 'property reading expression', role: 'method provider', color: '' },
    { id: 3, start: 0, end: 14, text: 'console.log(4)', kind: 'method call expression', role: '', color: '' },
    { id: 4, start: 7, end: 8, text: '.', kind: 'dot operator', role: 'property accessor', color: '' },
    { id: 5, start: 8, end: 11, text: 'log', kind: 'identifier', role: 'property name provider', color: '#fce44b' },
    { id: 6, start: 11, end: 12, text: '(', kind: 'function call operator', role: 'method invoker', color: '' },
    { id: 7, start: 12, end: 13, text: '4', kind: 'numeric literal', role: 'argument provider', color: '#24ff37' },
    { id: 8, start: 13, end: 14, text: ')', kind: 'function call operator', role: 'method invoker', color: '' },
  ]
}

function stateToMarkup(state) {
  const { text, designations } = state

  const opens = new Map()
  const closes = new Map()

  for (const d of designations) {
    if (!opens.has(d.start)) opens.set(d.start, [])
    if (!closes.has(d.end)) closes.set(d.end, [])

    opens.get(d.start).push(d)
    closes.get(d.end).push(d)
  }

  for (const list of opens.values()) {
    list.sort((a, b) => {
      const lenA = a.end - a.start
      const lenB = b.end - b.start

      if (lenA !== lenB) return lenB - lenA
      return a.id - b.id
    })
  }

  for (const list of closes.values()) {
    list.sort((a, b) => {
      const lenA = a.end - a.start
      const lenB = b.end - b.start

      if (lenA !== lenB) return lenA - lenB
      return b.id - a.id
    })
  }

  let html = ''

  for (let i = 0; i <= text.length; i++) {
    if (opens.has(i)) {
      for (const d of opens.get(i)) {
        html += `<span dsgn-id="${d.id}"`

        if (d.color) {
          html += ` style="color: ${d.color}"`
        }

        html += '>'
      }
    }

    if (i < text.length) {
      html += escapeHtml(text[i])
    }

    if (closes.has(i + 1)) {
      for (const d of closes.get(i + 1)) {
        html += '</span>'
      }
    }
  }

  return html
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

console.log(stateToMarkup(state))
