import { Color } from '@universal-packages/terminal-document'

import { BlockController } from '../../types'

export type BarStyle = 'solid' | 'sharp'
export type CaptionType = 'percentage' | 'target'
export type CaptionSide = 'left' | 'right'

export interface ProgressBarOptions {
  caption?: CaptionType
  captionSide?: CaptionSide
  color?: Color
  style?: BarStyle
  showCaption?: boolean
  target?: number
}

export interface ProgressBarController extends BlockController {
  setProgress: (number: number) => void
}
