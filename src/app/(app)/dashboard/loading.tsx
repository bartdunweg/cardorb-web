import { HomeSkeleton, SkeletonFrame } from "@/components/app/skeletons";

// Home while its stats and history fetch. Each list page under here has its own outline.
export default function DashboardLoading() {
    return (
        <SkeletonFrame>
            <HomeSkeleton />
        </SkeletonFrame>
    );
}
