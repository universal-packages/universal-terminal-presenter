import { BlockDescriptor, DocumentDescriptor, TerminalDocument } from '@universal-packages/terminal-document'
import ansiEscapes from 'ansi-escapes'
import chalk from 'chalk'

import { ORIGINAL_STDERR } from './ORIGINAL_STDERR'
import { ORIGINAL_STDOUT } from './ORIGINAL_STDOUT'
import { WRITE_ORIGINAL_STDERR } from './WRITE_ORIGINAL_STDERR'
import { WRITE_ORIGINAL_STDOUT } from './WRITE_ORIGINAL_STDOUT'
import { getTerminalColumns } from './getTerminalColumns'
import { BlockController, ConsoleCaptureEntry, DocumentEntry, PresenterDocumentDescriptor, TerminalPresenterOptions } from './types'

const DECORATION_COLORS = { stdout: chalk.cyan, stderr: chalk.red }

export const OPTIONS: TerminalPresenterOptions = {
  clear: false,
  enabled: ORIGINAL_STDOUT.isTTY && process.env.NODE_ENV !== 'test',
  decorateConsole: true,
  framesPerSecond: 5,
  relativeDecorationPath: true
}

let documents: Record<string, DocumentEntry> = {}
let documentsOrder: string[] = []
let consoleCaptureQueue: ConsoleCaptureEntry[] = []

let screenCleared = false
let presenting = false
let consoleCaptured = false
let restoring = false
let resolveRestore: (...args: any[]) => void

let framesPerSecond = 5
let frameDuration = 1000 / framesPerSecond
let frame = 0
let animationInterval: NodeJS.Timeout

export function configure(options: TerminalPresenterOptions): void {
  Object.assign(OPTIONS, options)

  framesPerSecond = OPTIONS.framesPerSecond
  frameDuration = 1000 / framesPerSecond
}

export function appendRealTimeDocument(id: string, presenterDocument: PresenterDocumentDescriptor): void {
  if (documents[id]) return

  documents[id] = generateTerminalDocumentEntry(presenterDocument)
  documentsOrder.push(id)
}

export function clearRealTimeDocuments(): void {
  documents = {}
  documentsOrder = []
}

export function clearScreen(): void {
  if (!OPTIONS.enabled || !OPTIONS.clear || screenCleared) return
  screenCleared = true
}

export function captureConsole(): void {
  if (!OPTIONS.enabled || consoleCaptured) return
  ORIGINAL_STDOUT.write = writeStdoutOrCaptureConsole
  ORIGINAL_STDERR.write = writeStderrOrCaptureConsole

  process.on('uncaughtException', handleUncaughtException)

  consoleCaptured = true
}

export function prependRealTimeDocument(id: string, presenterDocument: PresenterDocumentDescriptor): void {
  if (documents[id]) return

  documents[id] = generateTerminalDocumentEntry(presenterDocument)
  documentsOrder.unshift(id)
}

export function present(): void {
  if (!OPTIONS.enabled || presenting || restoring) return

  presenting = true

  captureConsole()
  clearScreen()

  WRITE_ORIGINAL_STDOUT(ansiEscapes.cursorHide)

  let previousLines = []
  animationInterval = setInterval(() => {
    const wereLogs = printPendingConsoleCaptureEntries()

    for (let i = 0; i < documentsOrder.length; i++) {
      const currentEntry = documents[documentsOrder[i]]

      for (let i = 0; i < currentEntry.controllers.length; i++) {
        currentEntry.controllers[i].requestUpdate(frame, framesPerSecond, frameDuration)
      }
    }

    if (documentsOrder.length > 0) {
      const lines = documentsOrder.map((entry): string[] => documents[entry].terminalDocument.result.split('\n')).flat()

      for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i]
        const previousLine = previousLines[i]

        if (currentLine !== previousLine || wereLogs) {
          WRITE_ORIGINAL_STDOUT(ansiEscapes.eraseLine)
          WRITE_ORIGINAL_STDOUT(currentLine)
          if (i !== lines.length - 1) WRITE_ORIGINAL_STDOUT('\n')
        } else {
          if (i !== lines.length - 1) WRITE_ORIGINAL_STDOUT(ansiEscapes.cursorMove(0, 1))
        }
      }

      if (lines.length < previousLines.length) WRITE_ORIGINAL_STDOUT(ansiEscapes.eraseDown)

      WRITE_ORIGINAL_STDOUT(ansiEscapes.cursorMove(-999, -lines.length + 1))

      previousLines = lines
    }

    frame++

    if (restoring) {
      restoring = false
      presenting = false
      screenCleared = false

      documents = {}
      documentsOrder = []

      clearInterval(animationInterval)

      printPendingConsoleCaptureEntries(true)

      WRITE_ORIGINAL_STDOUT(ansiEscapes.eraseDown)
      WRITE_ORIGINAL_STDOUT(ansiEscapes.cursorShow)

      releaseConsole()
      resolveRestore()
    }
  }, frameDuration)
}

export function printString(subject: string): void {
  if (presenting) {
    consoleCaptureQueue.push({ subject, type: 'stdout', direct: true })
  } else {
    WRITE_ORIGINAL_STDOUT(subject + '\n')
  }
}

export function printDocument(documentDescriptor: DocumentDescriptor): void {
  const document = new TerminalDocument()
  document.describe({ ...documentDescriptor, width: getTerminalColumns() })
  printString(document.result)
}

export function releaseConsole(): void {
  if (!OPTIONS.enabled || !consoleCaptured) return
  ORIGINAL_STDOUT.write = WRITE_ORIGINAL_STDOUT
  ORIGINAL_STDERR.write = WRITE_ORIGINAL_STDERR

  process.off('uncaughtException', handleUncaughtException)

  consoleCaptured = false
}

export function removeRealTimeDocument(id: string): void {
  documentsOrder = documentsOrder.filter((entry) => entry !== id)
  delete documents[id]
}

export async function restore(): Promise<void> {
  if (!OPTIONS.enabled || !presenting || restoring) return

  restoring = true

  await new Promise((resolve): void => {
    resolveRestore = resolve
  })
}

export function updateRealTimeDocument(id: string, presenterDocument: PresenterDocumentDescriptor): void {
  const documentEntry = documents[id]

  if (!documentEntry) return

  documents[id] = generateTerminalDocumentEntry(presenterDocument)
}

function captureConsoleEntry(subject: string, type: 'stdout' | 'stderr'): boolean {
  const stack = new Error().stack.split('\n')
  const printerValueStackLineIndex = stack.findLastIndex((line) => line.includes('node:internal/console/constructor') || line.includes('console.mockConstructor'))

  // Console was not the caller
  if (printerValueStackLineIndex === -1) return false

  const printerStackLine = stack[printerValueStackLineIndex]
  const printerMatch = /at (.*) .*/g.exec(printerStackLine)
  const printer = printerMatch?.[1]
  const callerStackLine = stack[printerValueStackLineIndex + 1]
  const callerMatchType1 = /at (.*) \((.*)\)/g.exec(callerStackLine)
  const callerMatchType2 = /at (.*)/g.exec(callerStackLine)
  const caller = callerMatchType1?.[1]
  const line = callerMatchType1 ? callerMatchType1[2] : callerMatchType2[1]

  if (presenting) {
    consoleCaptureQueue.push({ subject, caller, printer, line, type })
  } else {
    printConsoleCaptureEntry({ subject, caller, printer, line, type })
  }

  return true
}

function generateTerminalDocumentEntry(presenterDocumentDescriptor: PresenterDocumentDescriptor): DocumentEntry {
  const { rows: presenterRows, ...restOfPresenterDocumentDescriptor } = presenterDocumentDescriptor
  const rows = []
  const controllers = []

  for (let i = 0; i < presenterRows.length; i++) {
    const { blocks: presenterBlocks, ...rowDescriptor } = presenterRows[i]
    const blocks = []

    for (let j = 0; j < presenterBlocks.length; j++) {
      const presenterBlock = presenterBlocks[j] as BlockController

      if (presenterBlock.descriptor) {
        controllers.push(presenterBlock)
        blocks.push(presenterBlock.descriptor)
      } else {
        blocks.push(presenterBlock)
      }
    }

    rows.push({ blocks, ...rowDescriptor })
  }

  const terminalDocumentInstance = new TerminalDocument()

  for (let i = 0; i < controllers.length; i++) {
    const component = controllers[i] as BlockController

    component.configure({
      update: (id: string, descriptor: BlockDescriptor) => {
        terminalDocumentInstance.update(id, descriptor)
      },
      getSize: (id: string) => {
        return terminalDocumentInstance.getBlockSize(id)
      }
    })
  }

  terminalDocumentInstance.describe({ ...restOfPresenterDocumentDescriptor, rows, width: getTerminalColumns() })

  return { terminalDocument: terminalDocumentInstance, controllers }
}

function printConsoleCaptureEntry(entry: ConsoleCaptureEntry): void {
  let linesToPrint: string[] = entry.subject.split('\n')

  if (OPTIONS.decorateConsole && !entry.direct) {
    const printerParts = entry.printer.split('.')
    const printerDecorationColor = DECORATION_COLORS[entry.type]
    const decoratedPrinter = `${chalk.dim(printerParts[0] + '.')}${printerDecorationColor(printerParts[1])}`

    const decoratedCaller = entry.caller ? printerDecorationColor(entry.caller) : ''
    const lineParts = OPTIONS.relativeDecorationPath ? entry.line.replace(process.cwd() + '/', '').split('/') : entry.line.split('/')
    const lastLinePart = lineParts.pop()
    const atLine = `${chalk.dim('at')} ${decoratedCaller} ${OPTIONS.relativeDecorationPath ? chalk.dim('.') : ''}${chalk.dim(lineParts.join('/') + '/')}${printerDecorationColor(
      lastLinePart
    )}`

    const decorationLine = `${decoratedPrinter} ${atLine}`

    linesToPrint = (decorationLine + '\n' + entry.subject).split('\n')
  }

  const terminalColumns = getTerminalColumns()

  for (let i = 0; i < linesToPrint.length; i++) {
    const currentLine = linesToPrint[i]
    const linesToClear = Math.ceil(currentLine.length / terminalColumns)

    for (let j = 0; j < linesToClear + 1; j++) {
      if (entry.type === 'stdout') {
        WRITE_ORIGINAL_STDOUT(ansiEscapes.eraseLine)
      } else {
        WRITE_ORIGINAL_STDERR(ansiEscapes.eraseLine)
      }
    }

    if (entry.type === 'stdout') {
      WRITE_ORIGINAL_STDOUT(currentLine + '\n')
    } else {
      WRITE_ORIGINAL_STDERR(currentLine + '\n')
    }
  }
}

function printPendingConsoleCaptureEntries(allPending?: boolean): boolean {
  if (consoleCaptureQueue.length > 0) {
    while (consoleCaptureQueue.length > 0) {
      const currentEntry = consoleCaptureQueue.shift()

      printConsoleCaptureEntry(currentEntry)

      if (!allPending) break
    }

    return true
  }

  return false
}

function handleUncaughtException(error: Error): void {
  console.error(error)
  process.exit(1)
}

function writeStdoutOrCaptureConsole(bufferOrString: Uint8Array | string, ...args: any[]): boolean {
  if (typeof bufferOrString === 'string') {
    if (captureConsoleEntry(bufferOrString, 'stdout')) return true
  }

  return WRITE_ORIGINAL_STDOUT(bufferOrString, ...args)
}

function writeStderrOrCaptureConsole(bufferOrString: Uint8Array | string, ...args: any[]): boolean {
  if (typeof bufferOrString === 'string') {
    if (captureConsoleEntry(bufferOrString, 'stderr')) return true
  }

  return WRITE_ORIGINAL_STDERR(bufferOrString, ...args)
}
