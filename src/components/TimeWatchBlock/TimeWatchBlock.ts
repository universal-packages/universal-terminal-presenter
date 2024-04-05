import { BlockControllerConfiguration } from '../../types'
import { TimeWatchBlockOptions, TimeWatchController } from './TimeWatchBlock.types'

let ID = 0

export function TimeWatchBlock(options?: TimeWatchBlockOptions): TimeWatchController {
  const finalOptions: TimeWatchBlockOptions = { initialTime: Date.now(), ...options }
  const initialTime = finalOptions.initialTime
  const targetTime = finalOptions.targetTime
  let lastCalculatedTime = ''

  const id = `time-watch-component-${ID++}`

  let configuration: BlockControllerConfiguration

  return {
    descriptor: { id, text: '00s', style: 'bold', width: 'fit' },
    requestUpdate: () => {
      const currentTime = Date.now()
      let timeDiff: number

      if (targetTime) {
        if (initialTime) {
          if (currentTime > targetTime) {
            timeDiff = Math.max(targetTime - initialTime, 0)
          } else {
            timeDiff = Math.max(targetTime - currentTime, 0)
          }
        } else {
          timeDiff = Math.max(targetTime - currentTime, 0)
        }
      } else {
        timeDiff = currentTime - initialTime
      }

      const seconds = Math.floor(timeDiff / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)
      const hasPrecedent = days || hours % 24 || minutes % 60
      const time = `${days ? `${padZero(days)}d ` : ''}${hours % 24 ? `${padZero(hours % 24)}h ` : ''}${minutes % 60 ? `${padZero(minutes % 60)}m ` : ''}${
        seconds % 60 || !hasPrecedent ? `${padZero(seconds % 60)}s` : ''
      }`
      if (time !== lastCalculatedTime) {
        configuration.update(id, { text: time })
        lastCalculatedTime = time
      }
    },
    configure: (config: BlockControllerConfiguration) => (configuration = config)
  }
}

function padZero(num: number, size: number = 2): string {
  let s = num + ''
  while (s.length < size) s = '0' + s
  return s
}
