import { spawn } from 'node:child_process'
import blessed from 'blessed'
import { copy } from 'copy-paste'

const screen = blessed.screen({
  smartCSR: true,
  fullUnicode: true,
  terminal: 'xterm-256color',
})
screen.title = 'Blessed Typescript'

const list = blessed.list({
  scrollable: true,
  items: ['✓ Backend', '/ Frontend 1', '/ Frontend 2', '✗ Frontend 3', '✓ Frontend 4'],
  width: '20%',
  label: 'Services',
  height: '100%-1',
  border: { type: 'line' },
  vi: true,
  keys: true,
  style: {
    selected: {
      bg: 'magenta',
      fg: 'white',
    },
    focus: {
      border: {
        fg: 'magenta',
      },
    },
  },
  mouse: true,
})

setInterval(() => {
  for (let i = 0; i < list.children.length; i++) {
    const item = list.getItem(i)
    if (!item)
      continue
    const text = item.getText()
    if (text.startsWith('/'))
      item.setText(`\\${text.slice(1)}`)
    else if (text.startsWith('\\'))
      item.setText(`/${text.slice(1)}`)
  }

  screen.render()
}, 500)

const logs = blessed.log({
  width: '80%',
  height: '100%-1',
  right: 0,
  border: { type: 'line' },
  label: 'Logs',
  vi: true,
  keys: true,
  style: {
    focus: {
      border: {
        fg: 'magenta',
      },
    },
  },
  scrollbar: {
    ch: ' ',
    track: {
      bg: 'magenta',
    },
    style: {
      inverse: true,
    },
  },
  mouse: true,
})

const listbar = blessed.listbar({
  width: '100%',
  height: 'shrink',
  bottom: 0,
  mouse: true,
  commands: {
    // @ts-expect-error - This is a bug in the typings
    Quit: {
      keys: ['escape', 'C-c'],
      callback() {
        screen.destroy()
      },
    },
  },
})

const child = spawn('npm run dev', { shell: true, cwd: '/home/costin/genezio/genezio-projects/yaml-vars/client', stdio: 'pipe' })
child.on('exit', (code) => {
  logs.pushLine(`Exited with code ${code}`)
  screen.render()
})
child.stdout.on('data', (data) => {
  logs.pushLine(data.toString())
  screen.render()
})
child.stderr.on('data', (data) => {
  logs.pushLine(data.toString())
  screen.render()
})

// Pipe logs input to the child
let dragging = false
let dragStart: { x: number, y: number } | undefined
logs.on('mouse', (event: { action: 'mousedown' | 'mouseup', button: 'left' | 'right' | 'middle', x: number, y: number }) => {
  // logs.pushLine(`Mouse event: ${event.action} ${event.button} ${event.x} ${event.y}`)
  if (!dragging && event.action === 'mousedown' && event.button === 'left') {
    dragging = true
    dragStart = { x: event.x, y: event.y }
  }
  if (dragging && dragStart && event.action === 'mouseup' && event.button === 'left') {
    const dragEnd = { x: event.x, y: event.y }
    if (dragEnd.x < dragStart.x)
      [dragEnd.x, dragStart.x] = [dragStart.x, dragEnd.x]

    if (dragEnd.y < dragStart.y)
      [dragEnd.y, dragStart.y] = [dragStart.y, dragEnd.y]

    if (dragEnd.x !== dragStart.x || dragEnd.y !== dragStart.y) {
      logs.pushLine(`Copying text from ${dragStart.x} ${dragStart.y} to ${dragEnd.x} ${dragEnd.y}`)
      copy(screen.screenshot(dragStart.x, dragEnd.x, dragStart.y, dragEnd.y + 1))

      const selection = blessed.box({
        width: dragEnd.x - dragStart.x,
        height: dragEnd.y - dragStart.y + 1,
        top: dragStart.y,
        left: dragStart.x,
        style: {
          bg: 'yellow',
          transparent: true,
        },
      })
      screen.append(selection)
      setTimeout(() => { screen.remove(selection); screen.render() }, 300)
    }

    dragging = false
    dragStart = undefined
  }
})
list.on('mouse', () => {
  dragging = false
  dragStart = undefined
})
listbar.on('mouse', () => {
  dragging = false
  dragStart = undefined
})

screen.append(list)
screen.append(logs)
screen.append(listbar)

list.focus()

screen.render()
