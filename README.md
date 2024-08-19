# Language Features for Ungrammar files

[Ungrammar](https://github.com/rust-analyzer/ungrammar) is a novel data format
for defining concrete syntax trees. This project aims to integrate Ungrammar
language support into VS Code, providing features to streamline the creation
and modification of `.ungram` files. By offering a dedicated language
experience within the editor, we aim to simplify the development process for
users working with this syntax definition format.

![Ungrammar within VS Code](https://github.com/user-attachments/assets/663b32a8-7c3b-41a1-a2b7-03f45418229b)

## Features

### IntelliSense and Validation

We offer up node name suggestions as you type with IntelliSense. You can also
manually see suggestions with the Trigger Suggestions command (`Ctrl+Space`).

We also perform structural and value verification giving you red squiggles.
To disable validation, use the `ungrammar.validate.enable`
[setting](https://code.visualstudio.com/docs/getstarted/settings).

![IntelliSense](https://github.com/user-attachments/assets/1d35606b-8f3b-434e-88c6-a7fcac0a8c66)

### Quick Navigation

Ungrammar files can get large and we support quick navigation to properties
using the Go to Symbol command (`Ctrl+Shift+O`).

![Quick Navigation](https://github.com/user-attachments/assets/f5a016fe-dd28-4535-91b8-19a2abb7b242)

### Hovers

When hovering over nodes within an Ungrammar data structure, detailed
context-specific information is displayed, aiding in understanding the code's
structure and relationships.

![Hover](https://github.com/user-attachments/assets/87199a8d-335a-4322-96d1-7207eee5958e)

### Formatting

You can format your Ungrammar document using `Shift+Alt+F` or Format Document
from the context menu. To disable validation, use the
`ungrammar.format.enable`
[setting](https://code.visualstudio.com/docs/getstarted/settings).

Before formatting:

![Before Formatting](https://github.com/user-attachments/assets/d4c4e991-bacc-4072-a82b-aeac4e2d22ad)

After formatting:

![After Formatting](https://github.com/user-attachments/assets/086f8163-3236-47e4-8a58-3133ea4ce50d)

### Folding

You can fold regions of source code using the folding icons on the gutter
between line numbers and line start. Folding regions are available for all
object and array elements.

Before folding:

![Before Folding](https://github.com/user-attachments/assets/65483173-443b-44d1-a4be-1f58df9eed6a)

After folding:

![After Folding](https://github.com/user-attachments/assets/0a02b8c9-4b8e-4728-a330-9fce97d78c90)

### Annotations

We provide informative annotations displayed above code elements to aid in code
comprehension. These annotations offer quick access to references,
implementation details, and other relevant context, enhancing code navigability
and understanding.

![Annotation](https://github.com/user-attachments/assets/a91f6514-4c62-4117-b750-e06e2af7b037)

### Expand and Shrink Selection

You can extend (`Alt+Shift+→`) or shrink (`Alt+Shift+←`) the current selection
to the encompassing syntactic construct (node, alternative, sequence, group,
etc). It works with multiple cursors.

![Expand 1](https://github.com/user-attachments/assets/661a1912-5f0e-4707-a723-bc577de26669)
![Expand 2](https://github.com/user-attachments/assets/347d9c78-f13e-4563-b502-f8a7a1a73eac)
![Expand 3](https://github.com/user-attachments/assets/e9bcfa34-ec53-4df8-a08c-e7f31d42e085)
![Expand 4](https://github.com/user-attachments/assets/df60330d-2388-4b4f-9706-60c58589de81)
![Expand 5](https://github.com/user-attachments/assets/17d2d1b5-e796-4820-976e-e594f9a608a2)

### Find All References

You can find all references using `Shift+Alt+F12` to show all references of the
item at the cursor location.

![Find All References](https://github.com/user-attachments/assets/4ab19315-26d2-410d-a23f-c81c4af85c41)

### Go to Definition

You can navigate to the definition of an node using `F12`.

Before Go to Definition, we are at line 657:

![Before Go to Definition](https://github.com/user-attachments/assets/fcd9c49a-5753-42e9-8f9b-d2a4dcd9ac4a)

After Go to Definition, we are at line 588:

![After Go to Definition](https://github.com/user-attachments/assets/30a2d19c-cf85-43a4-829e-dd7225f04b60)

### Highlight Related

You can highlight related constructs upon hovering over a node. This feature
displays all references to the selected node within the current file, enhancing
code navigation and understanding.

![Highlight Related](https://github.com/user-attachments/assets/27c02d61-1ab6-4a95-9264-52f86fa48b0a)

### Rename

You can efficiently rename symbols across your codebase using the `F2`.
This powerful feature automatically updates all references to the selected
symbol, ensuring consistency and reducing the potential for errors.

![Rename](https://github.com/user-attachments/assets/edf3feb6-ff96-46df-895f-2e91e1c8d9c6)

### Code Actions

You can enhance your code formatting with our powerful code actions. Quickly
and easily rename nodes to specific casing styles including `snake_case`,
`CONSTANT_CASE`, `camelCase`, and `PascalCase`, ensuring consistent naming
conventions throughout your project.

![Provide Code Actions](https://github.com/user-attachments/assets/b0de9fd8-85c4-4c36-93cb-d3213e5f30fe)

### Semantic Syntax Highlighting

We highlight the code semantically. For example, "Rule" might be colored
differently depending on whether "Rule" is an `Definition` or a `Identifier`. We
does not specify colors directly, instead it assigns a tag (like variable) and
a set of modifiers (like definition) to each token. It's up to the client to
map those to specific colors.

![Semantic Syntax Highlighting](https://github.com/user-attachments/assets/485db7a2-33c8-4774-8bfe-c79976636738)
