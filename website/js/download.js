(() => {
  const REPO = "NicholasTracy/captivate-2";
  const API = `https://api.github.com/repos/${REPO}/releases/latest`;
  const FALLBACK = `https://github.com/${REPO}/releases/latest`;

  const meta = document.getElementById("release-meta");
  const errorEl = document.getElementById("release-error");
  const cards = Array.from(document.querySelectorAll(".download-card"));

  const matchers = {
    windows: (name) => /\.exe$/i.test(name) && !/blockmap/i.test(name),
    "mac-arm64": (name) => /arm64\.dmg$/i.test(name),
    "mac-x64": (name) => /x64\.dmg$/i.test(name) || (/Captivate\.2-.*\.dmg$/i.test(name) && !/arm64/i.test(name)),
    linux: (name) => /\.AppImage$/i.test(name),
  };

  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
  };

  const setFallback = (message) => {
    if (meta) {
      meta.innerHTML = `Could not load release details.
        <a href="${FALLBACK}" target="_blank" rel="noopener">Browse GitHub Releases</a>`;
    }
    if (errorEl && message) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }
    cards.forEach((card) => {
      card.disabled = false;
      const file = card.querySelector(".file");
      if (file) file.textContent = "Open Releases page";
      card.onclick = () => {
        window.open(FALLBACK, "_blank", "noopener");
      };
    });
  };

  const wireCard = (card, asset) => {
    const file = card.querySelector(".file");
    if (file) {
      const size = formatBytes(asset.size);
      file.textContent = size ? `${asset.name} · ${size}` : asset.name;
    }
    card.disabled = false;
    card.onclick = () => {
      window.location.href = asset.browser_download_url;
    };
  };

  const pickAsset = (assets, platform) => {
    const matcher = matchers[platform];
    if (!matcher) return null;
    return assets.find((asset) => matcher(asset.name)) || null;
  };

  fetch(API, {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then((res) => {
      if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
      return res.json();
    })
    .then((release) => {
      const tag = release.tag_name || release.name || "latest";
      const published = release.published_at
        ? new Date(release.published_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "";
      if (meta) {
        meta.innerHTML = `Latest: <strong>${tag}</strong>${
          published ? ` · ${published}` : ""
        } ·
          <a href="${release.html_url}" target="_blank" rel="noopener">Release notes</a>`;
      }

      const assets = Array.isArray(release.assets) ? release.assets : [];
      cards.forEach((card) => {
        const platform = card.dataset.platform;
        const asset = pickAsset(assets, platform);
        if (asset) {
          wireCard(card, asset);
        } else {
          const file = card.querySelector(".file");
          if (file) file.textContent = "Not in latest release — open Releases";
          card.disabled = false;
          card.onclick = () => window.open(FALLBACK, "_blank", "noopener");
        }
      });
    })
    .catch((err) => {
      setFallback(err.message || "Failed to fetch release metadata.");
    });
})();
