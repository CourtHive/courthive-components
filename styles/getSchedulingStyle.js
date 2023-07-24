import { css } from "@stitches/core";

export function getSchedulingStyle({ scheduleInfo }) {
  const schedulingStyle = css({
    display: "flex",
    width: "100%",
    boxSizing: "border-box",
    alignItems: "center",
    backgroundColor: "#F8F9F9",
    justifyContent: "space-between",
    padding: "0.5rem",
    color: "#7F8080",
    height: scheduleInfo - 1,
    borderBottom: "1px solid darkgray",
  });
  return schedulingStyle({ scheduleInfo });
}
