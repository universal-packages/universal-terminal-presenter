import { BlockDescriptor, BlockSize, DocumentDescriptor, RowDescriptor, TerminalDocument } from '@universal-packages/terminal-document'

export type BackgroundColor = 'black'
export type Color = 'black'
export type TextStyle = 'bold' | 'italic' | 'underline' | 'inverse' | 'strikethrough'
export type TextAlignment = 'left' | 'center' | 'right'
export type TextOverflow = 'wrap' | 'truncate'
export type DocumentOverflow = 'compress' | 'stack'
export type VerticalAlignment = 'top' | 'center' | 'bottom'
export type With = number | 'fit'

export interface TerminalPresenterOptions {
  clear?: boolean
  decorateConsole?: boolean
  framesPerSecond?: number
}

export interface PresenterDocumentDescriptor extends Omit<DocumentDescriptor, 'rows' | 'width'> {
  rows: PresenterRowDescriptor[]
}

export interface PresenterRowDescriptor extends Omit<RowDescriptor, 'blocks'> {
  blocks: (BlockController | BlockDescriptor)[]
}

export interface BlockControllerConfiguration {
  update: (id: string, descriptor: BlockDescriptor) => void
  getSize: (id: string) => BlockSize
}

export interface BlockController {
  descriptor: BlockDescriptor
  requestUpdate: (frame: number, framesPerSecond: number, frameDuration: number) => void
  configure: (configuration: BlockControllerConfiguration) => void
}

export interface DocumentEntry {
  terminalDocument: TerminalDocument
  controllers: BlockController[]
}

export interface LogBufferEntry {
  args: any[]
  type: string
  typeFormatted: string
  caller: string
  path: string
}
