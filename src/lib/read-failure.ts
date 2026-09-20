/**
 * What a read that never answered says on screen.
 *
 * Nearly every read that throws here is the Card Orb API answering 503 because a catalogue behind
 * it is down (TCGdex, 2026-09-04). Three screens said "The card service didn't answer" while the
 * set pages, the binders and the sheet all called the same thing "the card catalogue": one fault
 * with two names. This is that sentence, once, in the words the rest of the app uses.
 *
 * It says only what happened, so a screen can add what to do next in its own words: the search
 * states put a Try again button under it, the failed page follows it with how long to wait.
 */
export const CATALOGUE_NOT_ANSWERING = "The card catalogue is not answering.";
