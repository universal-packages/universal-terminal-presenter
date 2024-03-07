We have an array of blocks in typescript:

```ts
export type TextAlignment = 'left' | 'center' | 'right'
export type TextOverflow = 'wrap' | 'truncate'
export type VerticalAlignment = 'top' | 'center' | 'bottom'
export type With = number | 'fit'

export interface Block {
  align?: TextAlignment
  text: string
  overflow: TextOverflow
  verticalAlignment: VerticalAlignment
  width?: With
}

export interface ProcessedBlock {
  text: string
  originalBlock: Block
}

export interface DerivedLine {
  blocks: ProcessedBlock[]
}

const blocks: Block[] = [
  {
    text: 'Part 1',
    width: 20
  },
  {
    align: 'center',
    text: 'This is the second part'
  },
  {
    align: 'right',
    text: 'This is the third part'
  },
  {
    text: 'Part 4',
    width: 'fit'
  }
]
```

We want to build a function that returns a new array of StackLines that represents a probable expansion of the original blocks. We will need to transform the blocks because we have a limited amount of horizontal space to display the text. The function should receive the blocks, the width of the document and the overflow type.

The function signature should be:

```ts
function transformBlocks(blocks: Block[], documentWidth: number): DerivedLine[]
```

The function should return an array of DerivedLines. Each DerivedLine should contain an array of ProcessedBlocks. The text of every block should be truncated or split in more lines if necessary.

These are the rules to follow when transforming the blocks:

- We subtract all the blocks that with form all the blocks that specified a numerical with from the documentWith. We will call this the remainingWidth.

- if the remainingWidth is less or equal to 0 we return an empty array of stack lines.

- We subtract the length of the text of all blocks that specified a 'fit' width from the remainingWidth, if the remainingWidth is less or equal to 0 we return an empty array of stack lines.

- Now we divide the remainingWidth by the number of blocks that didn't specify a width. We will call this the blockWidth. If the block with is less than the number of unspecified width blocks we return an empty array of stack lines.

- We then need find then the maximum height by processing the blocks text and check how many lines will be needed to display the text. The hight depends on the overflowType of the block. For fit blocks the height is 1, for fixed with blocks and the overflowType is 'wrap' (which is the default) we get the number of lines needed to display the text by splitting the text by the block width, but when the block overflowType is 'truncate' we will truncate the text to fit the block fixed width adding an ellipsis at the end of the text.

- When splitting text we should not cut words in half, we should split the text by the last space before the block width.

- The maximum height is the number of stack lines that we will return in the final array of stack lines. every stack lines has the same number of blocks that represent a split part of the original block text or empty string for when a verticalAlignment is needed.

- The we start processing blocks texts, if the align is 'left' when is just a word that fits in the block width we should add the remaining space to the right of the word, if the align is 'right' we should add the remaining space to the left of the word, if the align is 'center' we should add the remaining space to the left and right of the word, the same applies for when we split text into more lines, every line receives the same treatment.

- Then we apply the verticalAlignment to the text, if the verticalAlignment is 'top' and the number of lines needed to display the text is less than the maximum height we should set blocks at the bottom of the stack lines as empty strings, if the verticalAlignment is 'bottom' and the number of lines needed to display the text is less than the maximum height we should set blocks at the top of the stack lines as empty strings, if the verticalAlignment is 'center' and the number of lines needed to display the text is less than the maximum height we should set blocks at the top and bottom of the stack lines as empty strings.
