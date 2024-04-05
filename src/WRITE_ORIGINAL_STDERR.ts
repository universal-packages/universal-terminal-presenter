import { ORIGINAL_STDERR_WRITE } from './ORIGINAL_STDERR_WRITE'

export function WRITE_ORIGINAL_STDERR(...args: any[]): boolean {
  return ORIGINAL_STDERR_WRITE(...args)
}
