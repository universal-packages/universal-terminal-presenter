import { StdoutWriteAttemptEntry } from './types'

export const ORIGINAL_STDOUT_WRITE = process.stdout.write.bind(process.stdout)
export const STDOUT_WRITE_ATTEMPTS: StdoutWriteAttemptEntry[] = []

export function captureStdoutWrite(): void {
  process.stdout.write = stdoutCapturer
}

export function releaseStdoutWrite(): void {
  process.stdout.write = ORIGINAL_STDOUT_WRITE
}

export function pushStdoutWriteAttempt(subject: string): void {
  STDOUT_WRITE_ATTEMPTS.push({ subject, direct: true })
}

function stdoutCapturer(bufferOrString: Uint8Array | string, ...args: any[]): boolean {
  const stack = new Error().stack.split('\n')
  const printerValueStackLineIndex = stack.findIndex((line) => line.includes('node:internal/console/constructor'))
  const printerStackLine = stack[printerValueStackLineIndex + 1]
  const printerMatch = /at (.*) .*/g.exec(printerStackLine)
  const printer = printerMatch?.[1]
  const callerStackLine = stack[printerValueStackLineIndex + 2]
  const callerMatchType1 = /at (.*) \((.*)\)/g.exec(callerStackLine)
  const callerMatchType2 = /at (.*)/g.exec(callerStackLine)
  const caller = callerMatchType1?.[1]
  const line = callerMatchType2 ? callerMatchType1[2] : callerMatchType2[1]

  if (typeof bufferOrString === 'string') {
    STDOUT_WRITE_ATTEMPTS.push({ subject: bufferOrString, caller, printer, line })
    return true
  } else {
    return ORIGINAL_STDOUT_WRITE(bufferOrString, ...args)
  }
}
