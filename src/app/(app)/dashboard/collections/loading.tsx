import { FoldersSkeleton, SkeletonFrame } from "@/components/app/skeletons";

export default function Loading() {
    return (
        <SkeletonFrame>
            <FoldersSkeleton />
        </SkeletonFrame>
    );
}
