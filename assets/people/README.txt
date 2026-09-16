IPSC IT Fest 2026 — portraits
=============================

Drop a photograph here named exactly after the person's slug:

    assets/people/<slug>.jpg

The slugs are the keys of PEOPLE in data/fest.mjs. Run `node build.mjs`
and it prints every portrait still missing, with the filename to use.

Format:  1:1 square crop, 800x800 or larger, head and shoulders, JPEG.
         Photographs are rendered greyscale and come to full colour on hover.

Until a file exists the page draws a labelled frame with the person's
initials in its place, so a missing portrait is visible rather than blank.
