import { ORIGINAL_STDOUT_WRITE } from './ORIGINAL_STDOUT_WRITE'

export function WRITE_ORIGINAL_STDOUT(...args: any[]): boolean {
  return ORIGINAL_STDOUT_WRITE(...args)
}
