import type { ForgetWrite } from "@/lib/cache-scopes";
import { forgetMineQuietly } from "@/lib/forget-mine";

/**
 * After a write that re-read nothing in its action: the cache forgotten quietly, then the page
 * drawn again from after the write. The page is drawn only once the cache is gone, or it would
 * read the old answer.
 *
 * Its own module, not `forget-mine.ts`: tests stub `forgetMineQuietly` by mocking that path, and
 * this reaches it through the import, so the stub still applies.
 */
export const forgetMineThenRefresh = (write: ForgetWrite, router: { refresh: () => void }) => forgetMineQuietly(write).then(() => router.refresh());
