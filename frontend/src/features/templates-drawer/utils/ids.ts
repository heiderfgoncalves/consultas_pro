import { nanoid } from "nanoid";
export const newId = (prefix = "el") => `${prefix}_${nanoid(8)}`;