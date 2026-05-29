(function () {
  var defaultLanguage = "fr";
  var supportedLanguages = ["fr", "en", "de"];
  var storageKey = "datacanvas_lang";
  var dictionary = window.DataCanvasTranslations || {};
  var textSources = new WeakMap();
  var attributeSources = new WeakMap();

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function isSupportedLanguage(language) {
    return supportedLanguages.indexOf(language) !== -1;
  }

  function translateSource(source, language) {
    var key = normalize(source);
    if (!key || language === defaultLanguage) {
      return source;
    }

    return dictionary[language]?.[key] || source;
  }

  function withOriginalSpacing(source, translated) {
    var leading = source.match(/^\s*/)?.[0] || "";
    var trailing = source.match(/\s*$/)?.[0] || "";
    return leading + translated + trailing;
  }

  function shouldSkipTextNode(node) {
    var parent = node.parentElement;
    if (!parent) {
      return true;
    }

    return Boolean(parent.closest("script, style, noscript, textarea, option, [data-i18n-ignore]"));
  }

  function translateTextNodes(language) {
    if (!document.body) {
      return;
    }

    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (shouldSkipTextNode(node) || !normalize(node.nodeValue)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    var node = walker.nextNode();
    while (node) {
      var source = textSources.get(node);
      if (!source) {
        source = node.nodeValue;
        textSources.set(node, source);
      }

      var translated = translateSource(source, language);
      node.nodeValue = translated === source ? source : withOriginalSpacing(source, translated);
      node = walker.nextNode();
    }
  }

  function getAttributeSource(element, attribute) {
    var sources = attributeSources.get(element);
    if (!sources) {
      sources = {};
      attributeSources.set(element, sources);
    }

    if (!Object.prototype.hasOwnProperty.call(sources, attribute)) {
      sources[attribute] = element.getAttribute(attribute) || "";
    }

    return sources[attribute];
  }

  function translateAttributes(language) {
    ["aria-label", "alt", "placeholder", "title"].forEach(function (attribute) {
      document.querySelectorAll("[" + attribute + "]").forEach(function (element) {
        var source = getAttributeSource(element, attribute);
        element.setAttribute(attribute, translateSource(source, language));
      });
    });

    document.querySelectorAll('meta[name="description"]').forEach(function (element) {
      var source = getAttributeSource(element, "content");
      element.setAttribute("content", translateSource(source, language));
    });
  }

  function translateTitle(language) {
    var titleElement = document.querySelector("title");
    if (!titleElement) {
      return;
    }

    if (!titleElement.dataset.i18nSource) {
      titleElement.dataset.i18nSource = titleElement.textContent;
    }

    titleElement.textContent = translateSource(titleElement.dataset.i18nSource, language);
  }

  function updateButtons(language) {
    document.querySelectorAll("[data-set-lang]").forEach(function (button) {
      var active = button.getAttribute("data-set-lang") === language;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
    });
  }

  function getStoredLanguage() {
    try {
      return localStorage.getItem(storageKey);
    } catch (error) {
      return null;
    }
  }

  function storeLanguage(language) {
    try {
      localStorage.setItem(storageKey, language);
    } catch (error) {
      // Storage may be unavailable in private browsing or strict contexts.
    }
  }

  function applyLanguage(language, options) {
    var nextLanguage = isSupportedLanguage(language) ? language : defaultLanguage;
    var shouldStore = !options || options.persist !== false;

    document.documentElement.lang = nextLanguage;
    if (document.body) {
      document.body.setAttribute("data-lang", nextLanguage);
    }

    translateTitle(nextLanguage);
    translateTextNodes(nextLanguage);
    translateAttributes(nextLanguage);
    updateButtons(nextLanguage);

    if (shouldStore) {
      storeLanguage(nextLanguage);
    }

    window.dispatchEvent(new CustomEvent("datacanvas:languagechange", {
      detail: { language: nextLanguage }
    }));
  }

  function getCurrentLanguage() {
    return document.body?.getAttribute("data-lang") || document.documentElement.lang || defaultLanguage;
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-set-lang]");
    if (!button) {
      return;
    }

    applyLanguage(button.getAttribute("data-set-lang"));
  });

  window.DataCanvasI18n = {
    applyLanguage: applyLanguage,
    getCurrentLanguage: getCurrentLanguage,
    translateText: function (text, language) {
      return translateSource(text, language || getCurrentLanguage());
    }
  };

  applyLanguage(getStoredLanguage() || document.documentElement.lang || defaultLanguage, { persist: false });
})();
