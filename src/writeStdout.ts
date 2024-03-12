import { ORIGINAL_STDOUT_WRITE } from './captureStdout'

export function writeStdout(subject: string) {
  ORIGINAL_STDOUT_WRITE(subject)
}
