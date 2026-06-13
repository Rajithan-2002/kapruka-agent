import { AsyncLocalStorage } from "async_hooks";
import { GodModeContext } from "./types";

export const godModeStorage = new AsyncLocalStorage<GodModeContext>();
