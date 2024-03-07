import { BlockController } from '../../types'

export type LoadingStatus = 'loading' | 'complete' | 'error' | 'warning'
export type LoadingStyle = 'star' | 'square' | 'circle'
export type LoadingSide = 'left' | 'right'

export interface LoadingBlockOptions {
  style?: LoadingStyle
  speed?: number
  side?: LoadingSide
}

export interface LoadingController extends BlockController {
  setStatus: (status: LoadingStatus) => void
}
