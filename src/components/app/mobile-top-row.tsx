import { MobileSearchSheet } from "@/components/app/mobile-search";

// The top of Browse on a phone: the card search with its scan button.
export function MobileTopRow() {
    return (
        <div className="lg:hidden">
            <MobileSearchSheet />
        </div>
    );
}
