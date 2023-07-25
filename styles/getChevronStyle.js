import { css } from "@stitches/core";

export function getChevronStyle({
  isDoubles,
  participantHeight,
  winnerChevron,
}) {
  const chevronHeight = (isDoubles ? 0.35 : 0.3) * participantHeight;

  const chevronStyle = css({
    variants: {
      variant: {
        winner: {
          "&:before": {
            borderTop: `${chevronHeight}px solid transparent`,
            borderBottom: `${chevronHeight}px solid transparent`,
            borderInlineStart: "8px solid #008f70",
            position: "absolute",
            insetInlineStart: 0,
            display: "block",
            content: "",
          },
        },
      },
    },
  });

  return chevronStyle({ variant: winnerChevron ? "winner" : undefined });
}
