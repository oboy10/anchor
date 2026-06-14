"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Button, type ButtonProps } from "./ui/button";
import { PacketModal } from "./packet-modal";
import type { Credential } from "@/types";

export interface BuildPacketButtonProps {
  residentId: string;
  credentials: Credential[];
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

/** Button that opens the share-packet wizard. Reused on records + packets. */
export function BuildPacketButton({
  residentId,
  credentials,
  label = "Share my profile",
  variant = "primary",
  size = "md",
}: BuildPacketButtonProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)}>
        <Send className="size-4" aria-hidden />
        {label}
      </Button>
      {open ? (
        <PacketModal
          residentId={residentId}
          credentials={credentials}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
