const navLinks = Array.from(document.querySelectorAll(".site-nav a[data-section]"));
const indicatorSteps = Array.from(document.querySelectorAll(".section-indicator-step[data-step]"));
const siteHeader = document.querySelector(".site-header");

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
}
