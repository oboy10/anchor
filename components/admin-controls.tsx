"use client";

import { reseedAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function AdminControls() {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        await reseedAction();
        window.location.reload();
      }}
    >
      Reseed demo data
    </Button>
  );
}
