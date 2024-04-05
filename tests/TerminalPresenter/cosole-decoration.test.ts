import stripAnsi from 'strip-ansi'

import { TerminalPresenter } from '../../src'
import { ORIGINAL_STDERR } from '../../src/ORIGINAL_STDERR'
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

jest.spyOn(console, 'warn').mockImplementation((subject) => {
  ORIGINAL_STDERR.write(subject)
})

describe(TerminalPresenter, (): void => {
  it('hooks in the console and decorates the printed console outputs', async (): Promise<void> => {
    if (process.env.CI) return

    const terminalPresenter = new TerminalPresenter({ enabled: true })
    terminalPresenter.present()

    let calls = WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => stripAnsi(call.join(' ')))
    let callsErr = WRITE_ORIGINAL_STDERR_MOCK.mock.calls.map((call) => stripAnsi(call.join(' ')))

    expect(calls).toEqual(['cursorHide'])
    expect(callsErr).toEqual([])

    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()
    WRITE_ORIGINAL_STDERR_MOCK.mockClear()

    console.log('This is a test message')

    jest.advanceTimersToNextTimer()

    calls = WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => stripAnsi(call.join(' ')))
    callsErr = WRITE_ORIGINAL_STDERR_MOCK.mock.calls.map((call) => stripAnsi(call.join(' ')))

    expect(calls).toEqual([
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'console.mockConstructor [as log] at Object.<anonymous> .tests/TerminalPresenter/cosole-decoration.test.ts:60:13\n',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'This is a test message\n'
    ])
    expect(callsErr).toEqual([])

    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()
    WRITE_ORIGINAL_STDERR_MOCK.mockClear()

    console.warn('This is a warn message')

    jest.advanceTimersToNextTimer()

    calls = WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => stripAnsi(call.join(' ')))
    callsErr = WRITE_ORIGINAL_STDERR_MOCK.mock.calls.map((call) => stripAnsi(call.join(' ')))

    expect(calls).toEqual([])
    expect(callsErr).toEqual([
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'console.mockConstructor [as warn] at Object.<anonymous> .tests/TerminalPresenter/cosole-decoration.test.ts:99:13\n',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'eraseLine',
      'This is a warn message\n'
    ])

    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()
    WRITE_ORIGINAL_STDERR_MOCK.mockClear()

    terminalPresenter.print('This is another test message')

    jest.advanceTimersToNextTimer()

    calls = WRITE_ORIGINAL_STDOUT_MOCK.mock.calls.map((call) => stripAnsi(call.join(' ')))
    callsErr = WRITE_ORIGINAL_STDERR_MOCK.mock.calls.map((call) => stripAnsi(call.join(' ')))

    expect(calls).toEqual(['eraseLine', 'eraseLine', 'eraseLine', 'eraseLine', 'This is another test message\n'])

    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()
    WRITE_ORIGINAL_STDERR_MOCK.mockClear()

    terminalPresenter.printDocument({ rows: [{ blocks: [{ text: 'This is a test message' }] }] })

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls).toEqual([
      ['eraseLine'],
      ['eraseLine'],
      ['This is a \n'],
      ['eraseLine'],
      ['eraseLine'],
      ['test      \n'],
      ['eraseLine'],
      ['eraseLine'],
      ['message   \n']
    ])
  })
})
