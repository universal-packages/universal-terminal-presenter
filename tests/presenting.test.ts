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

process.stdout.columns = 80

jest.useFakeTimers()

describe(TerminalPresenter, (): void => {
  it('present documents to the terminal', async (): Promise<void> => {
    const writeStdoutMock = writeStdout as jest.Mock

    const terminalPresenter = new TerminalPresenter({ clear: true })

    terminalPresenter.start()
    terminalPresenter.start()

    terminalPresenter.appendDocument('document-1', { rows: [{ blocks: [{ text: 'This is a test message' }] }] })

    expect(writeStdoutMock.mock.calls).toEqual([['clearTerminal'], ['cursorHide']])
    jest.clearAllMocks()

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls).toEqual([['eraseLine'], ['This is a test message                                                          '], ['cursorMove(-999,0)']])
    jest.clearAllMocks()

    terminalPresenter.prependDocument('document-2', { rows: [{ blocks: [{ text: 'This is second test message' }] }] })

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls).toEqual([
      ['eraseLine'],
      ['This is second test message                                                     '],
      ['\n'],
      ['eraseLine'],
      ['This is a test message                                                          '],
      ['cursorMove(-999,-1)']
    ])
    jest.clearAllMocks()

    terminalPresenter.updateDocument('document-2', { rows: [{ blocks: [{ text: 'This is second test message alright' }] }] })

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls).toEqual([
      ['eraseLine'],
      ['This is second test message alright                                             '],
      ['\n'],
      ['cursorMove(-999,-1)']
    ])
    jest.clearAllMocks()

    terminalPresenter.removeDocument('document-1')

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls).toEqual([['eraseDown'], ['cursorMove(-999,0)']])
    jest.clearAllMocks()

    terminalPresenter.stop()

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls).toEqual([['cursorMove(-999,0)'], ['eraseDown'], ['cursorShow']])
  })
})
