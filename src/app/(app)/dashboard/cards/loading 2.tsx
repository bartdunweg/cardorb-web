import { CardsSkeleton, SkeletonFrame } from "@/components/app/skeletons";

export default function Loading() {
    return (
        <SkeletonFrame>
            <CardsSkeleton />
        </SkeletonFrame>
    );
}
