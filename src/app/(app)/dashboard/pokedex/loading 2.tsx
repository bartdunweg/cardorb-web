import { DexSkeleton, SkeletonFrame } from "@/components/app/skeletons";

export default function Loading() {
    return (
        <SkeletonFrame>
            <DexSkeleton />
        </SkeletonFrame>
    );
}
