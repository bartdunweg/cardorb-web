import { SetsSkeleton, SkeletonFrame } from "@/components/app/skeletons";

export default function Loading() {
    return (
        <SkeletonFrame>
            <SetsSkeleton />
        </SkeletonFrame>
    );
}
