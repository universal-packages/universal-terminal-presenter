# Terminal Document

[![npm version](https://badge.fury.io/js/@universal-packages%2Fterminal-presenter.svg)](https://www.npmjs.com/package/@universal-packages/terminal-presenter)
[![Testing](https://github.com/universal-packages/universal-terminal-presenter/actions/workflows/testing.yml/badge.svg)](https://github.com/universal-packages/universal-terminal-presenter/actions/workflows/testing.yml)
[![codecov](https://codecov.io/gh/universal-packages/universal-terminal-presenter/branch/main/graph/badge.svg?token=CXPJSN8IGL)](https://codecov.io/gh/universal-packages/universal-terminal-presenter)

Terminal document presentation system.

## Install

```shell
npm install @universal-packages/terminal-presenter
```

## Getting started

Once started it hooks into the printing capabilities of the application in order to present real time updates to the terminal.

```typescript
import { appendRealTimeDocument, configure, present } from '@universal-packages/terminal-presenter'

configure({ clear: true })

appendRealTimeDocument('document-1', {
  rows: [
    {
      blocks: [{ text: 'Hello World!!' }]
    }
  ]
}).appendRealTimeDocument('document-2', {
  rows: [
    {
      blocks: [{ text: 'Some more real time info' }]
    }
  ]
})

preset()
```

### Global Methods

#### `configure(options: Options)`

Configures the terminal presenter.

##### Options

- **`clear`** `boolean`
  Clears the terminal before start presenting documents.

- **`enabled`** `boolean` `default: isTTY && NODE_ENV !== 'test'`
  Enables the terminal presenter functionality like capture the console to be decorated and presenting real time documents, test and environments without tty will not be enabled by default.

- **`decorateConsole`** `boolean` `default: true`
  Decorates the console.\<methods\> to identify better where the logs are coming from.

- **`framesPerSecond`** `number` `default: 30`
  The amount of frames per second the terminal presenter will try to achieve. There are some optimizations to only render what is necessary so this can in theory be higher than the actual refresh rate of the terminal but after 30 it's not really noticeable.

- **`relativeDecorationPath`** `boolean` `default: true`
  Reduces where the logs are coming from to a relative path to the project root.

#### `present()`

Starts the terminal presenter. This will start presenting all documents and hook into the console to be decorated.

#### `restore()`

Stops the terminal presenter. This will stop presenting all documents and unhook from the console.

#### `printString(subject: string)`

Use this to print anything above the real time documents. This will be printed directly and will not be captured the same as console.log ones.

#### `printDocument(descriptor: Object)`

Use this to print a document above the real time documents. This will be printed directly and will not be captured the same as console.log ones. See [Descriptor](https://github.com/universal-packages/universal-terminal-document?tab=readme-ov-file#descriptor) for more information.

#### `appendRealTimeDocument(id: string, descriptor: Descriptor)`

Sets a document to be presented in real time in the terminal below all coming logs and after all other presented documents. See [Descriptor](https://github.com/universal-packages/universal-terminal-document?tab=readme-ov-file#descriptor) for more information.

#### `prependRealTimeDocument(id: string, descriptor: Descriptor)`

Sets a document to be presented in real time in the terminal above all coming logs and before all other presented documents.See [Descriptor](https://github.com/universal-packages/universal-terminal-document?tab=readme-ov-file#descriptor) for more information.

#### `updateRealTimeDocument(id: string, descriptor: Descriptor)`

Updates a document that is already being presented in the terminal. [Descriptor](https://github.com/universal-packages/universal-terminal-document?tab=readme-ov-file#descriptor) for more information.

#### `removeRealTimeDocument(id: string)`

Removes a document and stops presenting it in the terminal.

#### `clearScreen()`

Clears the terminal screen if configured in options.

#### `captureConsole()`

Captures the output of the console to be decorated, useful for not realtime functionality but still want to decorate the output.

#### `releaseConsole()`

Releases the output of the console to work as normal.

## Typescript

This library is developed in TypeScript and shipped fully typed.

## Contributing

The development of this library happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving this library.

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing Guide](./CONTRIBUTING.md)

### License

[MIT licensed](./LICENSE).
