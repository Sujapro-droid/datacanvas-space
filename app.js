const navLinks = Array.from(document.querySelectorAll(".site-nav a[data-section]"));
const indicatorSteps = Array.from(document.querySelectorAll(".section-indicator-step[data-step]"));
const siteHeader = document.querySelector(".site-header");
const scrollLine = document.querySelector(".scroll-line");

const syncScrollLineProgress = () => {
  if (!scrollLine) {
    return;
  }

  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? Math.min(Math.max(window.scrollY / maxScroll, 0), 1) : 0;
  scrollLine.style.setProperty("--scroll-progress", progress.toFixed(4));
};

if (navLinks.length > 0) {
  const sectionGroups = [
    { key: "association", elements: [document.querySelector("#association")] },
    { key: "lieu", elements: [document.querySelector("#gargilesse-map"), document.querySelector("#lieu")] },
    { key: "statuts", elements: [document.querySelector("#statuts")] },
    { key: "adhesion", elements: [document.querySelector("#adhesion")] },
    { key: "rencontres", elements: [document.querySelector("#rencontres")] }
  ]
    .map((group) => ({
      ...group,
      elements: group.elements.filter(Boolean)
    }))
    .filter((group) => group.elements.length > 0);

  const setActiveLink = (key) => {
    navLinks.forEach((link) => {
      const isActive = link.dataset.section === key;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    indicatorSteps.forEach((step) => {
      step.classList.toggle("is-active", step.dataset.step === key);
    });
  };

  const getActiveKey = () => {
    const headerOffset = siteHeader ? siteHeader.offsetHeight : 0;
    const marker = headerOffset + window.innerHeight * 0.28;
    let activeKey = sectionGroups[0]?.key ?? "";
    let smallestDistance = Number.POSITIVE_INFINITY;

    sectionGroups.forEach((group) => {
      const top = Math.min(...group.elements.map((element) => element.getBoundingClientRect().top));
      const bottom = Math.max(...group.elements.map((element) => element.getBoundingClientRect().bottom));

      let distance = 0;
      if (marker < top) {
        distance = top - marker;
      } else if (marker > bottom) {
        distance = marker - bottom;
      }

      if (distance < smallestDistance) {
        smallestDistance = distance;
        activeKey = group.key;
      }
    });

    return activeKey;
  };

  let ticking = false;
  const refreshActiveState = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(() => {
      setActiveLink(getActiveKey());
      syncScrollLineProgress();
      ticking = false;
    });
  };

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      setActiveLink(link.dataset.section);
    });
  });

  window.addEventListener("scroll", refreshActiveState, { passive: true });
  window.addEventListener("resize", refreshActiveState);
  refreshActiveState();
} else {
  syncScrollLineProgress();
  window.addEventListener("scroll", syncScrollLineProgress, { passive: true });
  window.addEventListener("resize", syncScrollLineProgress);
}

const adhesionForm = document.querySelector("#adhesion-form");

if (adhesionForm) {
  const startedAtField = adhesionForm.querySelector("#adhesion-started-at");
  const statusElement = adhesionForm.querySelector("#adhesion-form-status");
  const successElement = adhesionForm.querySelector("#adhesion-form-success");
  const submitButton = adhesionForm.querySelector("#adhesion-submit");

  const apiEndpoints = (() => {
    const isLocalhost =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    if (isLocalhost) {
      return ["http://localhost:3000/api/adhesions"];
    }

    const fromHtml = adhesionForm.getAttribute("data-api-endpoint");
    return [
      fromHtml,
      "https://toiles-adhesion-app.vercel.app/api/adhesions",
      "https://toiles-adhesion-app-sujapro-droid.vercel.app/api/adhesions"
    ].filter(Boolean);
  })();

  const setStatus = (message, isError) => {
    if (!statusElement) {
      return;
    }

    statusElement.textContent = message;
    statusElement.classList.toggle("is-error", Boolean(isError));

    if (successElement && (isError || !message)) {
      successElement.classList.remove("is-visible");
      successElement.setAttribute("aria-hidden", "true");
    }
  };

  const showSuccess = () => {
    if (!successElement) {
      return;
    }

    successElement.classList.remove("is-visible");
    successElement.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(() => {
      successElement.classList.add("is-visible");
    });
  };

  const resetStartedAt = () => {
    if (startedAtField) {
      startedAtField.value = Date.now().toString();
    }
  };

  resetStartedAt();

  adhesionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("", false);

    if (!adhesionForm.checkValidity()) {
      adhesionForm.reportValidity();
      setStatus("Merci de vérifier les champs obligatoires.", true);
      return;
    }

    const formData = new FormData(adhesionForm);
    const messageValue = String(formData.get("message") || "").trim();

    const payload = {
      firstName: String(formData.get("firstName") || "").trim(),
      lastName: String(formData.get("lastName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      residenceCountry: String(formData.get("residenceCountry") || "").trim(),
      message: messageValue,
      acceptedStatutes: formData.get("acceptedStatutes") === "on",
      acceptedPrivacy: formData.get("acceptedPrivacy") === "on",
      hp: String(formData.get("hp") || ""),
      startedAt: String(formData.get("startedAt") || "")
    };

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      let response = null;
      let body = {};
      let reachedEndpoint = false;

      for (const endpoint of apiEndpoints) {
        try {
          const candidateResponse = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });

          if (candidateResponse.status === 404) {
            continue;
          }

          response = candidateResponse;
          body = await candidateResponse.json().catch(() => ({}));
          reachedEndpoint = true;
          break;
        } catch {
          // Essaie l'URL suivante.
        }
      }

      if (!reachedEndpoint || !response) {
        setStatus("API temporairement indisponible. Merci de réessayer dans quelques minutes.", true);
        return;
      }

      if (!response.ok || !body?.ok) {
        const errorMessage =
          typeof body?.error === "string" && body.error.length > 0
            ? body.error
            : "Envoi impossible pour le moment. Merci de réessayer.";
        setStatus(errorMessage, true);
        return;
      }

      adhesionForm.reset();
      resetStartedAt();
      setStatus(
        "Demande envoyée. Vous allez recevoir un email de confirmation de réception.",
        false
      );
      showSuccess();
    } catch {
      setStatus("Erreur réseau. Merci de réessayer dans quelques instants.", true);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}
