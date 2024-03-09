import { BlockController } from '../../types'

export type LoadingStatus = 'loading' | 'complete' | 'error' | 'warning'
export type LoadingStyle = 'star' | 'square' | 'circle'

export interface LoadingBlockOptions {
  style?: LoadingStyle
  speed?: number
}

export interface LoadingController extends BlockController {
  setStatus: (status: LoadingStatus) => void
}
