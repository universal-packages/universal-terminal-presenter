import stripAnsi from 'strip-ansi'

import { TerminalPresenter } from '../src'
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

jest.useFakeTimers()

jest.spyOn(console, 'log').mockImplementation((subject) => {
  writeStdout(subject)
})

const writeStdoutMock = writeStdout as jest.Mock

afterEach((): void => {
  TerminalPresenter.stop()
  jest.advanceTimersToNextTimer()

  jest.clearAllMocks()
})

describe(TerminalPresenter, (): void => {
  it('hooks in the console and decorates the printed console outputs', async (): Promise<void> => {
    TerminalPresenter.configure({ printRealTIme: true })
    TerminalPresenter.start()
    jest.advanceTimersToNextTimer()

    console.log('This is a test message')

    jest.advanceTimersToNextTimer()

    const calls = writeStdoutMock.mock.calls.map((call) => stripAnsi(call.join(' ')))

    expect(calls).toEqual(['cursorHide', 'This is a test message'])

    writeStdoutMock.mockClear()

    TerminalPresenter.print('This is another test message\n')

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls).toEqual([['eraseLine'], ['This is another test message\n'], ['eraseLine'], ['\n']])
  })

  it('does not decorate the printed console outputs when disabled', async (): Promise<void> => {
    TerminalPresenter.configure({ decorateConsole: false, printRealTIme: true })
    TerminalPresenter.start()
    jest.advanceTimersToNextTimer()

    console.log('This is a test message')

    jest.advanceTimersToNextTimer()

    const calls = writeStdoutMock.mock.calls.map((call) => stripAnsi(call.join(' ')))

    expect(calls).toEqual(['cursorHide', 'This is a test message'])
  })
})
