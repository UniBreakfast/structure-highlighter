console.log(4)

state = {
  text: 'console.log(4)',
  designations: [
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

/* html */`
<pre>
  <span dsgn-id="3">
    <span dsgn-id="2">
      <span dsgn-id="1" style="color: #8ed6f3">console</span>
      <span dsgn-id="4">.</span>
      <span dsgn-id="5" style="color: #fce44b">log</span>
    </span>
    <span dsgn-id="6">(</span>
      <span dsgn-id="7" style="color: #24ff37">4</span>
    <span dsgn-id="8">)</span>
  </span>
</pre>
`
