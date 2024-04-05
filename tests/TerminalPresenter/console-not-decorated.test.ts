import stripAnsi from 'strip-ansi'

import { TerminalPresenter } from '../../src'
import { ORIGINAL_STDOUT } from '../../src/ORIGINAL_STDOUT'

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
jest.mock('../../src/getTerminalColumns', () => ({ getTerminalColumns: () => 10 }))
jest.mock('ansi-escapes', () => ({
  clearTerminal: 'clearTerminal',
  cursorHide: 'cursorHide',
  eraseDown: 'eraseDown',
  eraseLine: 'eraseLine',
  cursorMove: jest.fn((x, y) => `cursorMove(${x},${y})`),
  cursorShow: 'cursorShow'
}))

jest.useFakeTimers()

jest.spyOn(console, 'log').mockImplementation((subject) => {
  ORIGINAL_STDOUT.write(subject)
})

describe(TerminalPresenter, (): void => {
  it('does not decorate the printed console outputs when disabled', async (): Promise<void> => {
    const terminalPresenter = new TerminalPresenter({ enabled: true, decorateConsole: false })
    terminalPresenter.present()

    let calls = WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => stripAnsi(call.join(' ')))

    expect(calls).toEqual(['cursorHide'])

    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    console.log('This is a test message')

    jest.advanceTimersToNextTimer()

    calls = WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => stripAnsi(call.join(' ')))

    expect(calls).toEqual(['eraseLine', 'eraseLine', 'eraseLine', 'eraseLine', 'This is a test message\n'])
  })
})
