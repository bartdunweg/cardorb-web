import { describe, expect, it } from "vitest";
import { REST, STATIC_POSE, cssVars, poseFromOrientation, poseFromPointer } from "./pose";

const rect = { left: 10, top: 20, width: 200, height: 280 };

describe("pose", () => {
    it("leaves the card flat with the light in the middle at the centre", () => {
        const p = poseFromPointer(110, 160, rect);
        expect(p.rotate).toEqual({ x: 0, y: 0 });
        expect(p.glare).toEqual({ x: 50, y: 50, o: 1 });
        expect(p.background).toEqual({ x: 50, y: 50 });
    });

    it("tilts a seventh of a turn's worth at a corner, the foil squeezed to the middle third", () => {
        const p = poseFromPointer(10, 20, rect);
        expect(p.rotate).toEqual({ x: 14.286, y: -14.286 });
        expect(p.background).toEqual({ x: 37, y: 33 });
        expect(cssVars(p)["--pointer-from-center"]).toBe("1");
    });

    it("keeps a pointer past the edge on the card", () => {
        const p = poseFromPointer(-500, 5000, rect);
        expect(p.glare.x).toBe(0);
        expect(p.glare.y).toBe(100);
    });

    it("reads the phone's tilt within its limits", () => {
        expect(poseFromOrientation(0, 0).rotate).toEqual({ x: 0, y: 0 });
        const p = poseFromOrientation(40, -40);
        expect(p.rotate).toEqual({ x: -16, y: -18 });
        expect(p.glare).toEqual({ x: 100, y: 0, o: 1 });
        expect(p.background).toEqual({ x: 63, y: 33 });
    });

    it("names the ten properties the CSS reads, with their units", () => {
        const vars = cssVars(REST);
        expect(Object.keys(vars)).toHaveLength(10);
        expect(vars["--rotate-x"]).toBe("0deg");
        expect(vars["--pointer-x"]).toBe("50%");
        expect(vars["--card-opacity"]).toBe("0");
        expect(vars["--pointer-from-top"]).toBe("0.5");
    });

    it("has a still pose that shows the foil without a tilt", () => {
        expect(STATIC_POSE.rotate).toEqual({ x: 0, y: 0 });
        expect(STATIC_POSE.glare.o).toBe(1);
    });
});
