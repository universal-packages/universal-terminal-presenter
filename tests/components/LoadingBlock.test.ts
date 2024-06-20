import ansiStrip from 'strip-ansi'

import { LoadingBlock, appendRealTimeDocument, configure, present } from '../../src'

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

describe(LoadingBlock, (): void => {
  it('present components that can be animated', async (): Promise<void> => {
    const loadingBlock = LoadingBlock()

    configure({ enabled: true })
    present()
    appendRealTimeDocument('document-1', { rows: [{ blocks: [loadingBlock] }] })

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls).toEqual([['cursorHide']])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '⣷                                                                               ',
      'cursorMove(-999,0)'
    ])
    jest.advanceTimersToNextTimer()
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '⡿                                                                               ',
      'cursorMove(-999,0)'
    ])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    loadingBlock.setStatus('complete')

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '✔                                                                               ',
      'cursorMove(-999,0)'
    ])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    loadingBlock.setStatus('warning')

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '⚠                                                                               ',
      'cursorMove(-999,0)'
    ])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    loadingBlock.setStatus('error')

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '✖                                                                               ',
      'cursorMove(-999,0)'
    ])

    jest.advanceTimersToNextTimer()
  })
})
