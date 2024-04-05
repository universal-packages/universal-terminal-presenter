import { appendRealTimeDocument, clearRealTimeDocuments, configure, prependRealTimeDocument, present, removeRealTimeDocument, restore, updateRealTimeDocument } from '../../src'

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

jest.spyOn(console, 'warn').mockImplementation((subject) => {
  WRITE_ORIGINAL_STDERR_MOCK(subject)
})

describe('TerminalPresenter', (): void => {
  it('present documents to the terminal', async (): Promise<void> => {
    configure({ clear: true, enabled: true })
    present()

    appendRealTimeDocument('document-1', { rows: [{ blocks: [{ text: 'This is a test message' }] }] })

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls).toEqual([
      ['cursorHide'],
      ['eraseLine'],
      ['This is a test message                                                          '],
      ['cursorMove(-999,0)']
    ])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    prependRealTimeDocument('document-2', { rows: [{ blocks: [{ text: 'This is second test message' }] }] })

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls).toEqual([
      ['eraseLine'],
      ['This is second test message                                                     '],
      ['\n'],
      ['eraseLine'],
      ['This is a test message                                                          '],
      ['cursorMove(-999,-1)']
    ])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    updateRealTimeDocument('document-2', { rows: [{ blocks: [{ text: 'This is second test message alright' }] }] })

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls).toEqual([
      ['eraseLine'],
      ['This is second test message alright                                             '],
      ['\n'],
      ['cursorMove(-999,-1)']
    ])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    removeRealTimeDocument('document-1')

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls).toEqual([['eraseDown'], ['cursorMove(-999,0)']])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    clearRealTimeDocuments()

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls).toEqual([])
    WRITE_ORIGINAL_STDOUT_MOCK.mockClear()

    restore()

    jest.advanceTimersToNextTimer()

    expect(WRITE_ORIGINAL_STDOUT_MOCK.mock.calls).toEqual([['eraseDown'], ['cursorShow']])
  })
})
