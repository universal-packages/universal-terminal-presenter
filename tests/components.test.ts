import ansiStrip from 'strip-ansi'

import { LoadingBlock, ProgressBar, TerminalPresenter } from '../src'
import { writeStdout } from '../src/writeStdout'

jest.mock('../src/writeStdout', () => ({ writeStdout: jest.fn() }))
jest.mock('ansi-escapes', () => ({
  clearTerminal: 'clearTerminal',
  cursorHide: 'cursorHide',
  eraseDown: 'eraseDown',
  eraseLine: 'eraseLine',
  cursorMove: jest.fn((x, y) => `cursorMove(${x},${y})`),
  cursorShow: 'cursorShow'
}))

process.stdout.columns = 80

jest.useFakeTimers()

describe(TerminalPresenter, (): void => {
  it('present components that can be animated', async (): Promise<void> => {
    const writeStdoutMock = writeStdout as jest.Mock

    const terminalPresenter = new TerminalPresenter()
    const loadingBlock = LoadingBlock()
    const progressBar = ProgressBar()

    terminalPresenter.start()

    terminalPresenter.appendDocument('document-1', { rows: [{ blocks: [loadingBlock, progressBar] }] })

    expect(writeStdoutMock.mock.calls).toEqual([['cursorHide']])
    jest.clearAllMocks()

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '⣷ |---------------------------------------------------------------------| 0.00 %',
      'cursorMove(-999,0)'
    ])
    jest.advanceTimersToNextTimer()
    jest.clearAllMocks()

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '⣯ |---------------------------------------------------------------------| 0.00 %',
      'cursorMove(-999,0)'
    ])
    jest.clearAllMocks()

    loadingBlock.setStatus('complete')
    progressBar.setProgress(50)

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '✔ |██████████████████████████████████▏---------------------------------| 50.00 %',
      'cursorMove(-999,0)'
    ])
    jest.clearAllMocks()

    loadingBlock.setStatus('warning')
    progressBar.setProgress(88.5)

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '⚠ |████████████████████████████████████████████████████████████▎-------| 88.50 %',
      'cursorMove(-999,0)'
    ])
    jest.clearAllMocks()

    loadingBlock.setStatus('error')
    progressBar.setProgress(100)

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '✖ |███████████████████████████████████████████████████████████████████| 100.00 %',
      'cursorMove(-999,0)'
    ])

    jest.advanceTimersToNextTimer()
  })
})
