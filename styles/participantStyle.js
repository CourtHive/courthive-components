import { css } from "@stitches/core";

export const participantStatus = css({
  margin: "2.5px 0",
});

export const participantStyle = css({
  justifyContent: "flex-start",
  alignItems: "center",
  whiteSpace: "nowrap",
  fontWeight: 500,
  display: "flex",
});

export const participantNameStyle = css({
  textTransform: "$participant$textTransform",
  marginInlineStart: "$space$2",
  marginInlineEnd: "$space$2",
  fontSize: "0.875rem",
  fontWeight: 500,
  variants: {
    variant: {
      winner: {
        fontWeight: 700,
        color: "$winnerName",
      },
      loser: {
        fontWeight: 500,
      },
    },
  },
});

export const participantTypeStyle = css({
  "&::WebkitScrollbar": { display: "none" },
  justifyContent: "space-between",
  flexDirection: "column",
  marginInlineEnd: "0rem",
  scrollbarWidth: "none",
  overflowX: "scroll",
  fontWeight: 500,
  display: "flex",
  width: "100%",
  variants: {
    variant: {
      doubles: {
        marginTop: "0.25rem",
        fontSize: "0.75rem",
        lineHeight: "1rem",
      },
    },
  },
});

export function getParticipantContainerStyle({
  participantHeight,
  drawPosition,
  sideNumber,
}) {
  const participantContainerStyle = css({
    display: "flex",
    position: "relative",
    flexGrow: 1,
    height: participantHeight,
    boxSizing: "border-box",
    minWidth: "15rem",
    alignItems: "center",
    backgroundColor: "$matchUp",
    justifyContent: "space-between",
    paddingInlineStart: "0.75rem",
    paddingInlineEnd: "0rem",
    "& p": {
      fontFamily: "Sharp Sans, Arial, sans-serif",
      color: "$color",
    },
    variants: {
      sideNumber: {
        1: {
          borderBottom: "1px solid $internalDividers",
        },
      },
    },
  });

  return participantContainerStyle({
    sideNumber,
    css: drawPosition && {
      "&:before": {
        backgroundColor: "$backgroundColor",
        content: `${drawPosition}`,
        justifyContent: "center",
        alignContent: "center",
        insetInlineStart: -10,
        position: "absolute",
        color: "#55AFFE",
        display: "flex",
        width: 20,
      },
    },
  });
}
