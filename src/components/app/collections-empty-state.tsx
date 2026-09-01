"use client";

import { Folder, Plus } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Button } from "@/components/base/buttons/button";

// Shown on the dashboard while the user has no collections. The buttons are placeholders until
// the create-collection / add-card flows exist.
export function CollectionsEmptyState() {
    return (
        <EmptyState size="lg">
            <EmptyState.Header>
                <EmptyState.FeaturedIcon icon={Folder} color="gray" />
            </EmptyState.Header>
            <EmptyState.Content>
                <EmptyState.Title>No collections yet</EmptyState.Title>
                <EmptyState.Description>Create your first collection to start organizing your trading cards.</EmptyState.Description>
            </EmptyState.Content>
            <EmptyState.Footer>
                <Button color="secondary" iconLeading={Plus}>
                    Add card
                </Button>
                <Button iconLeading={Plus}>Create collection</Button>
            </EmptyState.Footer>
        </EmptyState>
    );
}
