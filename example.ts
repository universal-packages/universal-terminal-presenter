import { TerminalPresenter, TimeWatchBlock } from './src'

function example() {
  const terminalPresenter = new TerminalPresenter()

  terminalPresenter.captureConsole()

  new TerminalPresenter()

  terminalPresenter.appendRealTimeDocument('doc-1', {
    rows: [{ border: true, borderStyle: 'dash-2-thick', borderColor: 'aquamarine', blocks: [{ text: 'Hello world!' }, TimeWatchBlock()] }]
  })

  terminalPresenter.present()

  const consolePrinterInterval = setInterval(
    () => {
      console.warn({ random: Math.random() })
      console.error(new Error('Random error'))
      console.table({ random: Math.random() })
    },
    Math.random() * 1000 + 200
  )

  process.on('SIGINT', async () => {
    console.info('Stopping...')
    clearInterval(consolePrinterInterval)
    await terminalPresenter.restore()
  })
}

example()
