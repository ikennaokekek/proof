---
name: GitHub API commit objects
description: Commit-object details needed when publishing through GitHub's Git Data API and aligning local refs.
---

GitHub Git Data API commits may display author and committer dates normalized to UTC while hashing the account's original timezone offset. API-created commit messages may also omit the final newline that standard local Git commits include.

**Why:** Reconstructing an API-created commit from the normalized response produced a different SHA until the original timezone offset and no-final-newline message bytes were used.

**How to apply:** When Git CLI authentication is unavailable and publication uses the Git Data API, trust the returned remote SHA and tree. If local ref alignment is required, test commit-object timezone and final-newline variants against that SHA rather than republishing or force-updating the remote tree.