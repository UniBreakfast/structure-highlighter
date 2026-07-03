const lsKey = 'sh-state'
const state = {
  text: '',
  designations: []
}

const templates = {}
const mainView = document.querySelector('main')

body.onclick = handleClick

prepareTemplates()
loadDesignations()
loadExampleState() // TODO: remove
fill(mainView, state)

function fill(view, data) {
  const markup = setOfDataToMarkup(data)
  const form = view.querySelector('form')
  const code = view.querySelector('code')

  form.text.value = data.text
  code.innerHTML = markup
}

function prepareTemplates() {
  const templateElements = document.querySelectorAll('template')

  for (const template of templateElements) {
    const { title } = template

    templates[title] = template.content.firstElementChild
    template.remove()
  }
}

function loadDesignations() {
  const json = localStorage.getItem(lsKey)

  if (json) Object.assign(state, JSON.parse(json))
}

function saveDesignations() {
  localStorage.setItem(lsKey, JSON.stringify(state))
}

function handleClick(e) {
  if (e.target.matches('button')) {
    const btn = e.target

    if (btn.value === 'edit') return handleEdit(e)
  }

  if (e.target.matches(':not(button)>pre span')) {
    const span = e.target
    const ids = getDesignationIds(span)
    const setsOfData = ids.map(getSetOfData)
    const props = { setsOfData }
    
    return showDialog('select', props)
  }
}

function getDesignationIds(span) {
  const ids = []

  while (span.matches('span')) {
    ids.push(span.dataset.id)
    span = span.parentElement
  }

  return ids
}

function getSetOfData(id) {
  const designation = state.designations.find(d => d.id == id)
  const {text, start, end} = designation
  const designations = state.designations.filter(
    d => d.start >= start && d.end <= end
  )
  const data = {id, text, designations}
  
  return data
}

function handleEdit(e) {
  const form = e.target.closest('form')
  const id = form.id?.value
  const text = form.text?.value
  const props = { id, text, form }

  showDialog('edit', props)
}

function showDialog(type, props) {
  const dialog = templates[type].cloneNode(true)

  if (type == 'edit') {
    const form = dialog.querySelector('form')

    if (props.id) form.id.value = props.id
    if (props.text) form.text.value = props.text

  } else if (type == 'select') {
    const form = dialog.querySelector('form')
    const designationList = dialog.querySelector('ul')
    const items = props.setsOfData.map(makeDesignationItem)

    designationList.replaceChildren(...items)
  }

  document.body.appendChild(dialog).showModal()
}

function makeDesignationItem(data) {
  const item = templates['designation'].cloneNode(true)
  const btn = item.querySelector('button')
  const code = btn.querySelector('code')

  btn.value = data.id
  code.innerHTML = setOfDataToMarkup(data)
  
  return item
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

function setOfDataToMarkup(state) {
  const { id, text, designations } = state

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

      if (lenA != lenB) return lenB - lenA

      return a.id - b.id
    })
  }

  for (const list of closes.values()) {
    list.sort((a, b) => {
      const lenA = a.end - a.start
      const lenB = b.end - b.start

      if (lenA != lenB) return lenA - lenB

      return b.id - a.id
    })
  }

  let html = ''
  let start = !id ? 0 : designations.find(d => d.id == id).start

  for (let i = start; i <= start + text.length; i++) {
    if (opens.has(i)) {
      for (const d of opens.get(i)) {
        html += `<span data-id="${d.id}"`

        if (d.color) html += ` style="color: ${d.color}"`

        html += '>'
      }
    }

    if (i - start < text.length) {
      html += escapeHtml(text[i - start])
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

function getSelectedFragment(selection) {
  const range = selection.getRangeAt(0)
  const text = selection.toString()
  const code = range.commonAncestorContainer.closest('code')
  const form = code.closest('form')
  const id = form.id?.value

  if (!code) return null

  let start = calcOffset(code, range.startContainer, range.startOffset)
  let end = calcOffset(code, range.endContainer, range.endOffset)

  if (id) {
    const designation = state.designations.find(d => d.id == id)

    start += designation.start
    end += designation.end
  }

  return { text, start, end }
}

function calcOffset(startNode, node, nodeOffset) {
  const range = document.createRange()

  range.setStart(startNode, 0)
  range.setEnd(node, nodeOffset)

  return range.toString().length
}
