import ansiStrip from 'strip-ansi'

import { TerminalPresenter } from '../../../src'
import { TimeWatchBlock } from '../../../src/components/TimeWatchBlock'

const WRITE_ORIGINAL_STDOUT_MOCK = jest.fn()
const WRITE_ORIGINAL_STDERR_MOCK = jest.fn()

jest.mock('../../../src/ORIGINAL_STDOUT', () => ({
  ORIGINAL_STDOUT: {
    write: (subject: any) => {
      WRITE_ORIGINAL_STDOUT_MOCK(subject)
    }
  }
}))
jest.mock('../../../src/ORIGINAL_STDERR', () => ({
  ORIGINAL_STDERR: {
    write: (subject: any) => {
      WRITE_ORIGINAL_STDERR_MOCK(subject)
    }
  }
}))
jest.mock('../../../src/getTerminalColumns', () => ({ getTerminalColumns: () => 80 }))
jest.mock('ansi-escapes', () => ({
  clearTerminal: 'clearTerminal',
  cursorHide: 'cursorHide',
  eraseDown: 'eraseDown',
  eraseLine: 'eraseLine',
  cursorMove: jest.fn((x, y) => `cursorMove(${x},${y})`),
  cursorShow: 'cursorShow'
}))

jest.useFakeTimers()

describe(TimeWatchBlock, (): void => {
  it('can go in reverse', async (): Promise<void> => {
    Date.now = () => 0

    const timeWatch = TimeWatchBlock({ targetTime: 1000 * 60 * 60 * 24 + 1000 * 60 * 60 + 1000 * 60 * 8 + 5000 })
    const terminalPresenter = new TerminalPresenter({ enabled: true })
    terminalPresenter.present()
    terminalPresenter.appendRealTimeDocument('document-1', { rows: [{ blocks: [timeWatch] }] })

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls).toEqual([['cursorHide']])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '01d 01h 08m 05s                                                                 ',
      'cursorMove(-999,0)'
    ])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    Date.now = () => 1000

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '01d 01h 08m 04s                                                                 ',
      'cursorMove(-999,0)'
    ])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    Date.now = () => 1000 * 60 + 5000

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '01d 01h 07m                                                                     ',
      'cursorMove(-999,0)'
    ])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    Date.now = () => 1000 * 60 * 60 + 1000 * 60 * 8

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '01d 05s                                                                         ',
      'cursorMove(-999,0)'
    ])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    Date.now = () => 1000 * 60 * 60 * 24 + 1000 * 60 * 60 + 1000 * 60 * 8

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '05s                                                                             ',
      'cursorMove(-999,0)'
    ])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    Date.now = () => 1000 * 60 * 60 * 24 + 1000 * 60 * 60 + 1000 * 60 * 8 + 5000

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => ansiStrip(call[0]))).toEqual([
      'eraseLine',
      '00s                                                                             ',
      'cursorMove(-999,0)'
    ])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    Date.now = () => 1000 * 60 * 60 * 24 + 1000 * 60 * 60 + 1000 * 60 * 8 + 45645489745

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => ansiStrip(call[0]))).toEqual(['cursorMove(-999,0)'])
  })
})
