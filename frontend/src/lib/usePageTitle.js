import { useEffect } from "react";

const DEFAULT_BRAND = "Sportify";

export function usePageTitle(title, brand = DEFAULT_BRAND) {
  useEffect(() => {
    if (title && brand) {
      document.title = `${title} | ${brand}`;
    } else {
      document.title = title || brand;
    }
  }, [title, brand]);
}
