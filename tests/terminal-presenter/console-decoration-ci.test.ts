import { configure, present, print, printDocument } from '../../src'
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

describe('terminal-presenter', (): void => {
  it('hooks in the console and decorates the printed console outputs', async (): Promise<void> => {
    if (!process.env.CI) return

    configure({ enabled: true })
    present()

    console.log('This is a test message')
    console.warn('This is a warn message')
    print('This is another test message')
    printDocument({ rows: [{ blocks: [{ text: 'This is a test message' }] }] })

    jest.advanceTimersToNextTimer(10)

    // Extremely weird stuff happens on CI so we test the same in console-decoration.test.ts but with a simpler matcher
    expect(WRITE_ORIGINAL_STDOUT_MOCK).toHaveBeenCalledTimes(364)
  })
})
