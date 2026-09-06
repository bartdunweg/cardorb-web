import { MobileSearchSheet } from "@/components/app/mobile-search";

// The top of Home and Browse on a phone: the card search with its scan button; the sheet it opens also lists every set.
export function MobileTopRow() {
    return (
        <div className="lg:hidden">
            <MobileSearchSheet />
        </div>
    );
}
