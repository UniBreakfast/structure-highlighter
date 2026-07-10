const lsKey1 = 'sh-state'
const lsKey2 = 'sh-palette'
const state = { text: '', designations: [] }
const palette = { kinds: [], roles: [], colors: [] }
const templates = {}
const mainView = document.querySelector('main')

let currentItem = null

prepareTemplates()

body.onmousemove = () => currentItem = null
body.onchange = handleToggleColor
body.onclick = handleClick

mainView.onsubmit = handleMainView
templates.edit.onsubmit = handleUpdate
templates.select.onsubmit = handleSelect
templates.designate.onsubmit = handleDesignate
templates.palette.onclick = handleAddToPalette
templates.palette.onkeydown = handleAdjustPalette
templates.palette.oncontextmenu = handleRemoveFromPalette

loadPalette()
loadDesignations()
fill(mainView, state)

function loadPalette() {
  const json = localStorage.getItem(lsKey2)

  if (json) Object.assign(palette, JSON.parse(json))
}

function savePalette() {
  localStorage.setItem(lsKey2, JSON.stringify(palette))
}

function loadDesignations() {
  const json = localStorage.getItem(lsKey1)

  if (json) Object.assign(state, JSON.parse(json))
}

function saveDesignations() {
  localStorage.setItem(lsKey1, JSON.stringify(state))
}

function fill(view, subState) {
  const { id, text } = subState
  const markup = subStateToMarkup(subState)
  const form = view.querySelector('form')
  const code = view.querySelector('code')

  form.id.value = id || ''
  form.text.value = text
  code.innerHTML = markup

  if (id) {
    const { kind, role } =
      subState.designations.find(d => d.id == id)

    form.kindrole.value = [kind, role].filter(Boolean).join(', ')
  }
}

function fillAllViews() {
  const subViews =
    document.querySelectorAll('dialog:has(>form>pre)')

  for (const view of subViews) {
    const form = view.querySelector('form')
    const id = form.id.value
    const subState = getSubState(id)

    if (!subState) continue

    fill(view, subState)
  }

  fill(mainView, state)
}

function prepareTemplates() {
  const templateElements = document.querySelectorAll('template')

  for (const template of templateElements) {
    const { title } = template
    const element = template.content.firstElementChild

    templates[title] = element
    template.remove()

    if (element.matches('dialog')) element.className = title
  }
}

function preparePalette(list, key, value) {
  const input = list.parentElement.querySelector('div>input')
  const labels = palette[key]
  const items = labels.map(label => {
    const item = document.createElement('li')
    const btn = document.createElement('button')

    btn.value = btn.innerText = label
    item.append(btn)

    return item
  })

  list.replaceChildren(...items)
  list.classList.toggle('colors', key == 'colors')
  input.type = key == 'colors' ? 'color' : 'text'
  input.value = key == 'colors' ? '#ffffff' : ''

  if (!labels.includes(value)) input.value = value
}

function handleMainView(e) {
  const btn = e.submitter

  if (btn.value == 'export-state') return exportData(state)
  if (btn.value == 'import-state') return importData(state)
  if (btn.value == 'export-palette') return exportData(palette)
  if (btn.value == 'import-palette') return importData(palette)
  if (btn.value == 'list') return listAllDesignations()
}

function handleToggleColor(e) {
  const box = e.target

  if (!box.matches(':has(~[type=color])')) return

  const input = box.nextElementSibling.nextElementSibling
  const btn = input.nextElementSibling

  input.disabled = btn.disabled = !box.checked
}

function handleClick(e) {
  if (
    e.target.matches('button')
  ) {
    const btn = e.target

    if (btn.value == 'edit') return handleEdit(e)
    if (btn.value == 'delete') return handleDelete(e)
    if (btn.value == 'select') return handleSelectValue(e)
    if (btn.value == 'designate') return handleCreate(e)

  } else if (
    e.target.matches(':not(button)>pre span')
  ) {
    const selection = getSelection()

    if (!selection.isCollapsed) return

    const span = e.target

    if (span.matches('dialog .top')) return

    const ids = getDesignationIds(span)
    const subStates = ids.map(getSubState)

    if (ids.length == 1) return showDialog('sub-view', { subState: subStates[0] })

    showDialog('select', { subStates })
  }
}

function handleEdit(e) {
  e.preventDefault()

  const form = e.target.closest('form')
  const id = form.id?.value
  const text = form.text?.value
  const designation = state.designations.find(d => d.id == id)
  const { kind, role, color } = designation || {}

  showDialog('edit', { id, text, kind, role, color })
}

function handleUpdate(e) {
  const btn = e.submitter

  if (btn.value != 'update') return

  const form = e.target
  const id = form.id.value
  const text = form.text.value
  const { designations } = state

  if (id) {
    const designation = designations.find(d => d.id == id)

    designation.kind = form.kind.value.trim()
    designation.role = form.role.value.trim()
    designation.color =
      form.colored.checked ? form.color.value : ''

    if (text == designation.text) {
      saveDesignations()
      fillAllViews()

      return
    }

    const { start, end } = designation
    const shift = text.length - designation.text.length

    for (let i = designations.length - 1; i >= 0; i--) {
      const d = designations[i]

      if (d.start >= start && d.end <= end && (d.start != start || d.end != end)) {
        designations.splice(i, 1)
      }
    }

    for (const d of designations) {
      if (d.start >= end) {
        d.start += shift
        d.end += shift
      } else if (d.end >= end) {
        d.end += shift
      }
    }

    state.text =
      state.text.slice(0, start) + text + state.text.slice(end)

    for (let i = designations.length - 1; i >= 0; i--) {
      const d = designations[i]

      d.text = state.text.slice(d.start, d.end)

      if (!d.text) designations.splice(i, 1)
    }
  } else {
    state.text = text
    state.designations = []
  }

  saveDesignations()
  fillAllViews()
}

function handleDelete(e) {
  const form = e.target.closest('form')
  const id = form.id.value
  const index = state.designations.findIndex(d => d.id == id)

  state.designations.splice(index, 1)
  saveDesignations()
  fillAllViews()
}

function handleDesignate(e) {
  if (e.submitter.value == 'cancel') return

  const form = e.target
  const id = crypto.randomUUID()
  const start = +form.start.value
  const end = +form.end.value
  const text = form.text.value
  const kind = form.kind.value.trim()
  const role = form.role.value.trim()
  const colored = form.colored.checked
  const color = colored ? form.color.value : ''
  const designation = { id, start, end, text, kind, role, color }

  state.designations.push(designation)
  saveDesignations()
  fillAllViews()
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
  e.preventDefault()

  const form = e.target.closest('form')
  const fragment = getSelectedFragment(getSelection())

  if (!fragment) return

  const { text, start, end } = fragment

  if (wouldConflict(start, end)) return

  showDialog('designate', { text, start, end })
}

function handleSelectValue(e) {
  const btn = e.target
  const input = btn.previousElementSibling
  const { name } = input

  showDialog('palette', { input, name })
}

function handleAddToPalette(e) {
  const btn = e.target

  if (btn.value != 'add') return

  const input = btn.previousElementSibling
  const form = input.closest('form')
  const list = form.querySelector('ul')
  const key = form.key.value
  const arr = palette[key]
  const value = input.value.trim()

  if (!value || arr.includes(value)) return

  arr.push(value)
  savePalette()
  preparePalette(list, key)
  form.reset()
}

function handleAdjustPalette(e) {
  const dialog = e.currentTarget
  const item = currentItem || dialog.querySelector('li:has(:hover)')

  if (!item || e.key != 'ArrowUp' && e.key != 'ArrowDown') return

  const form = item.closest('form')
  const list = form.querySelector('ul')
  const key = form.key.value
  const arr = palette[key]
  const items = Array.from(list.children)
  const i = items.indexOf(item)
  const j = e.key == 'ArrowUp' ? i - 1 : i + 1

  if (!(j in arr)) return

  [arr[i], arr[j]] = [arr[j], arr[i]]

  preparePalette(list, key)
  savePalette()
  dialog.focus()
  currentItem = list.children[j]
}

function handleRemoveFromPalette(e) {
  if (!e.target.matches('li>button')) return

  const item = e.target.closest('li')
  const form = item.closest('form')
  const list = form.querySelector('ul')
  const key = form.key.value
  const arr = palette[key]
  const i = Array.from(list.children).indexOf(item)

  arr.splice(i, 1)
  preparePalette(list, key)
  savePalette()
  currentItem = null
  e.preventDefault()
}

function listAllDesignations() {
  const designations = state.designations.toSorted((a, b) => (a.start - b.start) || (b.end - a.end))
  const ids = designations.map(d => d.id)
  const subStates = ids.map(getSubState)

  showDialog('select', { subStates })
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

  while (span.matches('span:not(dialog .top)')) {
    ids.push(span.dataset.id)
    span = span.parentElement
  }

  return ids
}

function getSubState(id) {
  const designation = state.designations.find(d => d.id == id)

  if (!designation) return

  const { text, start, end } = designation
  const designations = state.designations.filter(
    d => d.start >= start && d.end <= end
  )
  const data = { id, text, designations }

  return data
}

function showDialog(type, props) {
  let dialog = templates[type]

  if (type == 'edit') {
    const { id, text, kind, role, color } = props
    const form = dialog.querySelector('form')

    if (id) form.id.value = id
    else form.id.removeAttribute('value')

    form.text.value = text || ''
    form.kind.value = kind || ''
    form.role.value = role || ''
    form.colored.checked = !!color
    form.color.value = color || ''
    form.color.disabled = !color
    form.color.nextElementSibling.disabled = !color

  } else if (type == 'select') {
    const { subStates } = props
    const form = dialog.querySelector('form')
    const designationList = dialog.querySelector('ul')
    const items = subStates.map(makeDesignationItem)

    designationList.replaceChildren(...items)

  } else if (type == 'sub-view') {
    const { subState } = props

    dialog = dialog.cloneNode(true)
    dialog.onclose = () => dialog.remove()
    fill(dialog, subState)

  } else if (type == 'designate') {
    const { text, start, end } = props
    const form = dialog.querySelector('form')
    const code = form.querySelector('code')

    form.start.value = start
    form.end.value = end
    form.text.value = text
    code.innerHTML = subStateToMarkup({ text })
  } else if (type == 'palette') {
    const { input, name } = props
    const form = dialog.querySelector('form')
    const ul = form.querySelector('ul')

    preparePalette(ul, name + 's', input.value)

    form.key.value = name + 's'
    form.onsubmit = (e) => {
      if (e.submitter.value != 'cancel') {
        input.value = e.submitter.value
      }
    }
  }

  document.body.appendChild(dialog).showModal()
}

function makeDesignationItem(subState) {
  const item = templates['designation'].cloneNode(true)
  const btn = item.querySelector('button')
  const code = btn.querySelector('code')
  const { id } = subState
  const designation = state.designations.find(d => d.id == id)
  const { kind, role } = designation

  btn.value = id
  btn.name = [kind, role].filter(Boolean).join(', ')
  code.innerHTML = subStateToMarkup(subState)

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
  if (selection.isCollapsed) return null

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
    end += designation.start
  }

  return { text, start, end }
}

function calcOffset(startNode, node, nodeOffset) {
  const range = document.createRange()

  range.setStart(startNode, 0)
  range.setEnd(node, nodeOffset)

  return range.toString().length
}

function exportData(data) {
  const a = document.createElement('a')

  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  a.download = 'data.json'
  a.click()
}

function importData(data) {
  const input = document.createElement('input')

  input.type = 'file'
  input.accept = 'application/json'
  input.onchange = () => {
    const reader = new FileReader()
    const file = input.files[0]

    if (!file) return

    reader.onload = () => {
      Object.assign(data, JSON.parse(reader.result)),
        (data == state ? saveDesignations : savePalette)()
      if (data == state) fill(mainView, state)
    }

    reader.readAsText(file)
  }

  input.click()
}
