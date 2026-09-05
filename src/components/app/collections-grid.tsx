"use client";

import type { FC, ReactNode } from "react";
import { useState } from "react";
import { Folder, Heart, Plus } from "@untitledui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { createCollection } from "@/app/(app)/dashboard/collections/actions";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import type { CollectionSummary } from "@/lib/collections";
import { cx } from "@/utils/cx";

// A tile with a count, or with a line of its own for a view that is not a pile of cards.
// `row` puts the icon beside the text instead of above it: for a tile that spans a phone's width,
// where a stacked icon would leave the right two thirds empty.
function FolderCard({
    href,
    icon,
    name,
    count,
    detail,
    row = false,
}: {
    href: string;
    icon: FC<{ className?: string }>;
    name: string;
    count?: number;
    detail?: string;
    row?: boolean;
}) {
    return (
        <Link
            href={href}
            className={cx(
                "flex pressable gap-3 rounded-xl bg-primary p-4 shadow-border outline-focus-ring transition-[color,background-color,box-shadow] hover:bg-secondary hover:shadow-border_hover focus-visible:outline-2",
                row ? "flex-row items-center xs:flex-col xs:items-stretch" : "flex-col",
            )}
        >
            <FeaturedIcon color="gray" theme="modern-neue" size="lg" icon={icon} />
            <div className="flex flex-col">
                <span className="truncate text-sm font-semibold text-primary">{name}</span>
                <span className="text-sm text-tertiary">{detail ?? `${count} card${count === 1 ? "" : "s"}`}</span>
            </div>
        </Link>
    );
}

// Beside the page title: a plus on a phone, the words from sm up. Both open the dialog below.
export function NewCollectionButton() {
    return (
        <>
            <CreateCollectionModal>
                <Button iconLeading={Plus} aria-label="New folder" className="sm:hidden" />
            </CreateCollectionModal>
            <CreateCollectionModal>
                <Button iconLeading={Plus} className="max-sm:hidden">
                    New folder
                </Button>
            </CreateCollectionModal>
        </>
    );
}

// The create-collection dialog, opened by whatever trigger is passed as children.
function CreateCollectionModal({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const create = async (close: () => void) => {
        setSaving(true);
        setError(null);
        const res = await createCollection(name);
        setSaving(false);
        if (res.ok) {
            setName("");
            close();
            router.refresh();
        } else {
            setError(res.error);
        }
    };

    return (
        <DialogTrigger>
            {children}
            <ModalOverlay>
                <Modal className="max-w-sm">
                    <Dialog>
                        {({ close }) => (
                            <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl glass-thick p-6 shadow-xl ring-1 ring-secondary">
                                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                    New folder
                                </AriaHeading>
                                <Input label="Name" value={name} onChange={setName} placeholder="e.g. Charizards" />
                                {error ? (
                                    <p role="alert" className="text-sm text-error-primary">
                                        {error}
                                    </p>
                                ) : null}
                                <div className="flex justify-end gap-2">
                                    <Button color="secondary" onClick={close}>
                                        Cancel
                                    </Button>
                                    <Button onClick={() => create(close)} isLoading={saving}>
                                        Create
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </DialogTrigger>
    );
}

export function CollectionsGrid({ collections, wishlistCount }: { collections: CollectionSummary[]; wishlistCount: number }) {
    const hasCollections = collections.length > 0;

    return (
        <div className="flex flex-1 flex-col gap-6">
            {/* The wishlist is not a folder, but on a phone this is where it lives: the Collection tab holds only
                what is owned, and the sidebar that lists it is not there. */}
            <div className="lg:hidden">
                <FolderCard href="/dashboard/wishlist" icon={Heart} name="Wishlist" count={wishlistCount} row />
            </div>

            {hasCollections ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {collections.map((c) => (
                        <FolderCard key={c.id} href={`/dashboard/collections/${c.id}`} icon={Folder} name={c.name} count={c.count} />
                    ))}
                </div>
            ) : (
                // On a phone the hub above is the page and the plus beside the title is the way in; the
                // empty state would only push the tab bar's worth of nothing under three tiles.
                <div className="hidden lg:contents">
                    <AppEmptyState icon="folder" title="No folders yet" description="Group your cards into folders you can jump to from the sidebar.">
                        <CreateCollectionModal>
                            <Button iconLeading={Plus}>Create folder</Button>
                        </CreateCollectionModal>
                    </AppEmptyState>
                </div>
            )}
        </div>
    );
}
