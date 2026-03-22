import type { SingleParser } from "nuqs";
import { createParser, parseAsArrayOf, parseAsString } from "nuqs";

import type { ExtendedColumnSort } from "../types/data-table";

export function getSortingStateParser<TData>(
  columnIds: string[],
): SingleParser<ExtendedColumnSort<TData>[]> {
  const baseParser = parseAsArrayOf(parseAsString, ",");

  return createParser<ExtendedColumnSort<TData>[]>({
    parse: (value: string | string[] | undefined) => {
      const str = typeof value === "string" ? value : Array.isArray(value) ? value.join(",") : undefined;
      const parsed = str !== undefined ? baseParser.parse(str) : null;
      if (!parsed) return null;

      return parsed
        .map((v) => {
          const [id, direction] = v.split(":");
          if (!id || !columnIds.includes(id)) return null;
          return { id, desc: direction === "desc" } as ExtendedColumnSort<TData>;
        })
        .filter((sort): sort is ExtendedColumnSort<TData> => sort !== null);
    },
    serialize: (value: ExtendedColumnSort<TData>[] | null) => {
      if (!value || value.length === 0) return "";
      return value.map((sort) => `${sort.id}:${sort.desc ? "desc" : "asc"}`).join(",");
    },
    eq: (a, b) => {
      if (!a && !b) return true;
      if (!a || !b) return false;
      if (a.length !== b.length) return false;
      return a.every((sort, i) => sort.id === b[i]?.id && sort.desc === b[i]?.desc);
    },
  });
}
