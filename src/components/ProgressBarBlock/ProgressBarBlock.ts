import { BlockControllerConfiguration } from '../../types'
import { ProgressBarBlockOptions, ProgressBarController } from './ProgressBarBlock.types'

let ID = 0

const BAR_CHARS = {
  solid: {
    start: '|',
    end: '|',
    bar: ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█']
  },
  sharp: {
    start: '|',
    end: '|',
    bar: ['#']
  }
}

export function ProgressBarBlock(options?: ProgressBarBlockOptions): ProgressBarController {
  const finalOptions: ProgressBarBlockOptions = { caption: 'percentage', captionSide: 'right', showCaption: true, style: 'solid', target: 100, ...options }
  const target = Math.max(1, finalOptions.target)
  const barChars = BAR_CHARS[finalOptions.style]
  let progress = 0
  let lastFrameProgressString: string

  const id = `progress-bar-component-${ID++}`

  let configuration: BlockControllerConfiguration

  function generateProgressString(): string {
    const caption = finalOptions.caption === 'percentage' ? `${((progress / target) * 100).toFixed(2)} %` : `${progress}/${target}`
    const blockSize = configuration.getSize(id)
    const usableWidth = blockSize.width - 2 - (finalOptions.showCaption ? caption.length + 1 : 0)
    const progressPosition = Math.round((progress / target) * usableWidth * barChars.bar.length)
    const leftSide = (finalOptions.showCaption && finalOptions.captionSide === 'left' ? caption + ' ' : '') + barChars.start
    const rightSide = barChars.end + (finalOptions.showCaption && finalOptions.captionSide === 'right' ? ' ' + caption : '')
    const bar =
      barChars.bar[barChars.bar.length - 1].repeat(Math.floor(progressPosition / barChars.bar.length)) +
      (progress && progress !== target ? barChars.bar[progressPosition % barChars.bar.length] : '')
    const noBar = '-'.repeat(Math.max(usableWidth - bar.length, 0))

    const finalProgressString = leftSide + bar + noBar + rightSide

    return finalProgressString
  }

  return {
    descriptor: { id, color: finalOptions.color, style: 'bold', text: '' },
    requestUpdate: () => {
      if (!lastFrameProgressString) {
        lastFrameProgressString = generateProgressString()

        configuration.update(id, { text: lastFrameProgressString })
      }
    },
    setProgress: (newProgress: number) => {
      progress = Math.max(0, Math.min(target, newProgress))

      const progressString = generateProgressString()

      if (progressString !== lastFrameProgressString) {
        configuration.update(id, { text: progressString })
      }

      lastFrameProgressString = progressString
    },
    configure: (config: BlockControllerConfiguration) => (configuration = config)
  }
}
