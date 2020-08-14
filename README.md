# [PH] Strider Alt-Tab
An alt-tab replacement extension based on the great (but not really maintained)
dmo60/CoverflowAltTab.

**Heavily work-in-progress.** Core parts were rewritten from scratch, and only
the Timeline switcher from Coverflow Alt-Tab was ported. Memory leaks,
instability or missing functionality is to be expected.

## Installation
#### GNOME Shell
At least version 3.36 of GNOME Shell is required for the extension to work.

To install the development version, clone the repository and make sure
you have the TypeScript compiler installed (version 3.8 or greater).

  - `make compile`: compiles the JavaScript part of the extension.
  - `make install`: installs previously compiled tree.
  - `make enable`: enables the extension if installed.
  - `make disable`: disables the extension.
  - `make restart-shell`: convieniently reloads the shell.
  
## Customization
None at the moment.

## License
[PH]Strider Alt-Tab is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.
