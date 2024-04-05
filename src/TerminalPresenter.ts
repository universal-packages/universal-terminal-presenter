import { BlockDescriptor, DocumentDescriptor, TerminalDocument } from '@universal-packages/terminal-document'
import ansiEscapes from 'ansi-escapes'
import chalk from 'chalk'

import { ORIGINAL_STDERR } from './ORIGINAL_STDERR'
import { ORIGINAL_STDOUT } from './ORIGINAL_STDOUT'
import { WRITE_ORIGINAL_STDERR } from './WRITE_ORIGINAL_STDERR'
import { WRITE_ORIGINAL_STDOUT } from './WRITE_ORIGINAL_STDOUT'
import { getTerminalColumns } from './getTerminalColumns'
import { BlockController, ConsoleCaptureEntry, DocumentEntry, PresenterDocumentDescriptor, TerminalPresenterOptions } from './types'

export const DECORATION_COLORS = { stdout: chalk.cyan, stderr: chalk.red }

export default class TerminalPresenter {
  public static get firstInstance(): TerminalPresenter {
    return TerminalPresenter.internalFirstInstance
  }
  private static alreadyInstantiated = false
  private static internalFirstInstance: TerminalPresenter

  public readonly options: TerminalPresenterOptions

  private documents: Record<string, DocumentEntry> = {}
  private documentsOrder: string[] = []
  private consoleCaptureQueue: ConsoleCaptureEntry[] = []

  private screenCleared = false
  private presenting = false
  private consoleCaptured = false
  private restoring = false
  private resolveRestore: (...args: any[]) => void

  private invalid = false

  private framesPerSecond = 30
  private frameDuration = 1000 / this.framesPerSecond
  private frame = 0
  private animationInterval: NodeJS.Timeout

  private handleUncaughtException = (error: Error): void => {
    console.error(error)
    process.exit(1)
  }

  private writeStdoutOrCaptureConsole = (bufferOrString: Uint8Array | string, ...args: any[]): boolean => {
    if (typeof bufferOrString === 'string') {
      if (this.captureConsoleEntry(bufferOrString, 'stdout')) return true
    }

    return WRITE_ORIGINAL_STDOUT(bufferOrString, ...args)
  }

  private writeStderrOrCaptureConsole = (bufferOrString: Uint8Array | string, ...args: any[]): boolean => {
    if (typeof bufferOrString === 'string') {
      if (this.captureConsoleEntry(bufferOrString, 'stderr')) return true
    }

    return WRITE_ORIGINAL_STDERR(bufferOrString, ...args)
  }

  constructor(options?: TerminalPresenterOptions) {
    this.options = {
      clear: false,
      enabled: ORIGINAL_STDOUT.isTTY && process.env.NODE_ENV !== 'test',
      decorateConsole: true,
      framesPerSecond: 30,
      relativeDecorationPath: true,
      ...options
    }

    this.framesPerSecond = this.options.framesPerSecond
    this.frameDuration = 1000 / this.framesPerSecond

    if (TerminalPresenter.alreadyInstantiated) {
      this.invalid = true

      console.warn('TerminalPresenter has already been instantiated somewhere else. To avoid conflicts, new instances will not do anything.')
    } else {
      TerminalPresenter.alreadyInstantiated = true
      TerminalPresenter.internalFirstInstance = this
    }
  }

  public appendRealTimeDocument(id: string, presenterDocument: PresenterDocumentDescriptor): void {
    if (this.documents[id]) return

    this.documents[id] = this.generateTerminalDocumentEntry(presenterDocument)
    this.documentsOrder.push(id)
  }

  public clearRealTimeDocuments(): void {
    this.documents = {}
    this.documentsOrder = []
  }

  public clearScreen(): void {
    if (this.invalid || !this.options.enabled || !this.options.clear || this.screenCleared) return
    this.screenCleared = true
  }

  public captureConsole(): void {
    if (this.invalid || !this.options.enabled || this.consoleCaptured) return
    ORIGINAL_STDOUT.write = this.writeStdoutOrCaptureConsole
    ORIGINAL_STDERR.write = this.writeStderrOrCaptureConsole

    process.on('uncaughtException', this.handleUncaughtException)

    this.consoleCaptured = true
  }

  public prependRealTimeDocument(id: string, presenterDocument: PresenterDocumentDescriptor): void {
    if (this.documents[id]) return

    this.documents[id] = this.generateTerminalDocumentEntry(presenterDocument)
    this.documentsOrder.unshift(id)
  }

  public present(): void {
    if (this.invalid || !this.options.enabled || this.presenting || this.restoring) return

    this.presenting = true

    this.captureConsole()
    this.clearScreen()

    WRITE_ORIGINAL_STDOUT(ansiEscapes.cursorHide)

    let previousLines = []
    this.animationInterval = setInterval(() => {
      const wereLogs = this.printPendingConsoleCaptureEntries()

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

      this.frame++

      if (this.restoring) {
        this.restoring = false
        this.presenting = false
        this.screenCleared = false

        this.documents = {}
        this.documentsOrder = []

        clearInterval(this.animationInterval)

        this.printPendingConsoleCaptureEntries(true)

        WRITE_ORIGINAL_STDOUT(ansiEscapes.eraseDown)
        WRITE_ORIGINAL_STDOUT(ansiEscapes.cursorShow)

        this.releaseConsole()
        this.resolveRestore()
      }
    }, this.frameDuration)
  }

  public print(subject: string): void {
    if (this.invalid || !this.options.enabled) return

    if (this.presenting) {
      this.consoleCaptureQueue.push({ subject, type: 'stdout', direct: true })
    } else {
      WRITE_ORIGINAL_STDOUT(subject + '\n')
    }
  }

  public printDocument(documentDescriptor: DocumentDescriptor): void {
    const document = new TerminalDocument()
    document.describe({ ...documentDescriptor, width: getTerminalColumns() })
    this.print(document.result)
  }

  public releaseConsole(): void {
    if (this.invalid || !this.options.enabled || !this.consoleCaptured) return
    ORIGINAL_STDOUT.write = WRITE_ORIGINAL_STDOUT
    ORIGINAL_STDERR.write = WRITE_ORIGINAL_STDERR

    process.off('uncaughtException', this.handleUncaughtException)

    this.consoleCaptured = false
  }

  public removeRealTimeDocument(id: string): void {
    this.documentsOrder = this.documentsOrder.filter((entry) => entry !== id)
    delete this.documents[id]
  }

  public async restore(): Promise<void> {
    if (!this.options.enabled || !this.presenting || this.restoring) return

    this.restoring = true

    await new Promise((resolve): void => {
      this.resolveRestore = resolve
    })
  }

  public updateRealTimeDocument(id: string, presenterDocument: PresenterDocumentDescriptor): void {
    const documentEntry = this.documents[id]

    if (!documentEntry) return

    this.documents[id] = this.generateTerminalDocumentEntry(presenterDocument)
  }

  private captureConsoleEntry(subject: string, type: 'stdout' | 'stderr'): boolean {
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

    if (this.presenting) {
      this.consoleCaptureQueue.push({ subject, caller, printer, line, type })
    } else {
      this.printConsoleCaptureEntry({ subject, caller, printer, line, type })
    }

    return true
  }

  private generateTerminalDocumentEntry(presenterDocumentDescriptor: PresenterDocumentDescriptor): DocumentEntry {
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

  private printConsoleCaptureEntry(entry: ConsoleCaptureEntry): void {
    let linesToPrint: string[] = entry.subject.split('\n')

    if (this.options.decorateConsole && !entry.direct) {
      const printerParts = entry.printer.split('.')
      const printerDecorationColor = DECORATION_COLORS[entry.type]
      const decoratedPrinter = `${chalk.dim(printerParts[0] + '.')}${printerDecorationColor(printerParts[1])}`

      const decoratedCaller = entry.caller ? printerDecorationColor(entry.caller) : ''
      const lineParts = this.options.relativeDecorationPath ? entry.line.replace(process.cwd() + '/', '').split('/') : entry.line.split('/')
      const lastLinePart = lineParts.pop()
      const atLine = `${chalk.dim('at')} ${decoratedCaller} ${this.options.relativeDecorationPath ? chalk.dim('.') : ''}${chalk.dim(
        lineParts.join('/') + '/'
      )}${printerDecorationColor(lastLinePart)}`

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

  private printPendingConsoleCaptureEntries(allPending?: boolean): boolean {
    if (this.consoleCaptureQueue.length > 0) {
      while (this.consoleCaptureQueue.length > 0) {
        const currentEntry = this.consoleCaptureQueue.shift()

        this.printConsoleCaptureEntry(currentEntry)

        if (!allPending) break
      }

      return true
    }

    return false
  }
}
