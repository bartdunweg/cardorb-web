/**
 * The pressed button of a kit ButtonGroup, made visible. The kit marks it with a fill one step off
 * white (#FAFAFA on #FFFFFF, 1.04:1), which is no state anyone can see; a dark ring and the
 * secondary fill carry it, at the 3:1 a state indicator needs (WCAG 1.4.11).
 */
export const SEGMENT_SELECTED = "selected:z-10 selected:bg-secondary selected:text-primary selected:ring-2 selected:ring-fg-primary";
