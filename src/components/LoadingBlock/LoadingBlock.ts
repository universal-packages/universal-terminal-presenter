import { BlockDescriptor, BlueColor, GreenColor, RedColor, YellowColor } from '@universal-packages/terminal-document'
import { Padding } from '@universal-packages/text-wrap'

import { BlockControllerConfiguration } from '../../types'
import { LoadingBlockOptions, LoadingController, LoadingStatus } from './LoadingBlock.types'

let ID = 0

const LOAD_CHARS = {
  star: ['✶', '✸', '✹', '✺', '✹', '✷'],
  square: ['⣷', '⣯', '⣟', '⡿', '⢿', '⣻', '⣽', '⣾'],
  circle: ['◜', '◠', '◝', '◞', '◡', '◟']
}

export function LoadingBlock(options?: LoadingBlockOptions): LoadingController {
  const finalOptions: LoadingBlockOptions = { style: 'square', speed: 1, side: 'left', ...options }
  const animationChars = LOAD_CHARS[finalOptions.style]
  const speedIndex = Math.max(finalOptions.speed, 0) || 1
  const padding: Padding = finalOptions.side === 'left' ? [0, 1, 0, 0] : [0, 0, 0, 1]
  let status: LoadingStatus = 'loading'
  let lastFrameChar = animationChars[0]

  const id = `loading-component-${ID++}`

  let configuration: BlockControllerConfiguration

  return {
    descriptor: { id, text: animationChars[0], padding, style: 'bold', width: 'fit' },
    requestUpdate: (frame: number, framesPerSecond: number) => {
      if (status !== 'loading') return

      const framePosition = Math.round((((frame * speedIndex) % framesPerSecond) / framesPerSecond) * animationChars.length)
      const newChar = animationChars[framePosition]

      if (newChar !== lastFrameChar) {
        configuration.update(id, { color: BlueColor.DodgerBlue, text: animationChars[framePosition] })
        lastFrameChar = newChar
      }
    },
    setStatus: (newStatus: LoadingStatus) => {
      status = newStatus

      if (status === 'complete') {
        configuration.update(id, { text: '✔', color: GreenColor.LimeGreen })
      } else if (status === 'error') {
        configuration.update(id, { text: '✖', color: RedColor.FireBrick })
      } else if (status === 'warning') {
        configuration.update(id, { text: '⚠', color: YellowColor.Gold })
      }

      lastFrameChar = ''
    },
    configure: (config: BlockControllerConfiguration) => (configuration = config)
  }
}
