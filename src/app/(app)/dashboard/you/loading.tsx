import { PanelsSkeleton } from "@/components/app/skeletons";

// Your own page: the name and the address are what is being fetched, so only the frame is known.
export default function Loading() {
    return <PanelsSkeleton title=" " panels={2} />;
}
