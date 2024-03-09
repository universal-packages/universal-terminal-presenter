import ansiStrip from 'strip-ansi'

import { TerminalPresenter } from '../src'
import { TimeWatch } from '../src/components/TimeWatch'
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

beforeEach((): void => {
  jest.clearAllMocks()
})

describe(TerminalPresenter, (): void => {
  it('presents a time watch component', async (): Promise<void> => {
    const writeStdoutMock = writeStdout as jest.Mock

    Date.now = () => 0

    const terminalPresenter = new TerminalPresenter()
    const timeWatch = TimeWatch()

    terminalPresenter.start()

    terminalPresenter.appendDocument('document-1', { rows: [{ blocks: [timeWatch] }] })

    expect(writeStdoutMock.mock.calls).toEqual([['cursorHide']])
    jest.clearAllMocks()

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual(['eraseLine', '00s                                             ', 'cursorMove(-999,0)'])
    jest.clearAllMocks()

    Date.now = () => 1000

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual(['eraseLine', '01s                                             ', 'cursorMove(-999,0)'])
    jest.clearAllMocks()

    Date.now = () => 1000 * 60 + 5000

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual(['eraseLine', '01m 05s                                         ', 'cursorMove(-999,0)'])
    jest.clearAllMocks()

    Date.now = () => 1000 * 60 * 60 + 1000 * 60 * 8 + 5000

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual(['eraseLine', '01h 08m 05s                                     ', 'cursorMove(-999,0)'])
    jest.clearAllMocks()

    Date.now = () => 1000 * 60 * 60 * 24 + 1000 * 60 * 60 + 1000 * 60 * 8 + 5000

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual(['eraseLine', '01d 01h 08m 05s                                 ', 'cursorMove(-999,0)'])

    terminalPresenter.stop()
    jest.advanceTimersToNextTimer()
  })

  it('can go in reverse', async (): Promise<void> => {
    const writeStdoutMock = writeStdout as jest.Mock

    Date.now = () => 0

    const terminalPresenter = new TerminalPresenter()
    const timeWatch = TimeWatch({ targetTime: 1000 * 60 * 60 * 24 + 1000 * 60 * 60 + 1000 * 60 * 8 + 5000 })

    terminalPresenter.start()

    terminalPresenter.appendDocument('document-1', { rows: [{ blocks: [timeWatch] }] })

    expect(writeStdoutMock.mock.calls).toEqual([['cursorHide']])
    jest.clearAllMocks()

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual(['eraseLine', '01d 01h 08m 05s                                 ', 'cursorMove(-999,0)'])
    jest.clearAllMocks()

    Date.now = () => 1000

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual(['eraseLine', '01d 01h 08m 04s                                 ', 'cursorMove(-999,0)'])
    jest.clearAllMocks()

    Date.now = () => 1000 * 60 + 5000

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual(['eraseLine', '01d 01h 07m                                     ', 'cursorMove(-999,0)'])
    jest.clearAllMocks()

    Date.now = () => 1000 * 60 * 60 + 1000 * 60 * 8

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual(['eraseLine', '01d 05s                                         ', 'cursorMove(-999,0)'])
    jest.clearAllMocks()

    Date.now = () => 1000 * 60 * 60 * 24 + 1000 * 60 * 60 + 1000 * 60 * 8

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual(['eraseLine', '05s                                             ', 'cursorMove(-999,0)'])
    jest.clearAllMocks()

    Date.now = () => 1000 * 60 * 60 * 24 + 1000 * 60 * 60 + 1000 * 60 * 8 + 5000

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual(['eraseLine', '00s                                             ', 'cursorMove(-999,0)'])
    jest.clearAllMocks()

    Date.now = () => 1000 * 60 * 60 * 24 + 1000 * 60 * 60 + 1000 * 60 * 8 + 45645489745

    jest.advanceTimersToNextTimer()

    expect(writeStdoutMock.mock.calls.map((call) => ansiStrip(call[0]))).toEqual(['cursorMove(-999,0)'])

    terminalPresenter.stop()
    jest.advanceTimersToNextTimer()
  })
})
