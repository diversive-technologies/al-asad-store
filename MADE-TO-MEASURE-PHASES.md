# Stitched to size — what we built, in plain words

This explains the six pieces of work behind **"Stitched to your size"**: what each
one was for, the problem it ran into, how it was solved, and why the obvious
alternative was not taken.

No technical knowledge is needed to read this.

**The short version.** A customer can now measure a kameez they already own — or
copy the numbers off their tailor's card — see every figure checked and explained
back to them, and save it. The shop can change the measurements it asks for
without a developer. And the store can tell the difference between a number that
is impossible and a number that is merely unusual.

**One caution, and it matters for any demo.** Every actual *number* in the system
is ours, not the client's: the smallest and largest values allowed, which
measurements are required, and the rules about what looks unusual. They are
sensible placeholders, clearly marked as such in the code. They are replaced by
data, not by rebuilding anything, the day the client sends their written list.

---

## Phase 1 — Ask in the client's own order

**What it was about.** Putting the measurements in the order the client listed
them, with a plain sentence under each saying where to put the tape.

**The problem.** One number can mean two different things. A chest measured across
a kameez lying folded on a table reads about 19.5 inches; the same chest measured
all the way round reads 39. The first version decided which was meant by looking at
the picture drawn on screen — and that made the client's own example numbers look
wrong, and could not express a collar at all.

**How it was solved.** Every measurement now carries three separate facts, kept
apart: what shape to draw on the diagram, whether the number written down is a
half or a whole, and whether it describes the body or the finished garment. The
store does any doubling itself, so the customer only ever types what they see on
the tape.

**Why not the obvious alternative.** We could have asked every customer for the
full way-round figure and avoided halves entirely. Nobody measures a shirt that
way — you cannot get a tape around a garment lying flat — and the client's own
card does not either. It would have made the form harder for everyone in order to
make the code simpler.

---

## Phase 2 — The list of measurements became data

**What it was about.** Moving the list of what to measure out of the program and
into the shop's own content, like product photographs or prices.

**The problem.** Adding a garment, renaming a measurement, or changing an
instruction meant a developer editing the program and re-releasing it. That is a
bottleneck for ever.

**How it was solved.** The page now asks the backend "what do I measure for a
kameez shalwar?" and draws whatever it is given, in whichever language the
customer is reading. If a row of that data is broken, the page says it cannot load
the guide rather than showing a half-built form — and if only the drawing position
is wrong, the measurement still works, minus its marker.

**Why not the obvious alternative.** Keeping the list in the program is quicker on
the first day and slower on every day after. The measurement list is exactly the
kind of thing a tailor will want changed.

---

## Phase 3 — Check, show, then save

**What it was about.** Actually keeping a customer's measurements, with the store
checking them first and showing them back before anything is stored.

**The problem.** Two things. A browser can be bypassed, so checks done only on the
page are decoration. And measurements get cut into cloth — if a saved set is
quietly overwritten later, nobody can tell what an order was cut from.

**How it was solved.** The customer presses "Check my measurements"; the store
checks them and answers with reasons, not sentences, so the wording stays ours and
works in both languages. A passed check shows every figure twice — as typed, and
as it will be kept — before the save. Each save is a new version and the one it
replaces is kept, marked as replaced.

**Why not the obvious alternative.** Saving straight from the form would be one
screen shorter. But a half measurement typed as a whole one is the single most
common mistake in this trade, and it is invisible until the garment comes back
wrong. The review screen is where that gets caught.

---

## Phase 4 — Copy my tailor's card

**What it was about.** Many customers already have a card from their tailor, with
the numbers written down. They should be able to copy those instead of measuring.

**The problem.** A card does not follow the same conventions as a garment on a
table. On the client's own example, "teera 8.5" is half the shoulder — the same
figure typed into the garment form would be refused as impossible.

**How it was solved.** The card is its own separate list, with its own
measurements and its own conventions, chosen from a "How are you measuring?"
switch. Each instruction says plainly what the store does with the figure — "we
read the card's chest as half the way round: 19.5 is kept as 39" — and the
customer types exactly what the card says, fractions included. A photo of the card
can sit beside the form while they copy it; it stays on their own phone and is
never sent to us.

**Why not the obvious alternative.** We could have reused the garment list and
asked customers to convert the numbers themselves. That pushes arithmetic onto the
customer at the exact moment they are least sure — and a mistake there is not
caught by anything, because the converted number looks perfectly reasonable.

---

## Phase 5 — Collar, ban and cuff

**What it was about.** Asking how the garment is finished, because that decides
what can be measured at all.

**The problem.** A sleeve with no cuff has no cuff to measure. Asking for it
anyway produces either an empty required field or a made-up number.

**How it was solved.** The finishing choices are offered above the measurements.
Choosing a plain sleeve removes the cuff and asks for the sleeve opening instead;
choosing a collar removes the band's width and shape. The drawing changes to match,
so the picture never shows a garment the customer is not describing. The choices
are saved alongside the measurements, because a tailor needs to know what the
figures were taken for.

**Why not the obvious alternative.** Asking for everything and ignoring the extras
later would leave a record containing measurements of parts that do not exist.

---

## Phase 6 — The tailor's rules

**What it was about.** Telling apart a number that is impossible from a number
that is merely unusual — and handling the two differently.

**The problem.** Refusing everything unusual is wrong: people genuinely are
different shapes, and a shop that argues with its customers loses them. Accepting
everything silently is worse: cloth gets cut, and a stitched order cannot be
returned.

**How it was solved.** Two kinds of rule, both held by the store as data:

- **A rule that refuses.** A hem narrower than the chest is a kameez nobody can
  put on. The save is stopped and the field says why.
- **A rule that asks.** A shoulder that looks small beside the chest gets a quiet
  note under the field — never red, never called an error — offering two honest
  answers: measure it again, or keep your number. Keeping it is recorded against
  that rule by name, so the workshop can see the customer was asked and stood by
  their figure.

A note never shows a "correct" number to copy, and no part of this guesses a
measurement on the customer's behalf.

**Why not the obvious alternative.** The tempting shortcut is to show the expected
figure — "we usually see 18 here". Customers would simply type it, and the store
would end up with its own guess recorded as the customer's measurement. That is
the one outcome worth designing against.

---

## Two problems found late, and worth recording

**A figure typed on an Urdu keyboard disappeared.** The store reads Urdu numerals
and card fractions, converting them before checking. But the page compared what
the customer had typed against the converted figure — so for anyone using the Urdu
keyboard, pressing "Check my measurements" appeared to do nothing at all, with no
error and no explanation. Both sides now read the number the same way.

**Three of our placeholder rules could not be satisfied.** The "looks unusual"
ratios were chosen without checking them against the largest values the form
accepts. Above a certain chest size, no shoulder figure the form allowed could
satisfy the rule: the customer would measure again, be told the same thing, and
have no way out but to keep a number against a rule that was impossible. The
limits were widened, and there is now an automatic check that every rule can
always be satisfied.

Both were found by review and by using the screens by hand, not by the automated
tests — which is the honest argument for continuing to do both.

---

## What the client still needs to send

1. **Three to five real measurement cards** (names and numbers blacked out),
   including UK ones — to settle which figures are halves, which are wholes, and
   how fractions are written.
2. **The written list of measurements**: name, order, required or optional, half
   or whole, body or garment, smallest and largest sensible value.
3. **The rules between measurements** — which are absolute, which are only worth a
   second look, and how far off is too far in each direction.
4. **What the finishing words mean**: narrow and wide ban, round and square ends,
   single and double cuff, and which is standard.

Until those arrive, every number in the system is our placeholder, and any demo
should say so out loud.
