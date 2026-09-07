import { describe, expect, it } from "vitest";
import { gradeLabel, splitGrade } from "./graded";

describe("splitGrade", () => {
    it("reads the company and the grade apart", () => {
        expect(splitGrade("PSA 10")).toEqual({ grader: "PSA", grade: "10" });
        expect(splitGrade("BGS 9.5")).toEqual({ grader: "BGS", grade: "9.5" });
    });

    it("forgives the spacing and the case somebody typed", () => {
        // The column is free text and held whatever anybody wrote before this form.
        expect(splitGrade("psa10")).toEqual({ grader: "PSA", grade: "10" });
        expect(splitGrade("  cgc 9  ")).toEqual({ grader: "CGC", grade: "9" });
    });

    it("keeps a company it does not know, rather than dropping it", () => {
        expect(splitGrade("HGA 10")).toEqual({ grader: "HGA", grade: "10" });
    });

    it("keeps anything it cannot read at all, as the grade", () => {
        // Visible and editable beats silently gone.
        expect(splitGrade("graded, boxed")).toEqual({ grader: "", grade: "graded, boxed" });
    });

    it("is nothing for an empty column", () => {
        expect(splitGrade(null)).toEqual({ grader: "", grade: "" });
        expect(splitGrade("   ")).toEqual({ grader: "", grade: "" });
    });

    it("round-trips what it wrote", () => {
        expect(gradeLabel("PSA", "10")).toBe("PSA 10");
        expect(splitGrade(gradeLabel("BGS", "9.5"))).toEqual({ grader: "BGS", grade: "9.5" });
    });
});
