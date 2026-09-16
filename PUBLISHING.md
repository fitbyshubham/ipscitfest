# Before this repository is ever made public

**It currently contains personal data about named minors. Do not publish it as
it stands.**

`data/fest.mjs` holds, and the rendered pages therefore show:

- the real names of roughly two dozen students, most of them under 18
- short biographies attached to those names
- personal letters written by named students
- at least one email address
- portrait photographs of those students, in `assets/people/`

That is appropriate for an internal working repository for the fest. It is not
appropriate for a public one, and it is not mine to publish on their behalf.

## What to strip first

The interesting part of this project is the **generator**, not the roster. To
publish it, replace the personal data with plausible fictional entries and keep
everything else:

1. In `data/fest.mjs`, replace the `PEOPLE`, `COMMITTEE`, `EVENT_STAFF`, `TEAM`
   and `LETTERS` entries with invented names and placeholder text.
2. Remove the email address.
3. Delete every photograph in `assets/people/`. The build falls back to the
   drawn initials frame for anyone without one, so nothing breaks.
4. Re-run `node build.mjs` and grep `site/` for any remaining real name before
   pushing.

The build system, the data-driven page model, the asset fingerprinting and the
event content all survive that edit untouched, and they are what actually
demonstrates the engineering.

## Git history

Deleting a file does not remove it from history. Anyone who can see the
repository can still check out an old commit and find the names, letters and
photographs. So the public version should be a **new repository** made from the
stripped files with a fresh first commit, not this one flipped to public.
