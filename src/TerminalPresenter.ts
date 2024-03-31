import { BlockDescriptor, DocumentDescriptor, TerminalDocument } from '@universal-packages/terminal-document'
import ansiEscapes from 'ansi-escapes'
import chalk from 'chalk'

import { STDOUT_WRITE_ATTEMPTS, captureStdoutWrite, pushStdoutWriteAttempt, releaseStdoutWrite } from './captureStdout'
import { getTerminalColumns } from './getTerminalColumns'
import { BlockController, DocumentEntry, PresenterDocumentDescriptor, TerminalPresenterOptions } from './types'
import { writeStdout } from './writeStdout'

const DECORATION_COLORS = {
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red
}

export default class TerminalPresenter {
  public static readonly options: TerminalPresenterOptions = {
    clear: false,
    enable: process.stdout.isTTY && process.env.NODE_ENV !== 'test',
    decorateConsole: true,
    framesPerSecond: 30
  }

  private static documents: Record<string, DocumentEntry> = {}
  private static documentsOrder: string[] = []

  private static framesPerSecond = 30
  private static frameDuration = 1000 / this.framesPerSecond
  private static animationInterval: NodeJS.Timeout
  private static frame = 0

  private static screenCleared = false
  private static presenting = false
  private static stopping = false

  private static resolveStop: (...args: any[]) => void

  public static configure(options: TerminalPresenterOptions): void {
    Object.assign(this.options, options)

    this.framesPerSecond = this.options.framesPerSecond
    this.frameDuration = 1000 / this.framesPerSecond
  }

  public static print(subject: string): void {
    if (this.options.enable && this.presenting) {
      pushStdoutWriteAttempt(subject)
    } else {
      writeStdout(subject + '\n')
    }
  }

  public static printDocument(documentDescriptor: DocumentDescriptor): void {
    const document = new TerminalDocument()
    document.describe({ width: getTerminalColumns(), ...documentDescriptor })
    this.print(document.result)
  }

  public static appendDocument(id: string, presenterDocument: PresenterDocumentDescriptor): void {
    if (this.documents[id]) return

    this.documents[id] = this.generateTerminalDocumentEntry(presenterDocument)
    this.documentsOrder.push(id)
  }

  public static prependDocument(id: string, presenterDocument: PresenterDocumentDescriptor): void {
    if (this.documents[id]) return

    this.documents[id] = this.generateTerminalDocumentEntry(presenterDocument)
    this.documentsOrder.unshift(id)
  }

  public static updateDocument(id: string, presenterDocument: PresenterDocumentDescriptor): void {
    const documentEntry = this.documents[id]

    if (!documentEntry) return

    this.documents[id] = this.generateTerminalDocumentEntry(presenterDocument)
  }

  public static updateDocumentBlock(id: string, blockId: string, blockDescriptor: BlockDescriptor): void {
    const documentEntry = this.documents[id]

    if (!documentEntry) return

    documentEntry.terminalDocument.update(blockId, blockDescriptor)
  }

  public static removeDocument(id: string): void {
    this.documentsOrder = this.documentsOrder.filter((entry) => entry !== id)
    delete this.documents[id]
  }

  public static clearScreen(): void {
    if (this.options.clear && !this.screenCleared) {
      writeStdout(ansiEscapes.clearTerminal)
      this.screenCleared = true
    }
  }

  public static captureOutput(): void {
    captureStdoutWrite()
  }

  public static releaseOutput(): void {
    releaseStdoutWrite()
  }

  public static start(): void {
    if (!this.options.enable) return

    if (this.presenting) return
    this.presenting = true

    this.captureOutput()
    this.clearScreen()

    writeStdout(ansiEscapes.cursorHide)

    let previousLines = []
    this.animationInterval = setInterval(() => {
      const wereLogs = this.printPendingLogs()

      for (let i = 0; i < this.documentsOrder.length; i++) {
        const currentEntry = this.documents[this.documentsOrder[i]]

        for (let i = 0; i < currentEntry.controllers.length; i++) {
          currentEntry.controllers[i].requestUpdate(this.frame, this.framesPerSecond, this.frameDuration)
        }
      }

      if (this.documentsOrder.length > 0) {
        const lines = this.documentsOrder.map((entry): string[] => this.documents[entry].terminalDocument.result.split('\n')).flat()

        for (let i = 0; i < lines.length; i++) {
          const currentLine = lines[i]
          const previousLine = previousLines[i]

          if (currentLine !== previousLine || wereLogs) {
            writeStdout(ansiEscapes.eraseLine)
            writeStdout(currentLine)
            if (i !== lines.length - 1) writeStdout('\n')
          } else {
            if (i !== lines.length - 1) writeStdout(ansiEscapes.cursorMove(0, 1))
          }
        }

        if (lines.length < previousLines.length) writeStdout(ansiEscapes.eraseDown)

        writeStdout(ansiEscapes.cursorMove(-999, -lines.length + 1))

        previousLines = lines
      }

      this.frame++

      if (this.stopping) {
        this.stopping = false
        this.presenting = false
        this.screenCleared = false

        this.documents = {}
        this.documentsOrder = []

        clearInterval(this.animationInterval)

        this.printPendingLogs(true)

        writeStdout(ansiEscapes.eraseDown)
        writeStdout(ansiEscapes.cursorShow)

        this.releaseOutput()
        this.resolveStop()
      }
    }, this.frameDuration)
  }

  public static async stop(): Promise<void> {
    if (!this.presenting) return
    if (this.stopping) return

    this.stopping = true

    await new Promise((resolve): void => {
      this.resolveStop = resolve
    })
  }

  private static generateTerminalDocumentEntry(presenterDocumentDescriptor: PresenterDocumentDescriptor): DocumentEntry {
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

  private static printPendingLogs(allPending?: boolean): boolean {
    if (STDOUT_WRITE_ATTEMPTS.length > 0) {
      while (STDOUT_WRITE_ATTEMPTS.length > 0) {
        const currentEntry = STDOUT_WRITE_ATTEMPTS.shift()
        let linesToPrint: string[] = []

        if (this.options.decorateConsole && !currentEntry.direct) {
          const printerParts = currentEntry.printer.split('.')
          const printerDecorationColor = DECORATION_COLORS[printerParts[0]] || chalk.cyan
          const decoratedPrinter = `${printerParts[0]}.${printerDecorationColor(printerParts[1])}`

          const decoratedCaller = currentEntry.caller ? chalk.cyan(currentEntry.caller) : ''
          const lineParts = currentEntry.line.replace(process.cwd() + '/', '').split('/')
          lineParts[lineParts.length - 1] = chalk.cyan(lineParts[lineParts.length - 1])
          const atLine = `at ${decoratedCaller} ${lineParts.join('/')}`

          const decorationLine = `${decoratedPrinter} ${atLine}`

          linesToPrint = [decorationLine, ...currentEntry.subject.split('\n')]
        } else {
          linesToPrint = currentEntry.subject.split('\n')
        }

        for (let i = 0; i < linesToPrint.length; i++) {
          writeStdout(ansiEscapes.eraseLine)
          writeStdout(linesToPrint[i] + '\n')
        }

        if (!allPending) break
      }

      return true
    }

    return false
  }
}
