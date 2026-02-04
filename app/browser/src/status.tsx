import { dateToLocal } from "./data.ts";

type statusClass = "info" | "warning" | "error";
export const statusState = (m: string = "", c: statusClass = "info") => {
  return { m, c, d: new Date() };
};

export const Status = (props = statusState()) => (
  <>
    {props.m && <p class={props.c}>{dateToLocal(props.d)} -- {props.m}</p>}
  </>
);
