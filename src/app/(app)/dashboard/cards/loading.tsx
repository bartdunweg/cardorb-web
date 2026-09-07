import { ListSkeleton } from "@/components/app/skeletons";

// The page's own frame while it fetches; see skeletons.tsx.
export default function Loading() {
    return <ListSkeleton title="Collection" />;
}
