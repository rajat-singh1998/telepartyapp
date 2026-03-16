export const extractYouTubeId = (url) => {
  if (!url) return "";

  const trimmed = url.trim();
  const directMatch = trimmed.match(/^[a-zA-Z0-9_-]{11}$/);
  if (directMatch) return directMatch[0];

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "").slice(0, 11);
    }
    if (parsed.hostname.includes("youtube.com")) {
      const idFromQuery = parsed.searchParams.get("v");
      if (idFromQuery) return idFromQuery.slice(0, 11);
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      const embedIndex = pathParts.findIndex((part) => part === "embed");
      if (embedIndex !== -1 && pathParts[embedIndex + 1]) {
        return pathParts[embedIndex + 1].slice(0, 11);
      }
    }
  } catch (_err) {
    return "";
  }

  return "";
};
