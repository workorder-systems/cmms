import { createParser, parseAsArrayOf, parseAsString } from "nuqs";
import type { ExtendedColumnSort } from "@workspace/ui/types/data-table";

export function getSortingStateParser<TData>(
  columnIds: string[],
): ReturnType<typeof parseAsArrayOf<ExtendedColumnSort<TData>, string>> {
  // Use parseAsArrayOf to get the base array parser
  const baseParser = parseAsArrayOf(parseAsString, ",");
  
  // Create a custom parser that transforms the array of strings to ExtendedColumnSort objects
  return createParser({
    parse: (value: string | string[] | undefined) => {
      // Parse using the base parser
      const parsed = baseParser.parse(value);
      if (!parsed) return null;
      
      // Transform the array of strings to ExtendedColumnSort objects
      return parsed
        .map((value) => {
          const [id, direction] = value.split(":");
          if (!id || !columnIds.includes(id)) return null;
          return {
            id,
            desc: direction === "desc",
          } as ExtendedColumnSort<TData>;
        })
        .filter((sort): sort is ExtendedColumnSort<TData> => sort !== null);
    },
    serialize: (value: ExtendedColumnSort<TData>[] | null) => {
      if (!value || value.length === 0) return null;
      // Serialize back to comma-separated string format
      return value.map((sort) => `${sort.id}:${sort.desc ? "desc" : "asc"}`).join(",");
    },
    eq: (a, b) => {
      if (!a && !b) return true;
      if (!a || !b) return false;
      if (a.length !== b.length) return false;
      return a.every((sort, i) => sort.id === b[i]?.id && sort.desc === b[i]?.desc);
    },
  }) as ReturnType<typeof parseAsArrayOf<ExtendedColumnSort<TData>, string>>;
}
