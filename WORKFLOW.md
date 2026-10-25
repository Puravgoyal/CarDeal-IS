# Git, TDD and review workflow

## Git scope

Repository https://github.com/Puravgoyal/CarDeal-IS.git. Use local identity Puravgoyal <puravgoyal83@gmail.com>; never change global Git settings. Inspect branch, remote and uncommitted changes. Do not overwrite work, rewrite history or force-push.

Stage Zero prepares documents and a proposed commit. No automatic application implementation, commits or pushes.

## TDD

Preserve meaningful Red and Green commits, plus Refactor when useful. Do not squash away required evidence. Labeled Red commits may fail their new tests; final reviewed tip must pass. Never fabricate retrospective history or test outcomes.

Examples: test(auth): capture registration (red); feat(auth): persist regular users (green); refactor(auth): separate validation.

## AI attribution

Every AI-assisted commit needs accurate attribution, including documentation, tests, debugging and incorporated review. The assignment requires two empty lines before the first co-author trailer. Consecutive trailers follow. The address below follows the assignment's example convention, not a verified tool account.

Example message:

docs: establish project requirements and development guides

ChatGPT assisted with interpreting the assignment and drafting these guides.


Co-authored-by: ChatGPT <AI@users.noreply.github.com>

When Gemini also contributes to the commit, describe its actual contribution and add Co-authored-by: Gemini <AI@users.noreply.github.com> on the next trailer line. Use a commit-message file to preserve line breaks; inspect the resulting commit. Do not claim manual candidate work that did not happen. Record the actual model label shown in Antigravity, not an assumed informal name.

## Raw conversations

Root PROMPTS.md requires raw unedited chats or public chat links, including this planning/review conversation and Antigravity chats. Summaries and prompt templates do not substitute. Obtain genuine exports/links from the candidate when unavailable; never reconstruct dialogue.

Keep secrets out of chats and commits. If existing logs contain secrets, resolve exposure/disclosure before publication; do not silently call edited logs unedited. PROMPTS.md stays incomplete until actual records are present.

## Report for every reviewed push

1. Actual commit range, purpose and requirements addressed.
2. Changes made.
3. Issues found: file/line, expected/observed behavior and impact. Say when none were identified; never invent issues.
4. How found: reproduction, failing test, browser observation or code inspection.
5. Fix and why it addresses the cause.
6. Exact verification commands, real outcomes and checks not run.
7. Limitations and next slice.
8. Plain-language explanation the candidate can understand and discuss.

Check for placeholders, fake persistence, skipped/weakened tests, swallowed errors, nonfunctional UI and unjustified dependencies. Separate proven defects from suggestions. Reproduce defects and add meaningful regression tests.

## Final evidence

Test report records tested commit, date, runtime versions, commands and actual results; coverage only when measured. Verify README setup from a fresh checkout. Include real screenshots and exact heading My AI Usage. Candidate supplies their honest reflection; do not invent experiences in their voice.
