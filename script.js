const lsKey = 'sh-state'
const state = {
  text: '',
  designations: []
}

const templates = {}
const mainView = document.querySelector('main')

prepareTemplates()

templates.select.onsubmit = handleSelect
templates.designate.onchange = handleToggleColor
templates.designate.onsubmit = handleDesignate

body.onclick = handleClick

loadDesignations()
// loadExampleState() // TODO: remove
// loadEmptyState() // TODO: remove
fill(mainView, state)

function fill(view, subState) {
  const {id, text} = subState
  const markup = subStateToMarkup(subState)
  const form = view.querySelector('form')
  const code = view.querySelector('code')

  form.id.value = id || ''
  form.text.value = text
  code.innerHTML = markup

  if (id) {
    const {kind, role} = 
      subState.designations.find(d => d.id == id)
    
    form.kindrole.value = [kind, role].filter(Boolean).join(', ')
  }
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

function handleToggleColor(e) {
  const box = e.target

  if (!box.matches(':has(~[type=color])')) return

  const input = box.parentElement.lastElementChild

  input.disabled = !box.checked
}

function handleClick(e) {
  if (
    e.target.matches('button')
  ) {
    const btn = e.target

    if (btn.value == 'edit') return handleEdit(e)
    if (btn.value == 'delete') return handleDelete(e)
    if (btn.value == 'designate') return handleCreate(e)

  } else if (
    e.target.matches(':not(button)>pre span')
  ) {
    const selection = getSelection()

    if (!selection.isCollapsed) return

    const span = e.target

    if (span.matches('.top')) return
    
    const ids = getDesignationIds(span)
    const subStates = ids.map(getSubState)

    return showDialog('select', { subStates })
  }
}

function handleDelete(e) {
  const form = e.target.closest('form')
  const id = form.id.value
  const index = state.designations.findIndex(d => d.id == id)

  state.designations.splice(index, 1)
  saveDesignations()
  fill(mainView, state)
}

function handleDesignate(e) {
  if (e.submitter.value == 'cancel') return
  
  const form = e.target
  const id = crypto.randomUUID()
  const start = +form.start.value
  const end = +form.end.value
  const text = form.text.value
  const kind = form.kind.value
  const role = form.role.value
  const colored = form.colored.checked
  const color = colored ? form.color.value : ''
  const designation = { id, start, end, text, kind, role, color }

  state.designations.push(designation)
  saveDesignations()
  fill(mainView, state)
}

function handleSelect(e) {
  const form = e.target
  const btn = e.submitter

  if (btn.value === 'cancel') return

  const id = btn.value
  const subState = getSubState(id)

  showDialog('sub-view', { subState })
}

function handleCreate(e) {
  const form = e.target.closest('form')
  const fragment = getSelectedFragment(getSelection())

  if (!fragment) return

  const { text, start, end } = fragment

  if (wouldConflict(start, end)) return

  showDialog('designate', { text, start, end })
}

function wouldConflict(start, end) {
  return state.designations.some(d => {
    return start == d.start && end == d.end
      || start < d.start && end > d.start && end < d.end
      || start > d.start && start < d.end && end > d.end
  })
}

function getDesignationIds(span) {
  const ids = []

  while (span.matches('span')) {
    ids.push(span.dataset.id)
    span = span.parentElement
  }

  return ids
}

function getSubState(id) {
  const designation = state.designations.find(d => d.id == id)
  const { text, start, end } = designation
  const designations = state.designations.filter(
    d => d.start >= start && d.end <= end
  )
  const data = { id, text, designations }

  return data
}

function handleEdit(e) {
  const form = e.target.closest('form')
  const id = form.id?.value
  const text = form.text?.value

  showDialog('edit', { id, text, form })
}

function showDialog(type, props) {
  let dialog = templates[type]

  if (type == 'edit') {
    const { id, text } = props

    dialog = dialog.cloneNode(true)

    const form = dialog.querySelector('form')

    if (id) form.id.value = id
    if (text) form.text.value = text

  } else if (type == 'select') {
    const { subStates } = props
    const form = dialog.querySelector('form')
    const designationList = dialog.querySelector('ul')
    const items = subStates.map(makeDesignationItem)

    designationList.replaceChildren(...items)

  } else if (type == 'sub-view') {
    const { subState } = props

    dialog = dialog.cloneNode(true)
    fill(dialog, subState)

  } else if (type == 'designate') {
    const { text, start, end } = props
    const form = dialog.querySelector('form')
    const code = form.querySelector('code')

    form.start.value = start
    form.end.value = end
    form.text.value = text
    code.innerHTML = subStateToMarkup({ text })
  }

  document.body.appendChild(dialog).showModal()
}

function makeDesignationItem(data) {
  const item = templates['designation'].cloneNode(true)
  const btn = item.querySelector('button')
  const code = btn.querySelector('code')

  btn.value = data.id
  code.innerHTML = subStateToMarkup(data)

  return item
}

function subStateToMarkup(state) {
  const { id, text, designations = [] } = state

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

        if (d.start == start && d.end == start + text.length) html += ` class="top"`
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
  let container = range.commonAncestorContainer
  if (!container.closest) container = container.parentElement
  const code = container.closest('code')

  if (!code) return null

  const form = code.closest('form')
  const id = form.id?.value


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

function loadEmptyState() {
  state.text = 'console.log(4)'
  state.designations = [

  ]
}
