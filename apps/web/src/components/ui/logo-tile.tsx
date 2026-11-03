/**
 * Product logo placeholder.
 *
 * Provider marks are third-party trademarks; the brand is not cleared yet
 * (spec §3.1) and provider logo usage requires per-product brand-guideline
 * review (§11.6). Until authorization evidence and logo-usage notes exist for
 * each product, we render a generated monogram tile instead of a trademark.
 */

export function LogoTile({
  monogram,
  hue,
  size = "md",
  label,
}: {
  monogram: string;
  hue: string;
  size?: "sm" | "md" | "lg";
  label: string;
}) {
  const dimension =
    size === "lg" ? "size-16 text-h3" : size === "sm" ? "size-9 text-caption" : "size-12 text-body";

  return (
    <span
      role="img"
      aria-label={`${label} logo placeholder`}
      className={`inline-flex shrink-0 items-center justify-center rounded-card border font-semibold tracking-tight ${dimension}`}
      style={{
        backgroundColor: `hsl(${hue} 70% 55% / 0.14)`,
        borderColor: `hsl(${hue} 70% 55% / 0.28)`,
        color: `hsl(${hue} 75% ${hue === "45" ? "45%" : "62%"})`,
      }}
    >
      {monogram}
    </span>
  );
}
