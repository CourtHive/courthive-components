import { css } from "@stitches/core";

export function getChevronStyle({ 
  winnerChevron, 
  isDoubles 
}: { 
  winnerChevron?: boolean; 
  isDoubles?: boolean 
}): string {
  const chevronHeight = (isDoubles ? 0.4 : 0.3) * 2;

  const chevronStyle = css({
    variants: {
      variant: {
        winner: {
          "&::before": {
            borderTop: `${chevronHeight}rem solid transparent`,
            borderBottom: `${chevronHeight}rem solid transparent`,
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
