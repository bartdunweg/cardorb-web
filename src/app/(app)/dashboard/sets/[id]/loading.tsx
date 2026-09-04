import { SetSkeleton, SkeletonFrame } from "@/components/app/skeletons";

export default function Loading() {
    return (
        <SkeletonFrame>
            <SetSkeleton />
        </SkeletonFrame>
    );
}
