import ansiStrip from 'strip-ansi'

import { ProgressBarBlock, appendRealTimeDocument, configure, present } from '../../src'

const WRITE_ORIGINAL_STDOUT_MOCK = jest.fn()
const WRITE_ORIGINAL_STDERR_MOCK = jest.fn()

jest.mock('../../src/ORIGINAL_STDOUT', () => ({
  ORIGINAL_STDOUT: {
    write: (subject: any) => {
      WRITE_ORIGINAL_STDOUT_MOCK(subject)
    }
  }
}))
jest.mock('../../src/ORIGINAL_STDERR', () => ({
  ORIGINAL_STDERR: {
    write: (subject: any) => {
      WRITE_ORIGINAL_STDERR_MOCK(subject)
    }
  }
}))
jest.mock('../../src/getTerminalColumns', () => ({ getTerminalColumns: () => 80 }))
jest.mock('ansi-escapes', () => ({
  clearTerminal: 'clearTerminal',
  cursorHide: 'cursorHide',
  eraseDown: 'eraseDown',
  eraseLine: 'eraseLine',
  cursorMove: jest.fn((x, y) => `cursorMove(${x},${y})`),
  cursorShow: 'cursorShow'
}))

jest.useFakeTimers()

describe(ProgressBarBlock, (): void => {
  it('present components that can be animated', async (): Promise<void> => {
    const progressBar = ProgressBarBlock()

    configure({ enabled: true })
    present()

    appendRealTimeDocument('document-1', { rows: [{ blocks: [progressBar] }] })

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls).toEqual([['cursorHide']])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '|-----------------------------------------------------------------------| 0.00 %',
      'cursorMove(-999,0)'
    ])
    jest.advanceTimersToNextTimer()
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    progressBar.setProgress(50)

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '|███████████████████████████████████▏----------------------------------| 50.00 %',
      'cursorMove(-999,0)'
    ])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    progressBar.setProgress(88.5)

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '|██████████████████████████████████████████████████████████████▏-------| 88.50 %',
      'cursorMove(-999,0)'
    ])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    progressBar.setProgress(100)

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '|█████████████████████████████████████████████████████████████████████| 100.00 %',
      'cursorMove(-999,0)'
    ])

    jest.advanceTimersToNextTimer()
  })
})
