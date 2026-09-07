/**
 * A copy is raw or it is graded, and never both.
 *
 * The rule was always there — `grade ?? condition` is what every list shows, and the condition
 * select disabled itself the moment a grade was typed — but it was a rule you discovered by
 * bumping into it. A slab has a grade on it and no condition; a loose card has a condition and no
 * grade. Asking which one first, and then only the question that follows, says that out loud.
 *
 * Nothing had to be migrated for this: of 1,952 rows, 1,928 carry a condition and **none** carries
 * a grade, so there was no shape to keep faith with.
 */

/** The companies that slab a card, as their own labels. */
export const GRADERS = ["PSA", "BGS", "CGC", "SGC", "ACE", "TAG"] as const;

/**
 * The grades they give, highest first, as a person reads them off the slab.
 *
 * Halves down to 8 and whole numbers below: that is where the market stops caring, and a list
 * long enough to scroll past is a list nobody finds their grade in.
 */
export const GRADES = ["10", "9.5", "9", "8.5", "8", "7", "6", "5", "4", "3", "2", "1"] as const;

/** The one string the row stores, as a collector would write it. */
export const gradeLabel = (grader: string, grade: string): string => [grader.trim(), grade.trim()].filter(Boolean).join(" ");

/**
 * The company and the grade back out of that string.
 *
 * Loose on purpose, because the column is free text and held whatever anybody typed before this
 * form existed — "PSA 10", "psa10", "BGS 9.5". A value it cannot read comes back as a grade with
 * no company, which keeps it visible and editable rather than silently dropped.
 */
export function splitGrade(value: string | null | undefined): { grader: string; grade: string } {
    const v = (value ?? "").trim();
    if (!v) return { grader: "", grade: "" };
    const m = /^([A-Za-z]+)\s*([\d.]+)$/.exec(v);
    if (!m) return { grader: "", grade: v };
    const grader = GRADERS.find((g) => g.toLowerCase() === m[1]!.toLowerCase()) ?? m[1]!.toUpperCase();
    return { grader, grade: m[2]! };
}
