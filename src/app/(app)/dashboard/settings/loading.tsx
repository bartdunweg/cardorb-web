import { PanelsSkeleton } from "@/components/app/skeletons";

// Settings reads the profile before it draws anything, and its title never depended on that read.
export default function Loading() {
    return <PanelsSkeleton title="Settings" subtitle="Manage your account and preferences." panels={4} />;
}
