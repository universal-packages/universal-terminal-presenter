export function getTerminalColumns() {
  return process.stdout.isTTY ? process.stdout.columns || 80 : 80
}
