import stripAnsi from 'strip-ansi'

import { TerminalPresenter } from '../src'

jest.useFakeTimers()

describe(TerminalPresenter, (): void => {
  it('hooks in the console and decorates the printed console outputs', async (): Promise<void> => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    const terminalPresenter = new TerminalPresenter()

    terminalPresenter.start()
    jest.advanceTimersToNextTimer()

    console.log('This is a test message')

    jest.advanceTimersToNextTimer()

    const calls = logSpy.mock.calls.map((call) => stripAnsi(call.join(' ')))

    expect(calls[0]).toBe('console.log')
    expect(calls[1]).toMatch(/at Object.<anonymous>.*tests\/console-hook.test.ts:16:13/)
    expect(calls[2]).toBe('This is a test message')
    expect(calls[3]).toBe('')

    logSpy.mockClear()

    terminalPresenter.log('This is another test message')

    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith('This is another test message')
  })

  it('does not decorate the printed console outputs when disabled', async (): Promise<void> => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    const terminalPresenter = new TerminalPresenter({ decorateConsole: false })

    terminalPresenter.start()
    jest.advanceTimersToNextTimer()

    console.log('This is a test message')

    jest.advanceTimersToNextTimer()

    const calls = logSpy.mock.calls.map((call) => stripAnsi(call.join(' ')))

    expect(calls[0]).toBe('This is a test message')
  })
})
