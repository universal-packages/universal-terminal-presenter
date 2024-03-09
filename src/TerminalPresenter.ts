import { BlockDescriptor, TerminalDocument } from '@universal-packages/terminal-document'
import ansiEscapes from 'ansi-escapes'
import chalk from 'chalk'

import { BlockController, DocumentEntry, LogBufferEntry, PresenterDocumentDescriptor, TerminalPresenterOptions } from './types'
import { writeStdout } from './writeStdout'

export default class TerminalPresenter {
  public readonly options: TerminalPresenterOptions

  private interval: NodeJS.Timeout

  private documents: Record<string, DocumentEntry> = {}
  private documentsOrder: string[] = []

  private logBuffer: LogBufferEntry[] = []
  private originalConsoleMethods: Record<string, Function> = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    trace: console.trace,
    group: console.group,
    groupCollapsed: console.groupCollapsed,
    groupEnd: console.groupEnd,
    table: console.table,
    time: console.time,
    timeLog: console.timeLog,
    timeEnd: console.timeEnd,
    count: console.count,
    assert: console.assert,
    clear: console.clear,
    dir: console.dir,
    dirxml: console.dirxml,
    profile: console.profile,
    profileEnd: console.profileEnd
  }

  private famesPerSecond = 30
  private frameDuration = 1000 / this.famesPerSecond
  private frame = 0
  private stopping = false
  private running = false

  public constructor(options?: TerminalPresenterOptions) {
    this.options = { clear: false, decorateConsole: true, framesPerSecond: 30, ...options }

    this.famesPerSecond = this.options.framesPerSecond
    this.frameDuration = 1000 / this.famesPerSecond
  }

  public log(...args: any[]): void {
    this.originalConsoleMethods.log(...args)
  }

  public appendDocument(id: string, presenterDocument: PresenterDocumentDescriptor): void {
    if (this.documents[id]) return

    this.documents[id] = this.generateDocumentEntry(presenterDocument)
    this.documentsOrder.push(id)
  }

  public prependDocument(id: string, presenterDocument: PresenterDocumentDescriptor): void {
    if (this.documents[id]) return

    this.documents[id] = this.generateDocumentEntry(presenterDocument)
    this.documentsOrder.unshift(id)
  }

  public updateDocument(id: string, presenterDocument: PresenterDocumentDescriptor): void {
    const documentEntry = this.documents[id]

    if (!documentEntry) return

    this.documents[id] = this.generateDocumentEntry(presenterDocument, documentEntry.terminalDocument)
  }

  public updateDocumentBlock(id: string, blockId: string, blockDescriptor: BlockDescriptor): void {
    const documentEntry = this.documents[id]

    if (!documentEntry) return

    documentEntry.terminalDocument.update(blockId, blockDescriptor)
  }

  public removeDocument(id: string): void {
    this.documentsOrder = this.documentsOrder.filter((entry) => entry !== id)
    delete this.documents[id]
  }

  public start(): void {
    if (this.running) return
    this.running = true

    this.hook()
    if (this.options.clear) writeStdout(ansiEscapes.clearTerminal)
    writeStdout(ansiEscapes.cursorHide)

    let previousLines = []
    this.interval = setInterval(() => {
      this.running = true

      let wereLogs = false

      if (this.logBuffer.length > 0) {
        writeStdout(ansiEscapes.eraseDown)

        while (this.logBuffer.length > 0) {
          const logEntry = this.logBuffer.shift()

          this.printConsoleEntry(logEntry)
        }

        wereLogs = true
      }

      for (let i = 0; i < this.documentsOrder.length; i++) {
        const currentEntry = this.documents[this.documentsOrder[i]]

        for (let i = 0; i < currentEntry.controllers.length; i++) {
          currentEntry.controllers[i].requestUpdate(this.frame, this.famesPerSecond, this.frameDuration)
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
        clearInterval(this.interval)

        writeStdout(ansiEscapes.eraseDown)
        writeStdout(ansiEscapes.cursorShow)

        this.stopping = false
        this.running = false

        this.unhook()
      }
    }, this.frameDuration)
  }

  public stop(): void {
    if (this.running) this.stopping = true
  }

  private hook(): void {
    this.hookUntoConsoleMethod('log', chalk.dim)
    this.hookUntoConsoleMethod('error', chalk.red)
    this.hookUntoConsoleMethod('warn', chalk.yellow)
    this.hookUntoConsoleMethod('info', chalk.blue)
    this.hookUntoConsoleMethod('debug', chalk.dim)
    this.hookUntoConsoleMethod('trace', chalk.dim)
    this.hookUntoConsoleMethod('group', chalk.dim)
    this.hookUntoConsoleMethod('groupCollapsed', chalk.dim)
    this.hookUntoConsoleMethod('groupEnd', chalk.dim)
    this.hookUntoConsoleMethod('table', chalk.dim)
    this.hookUntoConsoleMethod('time', chalk.dim)
    this.hookUntoConsoleMethod('timeLog', chalk.dim)
    this.hookUntoConsoleMethod('timeEnd', chalk.dim)
    this.hookUntoConsoleMethod('count', chalk.dim)
    this.hookUntoConsoleMethod('assert', chalk.dim)
    this.hookUntoConsoleMethod('clear', chalk.dim)
    this.hookUntoConsoleMethod('dir', chalk.dim)
    this.hookUntoConsoleMethod('dirxml', chalk.dim)
    this.hookUntoConsoleMethod('profile', chalk.dim)
    this.hookUntoConsoleMethod('profileEnd', chalk.dim)

    process.on('uncaughtException', (e) => {
      this.originalConsoleMethods.error(e)
      process.exit(1)
    })

    process.stdout.on('resize', () => {
      const documentKeys = Object.keys(this.documents)

      for (let i = 0; i < documentKeys.length; i++) {
        this.documents[documentKeys[i]].terminalDocument.resize(this.terminalColumns())
      }
    })
  }

  private unhook(): void {
    this.unhookUntoConsoleMethod('log')
    this.unhookUntoConsoleMethod('error')
    this.unhookUntoConsoleMethod('warn')
    this.unhookUntoConsoleMethod('info')
    this.unhookUntoConsoleMethod('debug')
    this.unhookUntoConsoleMethod('trace')
    this.unhookUntoConsoleMethod('group')
    this.unhookUntoConsoleMethod('groupCollapsed')
    this.unhookUntoConsoleMethod('groupEnd')
    this.unhookUntoConsoleMethod('table')
    this.unhookUntoConsoleMethod('time')
    this.unhookUntoConsoleMethod('timeLog')
    this.unhookUntoConsoleMethod('timeEnd')
    this.unhookUntoConsoleMethod('count')
    this.unhookUntoConsoleMethod('assert')
    this.unhookUntoConsoleMethod('clear')
    this.unhookUntoConsoleMethod('dir')
    this.unhookUntoConsoleMethod('dirxml')
    this.unhookUntoConsoleMethod('profile')
    this.unhookUntoConsoleMethod('profileEnd')

    process.removeAllListeners('uncaughtException')
    process.stdout.removeAllListeners('resize')
  }

  private generateDocumentEntry(presenterDocument: PresenterDocumentDescriptor, terminalDocument?: TerminalDocument): DocumentEntry {
    const { rows: presenterRows, ...options } = presenterDocument
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

    const terminalDocumentInstance = terminalDocument || new TerminalDocument()

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

    terminalDocumentInstance.describe({ ...options, rows, width: this.terminalColumns() })

    return { terminalDocument: terminalDocumentInstance, controllers }
  }

  private hookUntoConsoleMethod(method: string, format: chalk.Chalk): void {
    console[method] = (...args: any[]) => {
      this.logBuffer.push(this.generateLogEntry(method, format(method), args))
    }
  }

  private unhookUntoConsoleMethod(method: string): void {
    if (this.originalConsoleMethods[method]) console[method] = this.originalConsoleMethods[method]
  }

  private generateLogEntry(type: string, typeFormatted: string, args: any[]): LogBufferEntry {
    const stackLine = new Error().stack.split('\n')[3]
    const match = /at (.*) \((.*)\)/g.exec(stackLine)
    const caller = chalk.cyan(match[1])
    const pathParts = chalk.gray(match[2]).split('/')

    pathParts[pathParts.length - 1] = chalk.cyan(pathParts[pathParts.length - 1])

    return { args, type, typeFormatted, caller, path: pathParts.join('/') }
  }

  private printConsoleEntry(logEntry: LogBufferEntry): void {
    if (this.options.decorateConsole) {
      this.originalConsoleMethods.log(chalk.dim('console.') + logEntry.typeFormatted)
      this.originalConsoleMethods.log('  ', logEntry.caller, logEntry.path)
    }

    this.originalConsoleMethods[logEntry.type](...logEntry.args)

    if (this.options.decorateConsole) this.originalConsoleMethods.log('')
  }

  private terminalColumns(): number {
    return process.stdout.columns || 80
  }
}
