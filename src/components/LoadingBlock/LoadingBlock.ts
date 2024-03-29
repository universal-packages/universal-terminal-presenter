import { BlueColor, GreenColor, RedColor, YellowColor } from '@universal-packages/terminal-document'

import { BlockControllerConfiguration } from '../../types'
import { LoadingBlockOptions, LoadingController, LoadingStatus } from './LoadingBlock.types'

let ID = 0

const LOAD_CHARS = {
  star: ['✶', '✸', '✹', '✺', '✹', '✷'],
  square: ['⣷', '⣯', '⣟', '⡿', '⢿', '⣻', '⣽', '⣾'],
  circle: ['◜', '◠', '◝', '◞', '◡', '◟']
}

export function LoadingBlock(options?: LoadingBlockOptions): LoadingController {
  const finalOptions: LoadingBlockOptions = { style: 'square', speed: 1, status: 'loading', ...options }
  const animationChars = LOAD_CHARS[finalOptions.style]
  const speedIndex = Math.max(finalOptions.speed, 0) || 1
  let status: LoadingStatus = finalOptions.status
  let lastFrameChar = animationChars[0]

  const id = `loading-component-${ID++}`
  const initialText = status === 'loading' ? animationChars[0] : status === 'complete' ? '✔' : status === 'error' ? '✖' : status === 'warning' ? '⚠' : ''
  const initialColor =
    status === 'loading'
      ? BlueColor.DodgerBlue
      : status === 'complete'
      ? GreenColor.LimeGreen
      : status === 'error'
      ? RedColor.FireBrick
      : status === 'warning'
      ? YellowColor.Gold
      : undefined

  let configuration: BlockControllerConfiguration

  return {
    descriptor: { id, color: initialColor, text: initialText, style: 'bold', width: 'fit' },
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
