# Third-party material

The project's own source follows the existing GPL-3.0 LICENSE. Upstream works retain their licenses.

| Material | License | Source / local notice |
| --- | --- | --- |
| Lexical and @lexical packages 0.52.0 | MIT | https://github.com/facebook/lexical/blob/main/LICENSE ; dependency packages retain license files |
| Tufte CSS 1.9.0 snapshot | MIT | https://github.com/edwardtufte/tufte-css/blob/b5d7b7bbe5ce9c4c50fcfad4f19ee3646cfd7ae1/LICENSE ; licenses/tufte-css-MIT.txt |
| ET Book (planned font asset) | MIT | https://github.com/edwardtufte/et-book/blob/gh-pages/LICENSE ; licenses/et-book-MIT.txt |
| Source Han Serif Korean / 본명조 (R13 proof subset) | SIL OFL 1.1 | https://github.com/adobe-fonts/source-han-serif/blob/release/LICENSE.txt ; licenses/source-han-serif-OFL.txt |
| Source Han Sans Korean / 본고딕 (R13 proof subset) | SIL OFL 1.1 | https://github.com/adobe-fonts/source-han-sans/blob/release/LICENSE.txt ; licenses/source-han-sans-OFL.txt |

Repository-only sample WOFF2 proof subsets (not part of npm package tarballs) are under fixtures/fonts/proof with full OFL notices, FONTLOG and pinned source hashes/commits. Full Korean/CJK production webfonts and ET Book assets remain P4 work. Package prepack copies the root GPL and complete third-party notices/licenses into local tarballs. OFL reserved font naming requirements apply to modified fonts. Do not sell fonts by themselves. Source Han fonts retain OFL rather than being relicensed under the project GPL.

Upstream demonstration images are not redistributed. Use original or separately licensed fixtures and record their provenance before adding them.

Prototype tooling: React/React DOM and Vite retain MIT licenses in their installed dependency packages; Playwright retains Apache-2.0. Test browser binaries are not distributed with the repository.
