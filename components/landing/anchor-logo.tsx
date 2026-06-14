import Image, { type ImageProps } from "next/image";

type AnchorLogoProps = Omit<ImageProps, "src" | "alt"> & {
  alt?: string;
};

export function AnchorLogo({
  alt = "Anchor",
  className,
  ...props
}: AnchorLogoProps) {
  return (
    <Image
      src="/anchor-logo.png"
      alt={alt}
      className={`bg-transparent ${className ?? ""}`}
      unoptimized
      {...props}
    />
  );
}
