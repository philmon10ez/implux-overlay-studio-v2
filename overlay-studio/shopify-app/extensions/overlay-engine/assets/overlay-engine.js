(function() {
  if (typeof Shopify === 'undefined' || !Shopify.shop) return;
  var shop = Shopify.shop;
  var PROXY_URL = 'https://api.implux.io/proxy';

  function normalizeCampaignType(t) {
    if (t == null || t === '') return '';
    var s = String(t)
      .toLowerCase()
      .trim()
      .replace(/-/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
    if (
      s === 'promo_code_banner' ||
      s === 'promocode_banner' ||
      s === 'promocodebanner' ||
      s === 'promobanner'
    )
      return 'promo_banner';
    if (
      s === 'sticky_footer_bar' ||
      s === 'stickyfooter' ||
      s === 'sticky_bar' ||
      s === 'footer_bar' ||
      s === 'bottom_bar'
    )
      return 'sticky_footer';
    if (
      s === 'spin_to_win' ||
      s === 'spin_to_win_wheel' ||
      s === 'spinwheel' ||
      s === 'prize_wheel' ||
      s === 'spin_the_wheel'
    )
      return 'spin_wheel';
    return s;
  }

  function normalizeSpinWheelTriggerMode(raw) {
    var m = String(raw || 'time_delay')
      .toLowerCase()
      .trim()
      .replace(/-/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
    if (m === 'time' || m === 'timer' || m === 'time_on_site') m = 'time_delay';
    if (m === 'scroll' || m === 'scrolldepth') m = 'scroll_depth';
    if (m === 'exit' || m === 'exitintent') m = 'exit_intent';
    return m;
  }

  function isExitIntentType(t) {
    return normalizeCampaignType(t) === 'exit_intent';
  }

  function truthyExitTwoStep(d) {
    if (d == null || d.exitTwoStep === undefined || d.exitTwoStep === null) return true;
    if (d.exitTwoStep === false || d.exitTwoStep === 'false' || d.exitTwoStep === 0) return false;
    return true;
  }

  function isScrollDepthType(t) {
    return normalizeCampaignType(t) === 'scroll_depth';
  }

  function isWelcomeMatType(t) {
    return normalizeCampaignType(t) === 'welcome_mat';
  }

  function isUpsellModalType(t) {
    return normalizeCampaignType(t) === 'upsell_modal';
  }

  function isPromoBannerType(t) {
    return normalizeCampaignType(t) === 'promo_banner';
  }

  function isStickyFooterType(t) {
    return normalizeCampaignType(t) === 'sticky_footer';
  }

  function isSpinWheelType(t) {
    return normalizeCampaignType(t) === 'spin_wheel';
  }

  function isTimeDelayType(t) {
    return normalizeCampaignType(t) === 'time_delay';
  }

  var impluxUpsellCartHandlers = [];
  var impluxLastCartAddNotify = 0;

  function impluxNotifyCartAdd() {
    var now = Date.now();
    if (now - impluxLastCartAddNotify < 400) return;
    impluxLastCartAddNotify = now;
    for (var i = 0; i < impluxUpsellCartHandlers.length; i++) {
      try {
        impluxUpsellCartHandlers[i]();
      } catch (e) {}
    }
  }

  function impluxInstallCartAddHooks() {
    if (window.__impluxCartAddHooks) return;
    window.__impluxCartAddHooks = true;

    var origFetch = window.fetch;
    if (typeof origFetch === 'function') {
      window.fetch = function() {
        var args = arguments;
        var p = origFetch.apply(this, args);
        if (p && typeof p.then === 'function') {
          return p.then(function(res) {
            try {
              var u = typeof args[0] === 'string' ? args[0] : args[0] && args[0].url ? args[0].url : '';
              if (res && res.ok && u && /\/cart\/add(\.js|\.json)?/i.test(String(u))) {
                impluxNotifyCartAdd();
              }
            } catch (e1) {}
            return res;
          });
        }
        return p;
      };
    }

    try {
      var XO = XMLHttpRequest.prototype.open;
      var XS = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(method, url) {
        this.__impluxUrl = url;
        return XO.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function() {
        var xhr = this;
        xhr.addEventListener('load', function() {
          try {
            if (xhr.status >= 200 && xhr.status < 300 && /\/cart\/add/i.test(String(xhr.__impluxUrl || ''))) {
              impluxNotifyCartAdd();
            }
          } catch (e2) {}
        });
        return XS.apply(this, arguments);
      };
    } catch (e3) {}

    document.addEventListener(
      'submit',
      function(e) {
        var form = e.target;
        if (!form || !form.action) return;
        if (/\/cart\/add/i.test(String(form.action))) {
          setTimeout(impluxNotifyCartAdd, 900);
        }
      },
      true
    );
  }

  function sortCampaignsNewestFirst(arr) {
    arr.sort(function(a, b) {
      var ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      var tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      if (tb !== ta) return tb - ta;
      return (b.id || 0) - (a.id || 0);
    });
    return arr;
  }

  fetch(PROXY_URL + '/campaigns?shop=' + encodeURIComponent(shop))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var campaigns = data.campaigns || [];
      var exitOnes = [];
      var scrollOnes = [];
      var welcomeOnes = [];
      var upsellOnes = [];
      var promoBannerOnes = [];
      var stickyFooterOnes = [];
      var spinWheelOnes = [];
      var others = [];
      for (var i = 0; i < campaigns.length; i++) {
        var c = campaigns[i];
        if (isExitIntentType(c.type)) exitOnes.push(c);
        else if (isScrollDepthType(c.type)) scrollOnes.push(c);
        else if (isWelcomeMatType(c.type)) welcomeOnes.push(c);
        else if (isUpsellModalType(c.type)) upsellOnes.push(c);
        else if (isPromoBannerType(c.type)) promoBannerOnes.push(c);
        else if (isStickyFooterType(c.type)) stickyFooterOnes.push(c);
        else if (isSpinWheelType(c.type)) spinWheelOnes.push(c);
        else others.push(c);
      }
      sortCampaignsNewestFirst(exitOnes);
      sortCampaignsNewestFirst(scrollOnes);
      sortCampaignsNewestFirst(welcomeOnes);
      sortCampaignsNewestFirst(upsellOnes);
      sortCampaignsNewestFirst(promoBannerOnes);
      sortCampaignsNewestFirst(stickyFooterOnes);
      sortCampaignsNewestFirst(spinWheelOnes);
      var suppressTimedDelayPopups =
        promoBannerOnes.length > 0 || stickyFooterOnes.length > 0 || spinWheelOnes.length > 0;
      for (var j = 0; j < others.length; j++) {
        var oth = others[j];
        if (suppressTimedDelayPopups && isTimeDelayType(oth.type)) continue;
        initCampaign(oth);
      }
      if (exitOnes.length) initCampaign(exitOnes[0]);
      if (scrollOnes.length) initCampaign(scrollOnes[0]);
      if (welcomeOnes.length) initCampaign(welcomeOnes[0]);
      if (upsellOnes.length) initCampaign(upsellOnes[0]);
      if (promoBannerOnes.length) initCampaign(promoBannerOnes[0]);
      if (stickyFooterOnes.length) initCampaign(stickyFooterOnes[0]);
      if (spinWheelOnes.length) initCampaign(spinWheelOnes[0]);
    })
    .catch(function() {});

  function initCampaign(campaign) {
    var type = normalizeCampaignType(campaign.type);
    var triggerConfig = campaign.triggerConfig || {};
    var designConfig = campaign.designConfig || {};
    var id = campaign.id;

    var capKey = 'os_shown_' + id;
    var cap = triggerConfig.frequencyCap;
    if (cap === 'once_ever' && localStorage.getItem(capKey)) return;
    if (cap === 'once_per_session' && sessionStorage.getItem(capKey)) return;

    if (isPromoBannerType(type) || isStickyFooterType(type)) {
      var dKey = 'os_bar_dismiss_' + id;
      if (sessionStorage.getItem(dKey)) return;
    }

    if (!matchesPageTarget(triggerConfig)) return;
    if (!matchesDevice(triggerConfig)) return;

    if (isExitIntentType(type)) {
      registerExitIntent(campaign);
    } else if (isTimeDelayType(type)) {
      var sec = triggerConfig.timeDelaySeconds != null ? triggerConfig.timeDelaySeconds : (triggerConfig.delaySeconds != null ? triggerConfig.delaySeconds : 5);
      setTimeout(function() { checkCartAndShow(campaign); }, sec * 1000);
    } else if (isScrollDepthType(type)) {
      registerScrollTrigger(campaign);
    } else if (isWelcomeMatType(type)) {
      var wtc = campaign.triggerConfig || {};
      var wdelay = wtc.welcomeMatDelayMs != null ? Number(wtc.welcomeMatDelayMs) : 0;
      if (wdelay < 0 || isNaN(wdelay)) wdelay = 0;
      if (wdelay > 60000) wdelay = 60000;
      setTimeout(function() {
        checkCartAndShow(campaign);
      }, wdelay);
    } else if (isUpsellModalType(type)) {
      registerUpsellModalTrigger(campaign);
    } else if (isPromoBannerType(type) || isStickyFooterType(type)) {
      var pbd = campaign.triggerConfig || {};
      var barDelay = pbd.persistentBarDelayMs != null ? Number(pbd.persistentBarDelayMs) : 0;
      if (barDelay < 0 || isNaN(barDelay)) barDelay = 0;
      if (barDelay > 60000) barDelay = 60000;
      setTimeout(function() {
        checkCartAndShowPersistentBar(campaign);
      }, barDelay);
    } else if (isSpinWheelType(type)) {
      registerSpinWheelTrigger(campaign);
    } else {
      checkCartAndShow(campaign);
    }
  }

  function registerUpsellModalTrigger(campaign) {
    impluxInstallCartAddHooks();
    var tc = campaign.triggerConfig || {};
    var delay = tc.upsellAfterAddDelayMs != null ? Number(tc.upsellAfterAddDelayMs) : 500;
    if (delay < 0 || isNaN(delay)) delay = 500;
    if (delay > 15000) delay = 15000;

    function onCartAdd() {
      if (!matchesPageTarget(tc)) return;
      if (!matchesDevice(tc)) return;
      setTimeout(function() {
        checkCartAndShow(campaign);
      }, delay);
    }

    impluxUpsellCartHandlers.push(onCartAdd);
  }

  function exitIntentYThreshold(triggerConfig) {
    var s = (triggerConfig && triggerConfig.sensitivity) || 'medium';
    if (s === 'high') return 28;
    if (s === 'low') return 2;
    return 10;
  }

  function registerExitIntent(campaign, showImpl) {
    var tc = campaign.triggerConfig || {};
    var threshold = exitIntentYThreshold(tc);
    var handler = function(e) {
      if (typeof e.clientY === 'number' && e.clientY <= threshold) {
        document.removeEventListener('mouseleave', handler);
        checkCartAndShow(campaign, showImpl);
      }
    };
    document.addEventListener('mouseleave', handler);
  }

  function getScrollDepthMetrics() {
    var el = document.documentElement;
    var body = document.body;
    var scrollHeight = Math.max(
      el.scrollHeight,
      body.scrollHeight,
      el.offsetHeight,
      body.offsetHeight,
      el.clientHeight
    );
    var viewH = window.innerHeight || el.clientHeight || 0;
    var maxScroll = Math.max(0, scrollHeight - viewH);
    var y = window.pageYOffset != null ? window.pageYOffset : el.scrollTop || body.scrollTop || 0;
    return { maxScroll: maxScroll, y: y };
  }

  function registerScrollTrigger(campaign, showImpl) {
    var tc = campaign.triggerConfig || {};
    var raw =
      tc.scrollDepthPercent != null
        ? Number(tc.scrollDepthPercent)
        : tc.scrollPercent != null
          ? Number(tc.scrollPercent)
          : 50;
    var threshold = Math.min(100, Math.max(0, raw));
    var shortBehavior = (tc.scrollShortPageBehavior || 'immediate').toLowerCase();
    var evaluateOnLoad = tc.scrollEvaluateOnLoad !== false && tc.scrollEvaluateOnLoad !== 'false';

    var done = false;
    var scrollListenerAttached = false;

    function teardown() {
      if (scrollListenerAttached) {
        window.removeEventListener('scroll', onScroll);
        scrollListenerAttached = false;
      }
    }

    function fire() {
      if (done) return;
      done = true;
      teardown();
      checkCartAndShow(campaign, showImpl);
    }

    var ticking = false;
    function onScroll() {
      if (done) return;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function() {
          ticking = false;
          tryEvaluate();
        });
      }
    }

    function tryEvaluate() {
      if (done) return;
      var m = getScrollDepthMetrics();
      var shortPagePx = 4;
      if (m.maxScroll < shortPagePx) {
        if (shortBehavior === 'never') {
          teardown();
          return;
        }
        fire();
        return;
      }
      var pct = (m.y / m.maxScroll) * 100;
      if (pct + 0.0001 >= threshold) fire();
    }

    scrollListenerAttached = true;
    window.addEventListener('scroll', onScroll, { passive: true });

    if (evaluateOnLoad) {
      requestAnimationFrame(function() {
        tryEvaluate();
      });
    }
  }

  function registerSpinWheelTrigger(campaign) {
    var tc = campaign.triggerConfig || {};
    var mode = normalizeSpinWheelTriggerMode(tc.spinWheelTrigger);
    var showSpin = showSpinWheelOverlay;

    if (mode === 'exit_intent') {
      var ua = navigator.userAgent || '';
      var isCoarsePointer =
        typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
      var isTouchUa = /Mobi|Android|iPhone|iPad|iPod|Tablet/i.test(ua);
      if (isTouchUa || isCoarsePointer) {
        var fallbackSec = tc.timeDelaySeconds != null ? Number(tc.timeDelaySeconds) : 8;
        if (fallbackSec < 1 || isNaN(fallbackSec)) fallbackSec = 8;
        if (fallbackSec > 120) fallbackSec = 120;
        setTimeout(function() {
          checkCartAndShow(campaign, showSpin);
        }, fallbackSec * 1000);
      } else {
        registerExitIntent(campaign, showSpin);
      }
    } else if (mode === 'scroll_depth') {
      registerScrollTrigger(campaign, showSpin);
    } else {
      var sec =
        tc.timeDelaySeconds != null
          ? tc.timeDelaySeconds
          : tc.delaySeconds != null
            ? tc.delaySeconds
            : 5;
      setTimeout(function() {
        checkCartAndShow(campaign, showSpin);
      }, sec * 1000);
    }
  }

  function checkCartAndShow(campaign, showImpl) {
    var tc = campaign.triggerConfig || {};
    var minCart = tc.cartValueMin != null ? tc.cartValueMin : (tc.minCartValue != null ? tc.minCartValue : 0);
    var useCart = tc.cartValueFilter || minCart > 0;
    var show = typeof showImpl === 'function' ? showImpl : showOverlay;
    if (useCart && minCart > 0) {
      fetch('/cart.js')
        .then(function(r) { return r.json(); })
        .then(function(cart) {
          var total = (cart.total_price || 0) / 100;
          if (total >= minCart) show(campaign);
        })
        .catch(function() {
          show(campaign);
        });
    } else {
      show(campaign);
    }
  }

  function restoreBodyBarPadding(bar) {
    if (!bar) return;
    if (bar._osPrevPaddingBottom !== undefined) {
      document.body.style.paddingBottom = bar._osPrevPaddingBottom;
      bar._osPrevPaddingBottom = undefined;
    }
    if (bar._osPrevPaddingTop !== undefined) {
      document.body.style.paddingTop = bar._osPrevPaddingTop;
      bar._osPrevPaddingTop = undefined;
    }
  }

  function checkCartAndShowPersistentBar(campaign) {
    checkCartAndShow(campaign, showPersistentBar);
  }

  function showPersistentBar(campaign) {
    var triggerConfig = campaign.triggerConfig || {};
    var designConfig = campaign.designConfig || {};
    var id = campaign.id;
    var dismissKey = 'os_bar_dismiss_' + id;
    if (sessionStorage.getItem(dismissKey)) return;

    var capKey = 'os_shown_' + id;
    if (triggerConfig.frequencyCap === 'once_ever') localStorage.setItem(capKey, '1');
    if (triggerConfig.frequencyCap === 'once_per_session') sessionStorage.setItem(capKey, '1');

    var config = normalizeDesignConfig(designConfig, campaign.promoCode, campaign.type);
    var bar = buildPersistentBarDOM(config, campaign);
    document.body.appendChild(bar);

    var edge = config.barEdge === 'bottom' ? 'bottom' : 'top';
    requestAnimationFrame(function() {
      bar.classList.add('os-visible');
      var barH = bar.offsetHeight || 52;
      if (edge === 'bottom') {
        var prev = document.body.style.paddingBottom || '';
        bar._osPrevPaddingBottom = prev;
        var cur = parseInt(prev, 10) || 0;
        if (isNaN(cur)) cur = 0;
        document.body.style.paddingBottom = cur + barH + 'px';
      } else {
        var prevT = document.body.style.paddingTop || '';
        bar._osPrevPaddingTop = prevT;
        var curT = parseInt(prevT, 10) || 0;
        if (isNaN(curT)) curT = 0;
        document.body.style.paddingTop = curT + barH + 'px';
      }
    });

    navigator.sendBeacon(PROXY_URL + '/track?event=impression&campaign_id=' + id + '&shop=' + encodeURIComponent(shop));
  }

  function pickWeightedSpinSegment(segments) {
    var list = segments && segments.length ? segments : [{ label: 'Special offer', weight: 1, code: '' }];
    var totalW = 0;
    for (var i = 0; i < list.length; i++) {
      var w = Number(list[i].weight);
      totalW += !isNaN(w) && w > 0 ? w : 1;
    }
    if (totalW <= 0) totalW = list.length;
    var r = Math.random() * totalW;
    var acc = 0;
    for (var j = 0; j < list.length; j++) {
      var wj = Number(list[j].weight);
      acc += !isNaN(wj) && wj > 0 ? wj : 1;
      if (r <= acc) return { index: j, seg: list[j] };
    }
    return { index: list.length - 1, seg: list[list.length - 1] };
  }

  function showSpinWheelOverlay(campaign) {
    var triggerConfig = campaign.triggerConfig || {};
    var designConfig = campaign.designConfig || {};
    var id = campaign.id;

    var capKey = 'os_shown_' + id;
    if (triggerConfig.frequencyCap === 'once_ever') localStorage.setItem(capKey, '1');
    if (triggerConfig.frequencyCap === 'once_per_session') sessionStorage.setItem(capKey, '1');

    var config = normalizeDesignConfig(designConfig, campaign.promoCode, campaign.type);
    var overlay = buildSpinWheelDOM(config, campaign);
    overlay._osBodyOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    var nativeSpinRemove = HTMLElement.prototype.remove;
    overlay.remove = function() {
      document.body.style.overflow = overlay._osBodyOverflow || '';
      nativeSpinRemove.call(overlay);
    };
    document.body.appendChild(overlay);
    requestAnimationFrame(function() {
      overlay.classList.add('os-visible');
    });

    navigator.sendBeacon(PROXY_URL + '/track?event=impression&campaign_id=' + id + '&shop=' + encodeURIComponent(shop));
  }

  function showOverlay(campaign) {
    var triggerConfig = campaign.triggerConfig || {};
    var designConfig = campaign.designConfig || {};
    var id = campaign.id;

    var capKey = 'os_shown_' + id;
    if (triggerConfig.frequencyCap === 'once_ever') localStorage.setItem(capKey, '1');
    if (triggerConfig.frequencyCap === 'once_per_session') sessionStorage.setItem(capKey, '1');

    var config = normalizeDesignConfig(designConfig, campaign.promoCode, campaign.type);
    var overlay = buildOverlayDOM(config, campaign);
    document.body.appendChild(overlay);
    if (isWelcomeMatType(campaign.type)) {
      overlay._osBodyOverflow = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';
      var nativeRemove = HTMLElement.prototype.remove;
      overlay.remove = function() {
        document.body.style.overflow = overlay._osBodyOverflow || '';
        nativeRemove.call(overlay);
      };
    }
    requestAnimationFrame(function() { overlay.classList.add('os-visible'); });

    navigator.sendBeacon(PROXY_URL + '/track?event=impression&campaign_id=' + id + '&shop=' + encodeURIComponent(shop));
  }

  function normalizeDesignConfig(d, promoCode, campaignType) {
    var exitTwoStep = isExitIntentType(campaignType) && truthyExitTwoStep(d);
    return {
      bgColor: d.background || '#ffffff',
      bgOpacity: d.backgroundOpacity != null ? d.backgroundOpacity : 0.95,
      borderRadius: d.borderRadius != null ? d.borderRadius : 8,
      closeButton: d.showCloseButton !== false,
      image: d.imageDataUrl || d.image || '',
      headline: d.headline || '',
      headlineColor: d.headlineColor || '#1f2937',
      headlineFontSize: d.headlineSize != null ? d.headlineSize : 24,
      headlineBold: d.headlineBold !== false,
      subheadline: d.subheadline || '',
      subColor: d.subheadlineColor || '#6b7280',
      subFontSize: d.subheadlineSize != null ? d.subheadlineSize : 16,
      body: d.body || '',
      bodyColor: d.bodyColor || '#4b5563',
      bodyFontSize: d.bodySize != null ? d.bodySize : 14,
      ctaText: d.ctaText || '',
      ctaAction: d.ctaAction || 'close',
      ctaUrl: d.ctaUrl || '',
      ctaBgColor: d.ctaBgColor || '#6c63ff',
      ctaTextColor: d.ctaTextColor || '#ffffff',
      ctaBorderRadius: d.ctaBorderRadius != null ? d.ctaBorderRadius : 8,
      dismissText: d.secondaryCtaText || '',
      promoCode: promoCode || d.promoCode || '',
      exitTwoStep: exitTwoStep,
      exitGateHeadline: d.exitGateHeadline || '',
      exitGateSubheadline: d.exitGateSubheadline || '',
      exitGateBody: d.exitGateBody || '',
      exitStayCtaText: d.exitStayCtaText || 'Yes, show me the offer',
      exitLeaveCtaText: d.exitLeaveCtaText || 'No thanks, exit',
      exitGateStayBgColor: d.exitGateStayBgColor || d.ctaBgColor || '#6c63ff',
      exitGateStayTextColor: d.exitGateStayTextColor || d.ctaTextColor || '#ffffff',
      exitGateLeaveColor: d.exitGateLeaveColor || '#6b7280',
      offerEyebrow: (d.exitOfferEyebrow || '').trim(),
      offerEyebrowColor: d.exitOfferEyebrowColor || '#6c63ff',
      welcomeMatInnerMaxPx:
        d.welcomeMatInnerMaxPx != null && !isNaN(Number(d.welcomeMatInnerMaxPx))
          ? Math.min(1200, Math.max(280, Number(d.welcomeMatInnerMaxPx)))
          : 640,
      barEdge: (function() {
        if (isStickyFooterType(campaignType)) return 'bottom';
        var be = String(d.barEdge || '').toLowerCase();
        if (be === 'bottom' || be === 'top') return be;
        var pos = String(d.position || '');
        if (pos.indexOf('bottom') !== -1) return 'bottom';
        return 'top';
      })(),
      showPromoInBar: d.showPromoInBar !== false,
      spinSegments:
        Array.isArray(d.spinSegments) && d.spinSegments.length
          ? d.spinSegments
          : [
              { label: '10% off', weight: 1, code: '' },
              { label: 'Free shipping', weight: 1, code: '' },
              { label: 'Bonus offer', weight: 1, code: '' },
              { label: 'Try again', weight: 1, code: '' }
            ],
      spinRequireEmail: !!d.spinRequireEmail,
      spinTitle: d.spinTitle || d.headline || 'Spin to win!',
      spinSubtitle: d.spinSubtitle || d.subheadline || '',
      spinButtonLabel: d.spinButtonLabel || d.ctaText || 'Spin the wheel'
    };
  }

  function offerSectionHTML(config) {
    var eyebrow = config.offerEyebrow
      ? '<p class="os-offer-eyebrow" style="color:' + config.offerEyebrowColor + ';font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin:0 0 8px">' +
        escapeHtml(config.offerEyebrow) + '</p>'
      : '';
    var img = config.image ? '<img src="' + config.image + '" class="os-image" alt="" />' : '';
    var h = config.headline
      ? '<h2 class="os-headline" style="color:' + config.headlineColor + ';font-size:' + config.headlineFontSize + 'px;font-weight:' +
        (config.headlineBold ? '700' : '600') + '">' + escapeHtml(config.headline) + '</h2>'
      : '';
    var sub = config.subheadline
      ? '<p class="os-sub" style="color:' + config.subColor + ';font-size:' + config.subFontSize + 'px">' + escapeHtml(config.subheadline) + '</p>'
      : '';
    var body = config.body
      ? '<p class="os-body" style="color:' + config.bodyColor + ';font-size:' + config.bodyFontSize + 'px">' + escapeHtml(config.body) + '</p>'
      : '';
    var cta = config.ctaText
      ? '<button type="button" class="os-cta" style="background:' + config.ctaBgColor + ';color:' + config.ctaTextColor + ';border-radius:' + config.ctaBorderRadius + 'px">' +
        escapeHtml(config.ctaText) + '</button>'
      : '';
    var dismiss = config.dismissText ? '<a href="#" class="os-dismiss">' + escapeHtml(config.dismissText) + '</a>' : '';
    return eyebrow + img + h + sub + body + cta + dismiss;
  }

  function buildOverlayDOM(config, campaign) {
    var campaignId = campaign.id;
    if (isWelcomeMatType(campaign.type)) {
      return buildWelcomeMatOverlay(config, campaign);
    }
    if (isExitIntentType(campaign.type) && config.exitTwoStep) {
      return buildExitTwoStepOverlay(config, campaign);
    }
    if (!document.getElementById('os-styles')) {
      var style = document.createElement('style');
      style.id = 'os-styles';
      style.textContent = generateCSS();
      document.head.appendChild(style);
    }

    var wrapper = document.createElement('div');
    wrapper.id = 'os-overlay-' + campaignId;
    wrapper.className =
      'os-overlay-wrapper' + (isUpsellModalType(campaign.type) ? ' os-upsell-modal' : '');
    wrapper.innerHTML =
      '<div class="os-backdrop"></div>' +
      '<div class="os-box" style="background:' + config.bgColor + ';opacity:' + config.bgOpacity + ';border-radius:' + config.borderRadius + 'px;">' +
        (config.closeButton ? '<button type="button" class="os-close" aria-label="Close">&#215;</button>' : '') +
        offerSectionHTML(config) +
      '</div>';

    wireOfferInteractions(wrapper, config, campaignId);
    wrapper.querySelector('.os-close') && wrapper.querySelector('.os-close').addEventListener('click', function() { wrapper.remove(); });
    wrapper.querySelector('.os-backdrop') && wrapper.querySelector('.os-backdrop').addEventListener('click', function() { wrapper.remove(); });

    return wrapper;
  }

  function buildWelcomeMatOverlay(config, campaign) {
    var campaignId = campaign.id;
    var tc = campaign.triggerConfig || {};
    var backdropDismiss =
      tc.welcomeMatBackdropDismiss !== false && tc.welcomeMatBackdropDismiss !== 'false';
    var innerMax = config.welcomeMatInnerMaxPx != null ? config.welcomeMatInnerMaxPx : 640;

    if (!document.getElementById('os-styles')) {
      var st = document.createElement('style');
      st.id = 'os-styles';
      st.textContent = generateCSS();
      document.head.appendChild(st);
    }

    var wrapper = document.createElement('div');
    wrapper.id = 'os-overlay-' + campaignId;
    wrapper.className = 'os-overlay-wrapper os-welcome-mat';
    wrapper.innerHTML =
      '<div class="os-backdrop"></div>' +
      '<div class="os-box os-welcome-mat-panel" style="background:' +
      config.bgColor +
      ';opacity:' +
      config.bgOpacity +
      ';">' +
      (config.closeButton
        ? '<button type="button" class="os-close" aria-label="Close">&#215;</button>'
        : '') +
      '<div class="os-welcome-mat-inner" style="max-width:' +
      innerMax +
      'px">' +
      offerSectionHTML(config) +
      '</div></div>';

    wireOfferInteractions(wrapper, config, campaignId);
    wrapper.querySelector('.os-close') &&
      wrapper.querySelector('.os-close').addEventListener('click', function() {
        wrapper.remove();
      });
    var bd = wrapper.querySelector('.os-backdrop');
    if (bd) {
      if (backdropDismiss) {
        bd.addEventListener('click', function() {
          wrapper.remove();
        });
      } else {
        bd.style.pointerEvents = 'none';
      }
    }

    return wrapper;
  }

  function buildExitTwoStepOverlay(config, campaign) {
    var campaignId = campaign.id;
    if (!document.getElementById('os-styles')) {
      var st = document.createElement('style');
      st.id = 'os-styles';
      st.textContent = generateCSS();
      document.head.appendChild(st);
    }

    var gh = config.exitGateHeadline
      ? '<h2 class="os-headline os-gate-headline" style="color:' + config.headlineColor + ';font-size:' + Math.min(config.headlineFontSize, 22) + 'px;font-weight:700">' +
        escapeHtml(config.exitGateHeadline) + '</h2>'
      : '';
    var gs = config.exitGateSubheadline
      ? '<p class="os-sub" style="color:' + config.subColor + ';font-size:' + (config.subFontSize - 1) + 'px">' + escapeHtml(config.exitGateSubheadline) + '</p>'
      : '';
    var gb = config.exitGateBody
      ? '<p class="os-body" style="color:' + config.bodyColor + ';font-size:' + config.bodyFontSize + 'px">' + escapeHtml(config.exitGateBody) + '</p>'
      : '';
    var stayBtn =
      '<button type="button" class="os-exit-stay" style="background:' + config.exitGateStayBgColor + ';color:' + config.exitGateStayTextColor + ';border-radius:' + config.ctaBorderRadius + 'px">' +
      escapeHtml(config.exitStayCtaText) + '</button>';
    var leaveBtn =
      '<button type="button" class="os-exit-leave os-leave-link" style="color:' + config.exitGateLeaveColor + '">' +
      escapeHtml(config.exitLeaveCtaText) + '</button>';

    var wrapper = document.createElement('div');
    wrapper.id = 'os-overlay-' + campaignId;
    wrapper.className = 'os-overlay-wrapper';
    wrapper.innerHTML =
      '<div class="os-backdrop"></div>' +
      '<div class="os-box os-exit-twostep" style="background:' + config.bgColor + ';opacity:' + config.bgOpacity + ';border-radius:' + config.borderRadius + 'px;">' +
        (config.closeButton ? '<button type="button" class="os-close" aria-label="Close">&#215;</button>' : '') +
        '<div class="os-phase-gate">' +
        gh + gs + gb +
        '<div class="os-exit-gate-actions">' + stayBtn + leaveBtn + '</div>' +
        '</div>' +
        '<div class="os-phase-offer">' + offerSectionHTML(config) + '</div>' +
      '</div>';

    var box = wrapper.querySelector('.os-box');
    wrapper.querySelector('.os-exit-stay') &&
      wrapper.querySelector('.os-exit-stay').addEventListener('click', function() {
        navigator.sendBeacon(PROXY_URL + '/track?event=exit_stay&campaign_id=' + campaignId + '&shop=' + encodeURIComponent(shop));
        if (box) box.classList.add('os-exit-show-offer');
      });
    wrapper.querySelector('.os-exit-leave') &&
      wrapper.querySelector('.os-exit-leave').addEventListener('click', function() {
        navigator.sendBeacon(PROXY_URL + '/track?event=exit_leave&campaign_id=' + campaignId + '&shop=' + encodeURIComponent(shop));
        wrapper.remove();
      });

    wireOfferInteractions(wrapper, config, campaignId);
    wrapper.querySelector('.os-close') &&
      wrapper.querySelector('.os-close').addEventListener('click', function() {
        var onOffer = box && box.classList.contains('os-exit-show-offer');
        if (onOffer) {
          box.classList.remove('os-exit-show-offer');
          return;
        }
        navigator.sendBeacon(PROXY_URL + '/track?event=exit_leave&campaign_id=' + campaignId + '&shop=' + encodeURIComponent(shop));
        wrapper.remove();
      });
    wrapper.querySelector('.os-backdrop') &&
      wrapper.querySelector('.os-backdrop').addEventListener('click', function() {
        if (box && box.classList.contains('os-exit-show-offer')) {
          box.classList.remove('os-exit-show-offer');
          return;
        }
        wrapper.remove();
      });

    return wrapper;
  }

  function resolveSegmentPromo(seg, mainPromo) {
    var c = seg && seg.code != null ? String(seg.code).trim() : '';
    if (c) return c;
    return mainPromo || '';
  }

  function buildWheelConicGradient(n) {
    var colors = ['#6c63ff', '#ec4899', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fde047'];
    var parts = [];
    var count = Math.max(1, n);
    for (var i = 0; i < count; i++) {
      var a0 = (i / count) * 360;
      var a1 = ((i + 1) / count) * 360;
      parts.push(colors[i % colors.length] + ' ' + a0 + 'deg ' + a1 + 'deg');
    }
    return 'conic-gradient(' + parts.join(',') + ')';
  }

  function buildPersistentBarDOM(config, campaign) {
    var campaignId = campaign.id;
    if (!document.getElementById('os-styles')) {
      var st0 = document.createElement('style');
      st0.id = 'os-styles';
      st0.textContent = generateCSS();
      document.head.appendChild(st0);
    }

    var edge = config.barEdge === 'bottom' ? 'bottom' : 'top';
    var isFooter = isStickyFooterType(campaign.type);
    var wrap = document.createElement('div');
    wrap.id = 'os-bar-' + campaignId;
    wrap.className =
      'os-persistent-bar os-bar-' + edge + (isFooter ? ' os-sticky-footer' : ' os-promo-banner');
    wrap.style.background = config.bgColor;
    wrap.style.opacity = config.bgOpacity;

    var promoChip =
      config.showPromoInBar && config.promoCode
        ? '<span class="os-bar-promo" style="border-radius:' +
          config.ctaBorderRadius +
          'px">' +
          escapeHtml(config.promoCode) +
          '</span>'
        : '';

    var headline = config.headline
      ? '<span class="os-bar-headline" style="color:' +
        config.headlineColor +
        ';font-size:' +
        Math.min(config.headlineFontSize, 22) +
        'px;font-weight:' +
        (config.headlineBold ? '700' : '600') +
        '">' +
        escapeHtml(config.headline) +
        '</span>'
      : '';
    var sub = config.subheadline
      ? '<span class="os-bar-sub" style="color:' +
        config.subColor +
        ';font-size:' +
        Math.min(config.subFontSize, 14) +
        'px">' +
        escapeHtml(config.subheadline) +
        '</span>'
      : '';
    var body = config.body
      ? '<span class="os-bar-body" style="color:' +
        config.bodyColor +
        ';font-size:' +
        Math.min(config.bodyFontSize, 14) +
        'px">' +
        escapeHtml(config.body) +
        '</span>'
      : '';

    var cta = config.ctaText
      ? '<button type="button" class="os-bar-cta" style="background:' +
        config.ctaBgColor +
        ';color:' +
        config.ctaTextColor +
        ';border-radius:' +
        config.ctaBorderRadius +
        'px">' +
        escapeHtml(config.ctaText) +
        '</button>'
      : '';

    var dismiss = config.dismissText
      ? '<a href="#" class="os-bar-dismiss">' + escapeHtml(config.dismissText) + '</a>'
      : '';

    var close = config.closeButton
      ? '<button type="button" class="os-bar-close" aria-label="Close">&#215;</button>'
      : '';

    wrap.innerHTML =
      '<div class="os-bar-inner">' +
      close +
      '<div class="os-bar-main">' +
      headline +
      sub +
      body +
      promoChip +
      '</div>' +
      '<div class="os-bar-actions">' +
      cta +
      dismiss +
      '</div>' +
      '</div>';

    function dismissBar() {
      sessionStorage.setItem('os_bar_dismiss_' + campaign.id, '1');
      restoreBodyBarPadding(wrap);
      wrap.remove();
    }

    var closeEl = wrap.querySelector('.os-bar-close');
    if (closeEl) closeEl.addEventListener('click', dismissBar);

    var dis = wrap.querySelector('.os-bar-dismiss');
    if (dis) {
      dis.addEventListener('click', function(e) {
        e.preventDefault();
        dismissBar();
      });
    }

    var ctaEl = wrap.querySelector('.os-bar-cta');
    if (ctaEl) {
      ctaEl.addEventListener('click', function() {
        navigator.sendBeacon(
          PROXY_URL + '/track?event=click&campaign_id=' + campaignId + '&shop=' + encodeURIComponent(shop)
        );
        if (config.ctaAction === 'redirect' && config.ctaUrl) {
          window.location.href = config.ctaUrl;
        } else if (config.ctaAction === 'copy_promo' && config.promoCode) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(config.promoCode);
          }
        } else if (config.ctaAction === 'close') {
          dismissBar();
        }
      });
    }

    return wrap;
  }

  function buildSpinWheelDOM(config, campaign) {
    var campaignId = campaign.id;
    if (!document.getElementById('os-styles')) {
      var st1 = document.createElement('style');
      st1.id = 'os-styles';
      st1.textContent = generateCSS();
      document.head.appendChild(st1);
    }

    var segments = config.spinSegments || [];
    var n = Math.max(1, segments.length);

    var wrapper = document.createElement('div');
    wrapper.id = 'os-overlay-' + campaignId;
    wrapper.className = 'os-overlay-wrapper os-spin-wheel';

    wrapper.innerHTML =
      '<div class="os-backdrop"></div>' +
      '<div class="os-box os-spin-box" style="background:' +
      config.bgColor +
      ';opacity:' +
      config.bgOpacity +
      ';border-radius:' +
      config.borderRadius +
      'px">' +
      (config.closeButton
        ? '<button type="button" class="os-close" aria-label="Close">&#215;</button>'
        : '') +
      '<div class="os-spin-intro">' +
      '<h2 class="os-spin-title" style="color:' +
      config.headlineColor +
      '">' +
      escapeHtml(config.spinTitle) +
      '</h2>' +
      (config.spinSubtitle
        ? '<p class="os-spin-sub" style="color:' +
          config.subColor +
          '">' +
          escapeHtml(config.spinSubtitle) +
          '</p>'
        : '') +
      (config.spinRequireEmail
        ? '<input type="email" class="os-spin-email" placeholder="you@example.com" autocomplete="email" />'
        : '') +
      '<div class="os-wheel-wrap">' +
      '<div class="os-wheel-pointer" aria-hidden="true"></div>' +
      '<div class="os-wheel-disk" style="background:' +
      buildWheelConicGradient(n) +
      '"></div>' +
      '</div>' +
      '<button type="button" class="os-spin-go" style="background:' +
      config.ctaBgColor +
      ';color:' +
      config.ctaTextColor +
      ';border-radius:' +
      config.ctaBorderRadius +
      'px">' +
      escapeHtml(config.spinButtonLabel) +
      '</button>' +
      '</div>' +
      '<div class="os-spin-result" style="display:none">' +
      '<h3 class="os-spin-result-title" style="color:' +
      config.headlineColor +
      '"></h3>' +
      '<p class="os-spin-result-body" style="color:' +
      config.bodyColor +
      '"></p>' +
      '<p class="os-spin-code" style="display:none;font-weight:700;font-size:18px;color:' +
      config.headlineColor +
      '"></p>' +
      '<button type="button" class="os-spin-copy" style="display:none;width:100%;padding:14px;margin-top:16px;border:0;cursor:pointer;font-size:16px;font-weight:600;background:' +
      config.ctaBgColor +
      ';color:' +
      config.ctaTextColor +
      ';border-radius:' +
      config.ctaBorderRadius +
      'px">Copy code</button>' +
      '<button type="button" class="os-spin-close-secondary" style="margin-top:12px;width:100%;background:none;border:0;cursor:pointer;color:#888;text-decoration:underline;font-size:14px">Close</button>' +
      '</div>' +
      '</div>';

    var disk = wrapper.querySelector('.os-wheel-disk');
    var goBtn = wrapper.querySelector('.os-spin-go');
    var intro = wrapper.querySelector('.os-spin-intro');
    var result = wrapper.querySelector('.os-spin-result');
    var resultTitle = wrapper.querySelector('.os-spin-result-title');
    var resultBody = wrapper.querySelector('.os-spin-result-body');
    var codeEl = wrapper.querySelector('.os-spin-code');
    var copyBtn = wrapper.querySelector('.os-spin-copy');
    var emailIn = wrapper.querySelector('.os-spin-email');
    var spun = false;

    function closeAll() {
      wrapper.remove();
    }

    var closeTop = wrapper.querySelector('.os-close');
    if (closeTop) closeTop.addEventListener('click', closeAll);
    var bd = wrapper.querySelector('.os-backdrop');
    if (bd) bd.addEventListener('click', closeAll);
    var secClose = wrapper.querySelector('.os-spin-close-secondary');
    if (secClose) secClose.addEventListener('click', closeAll);

    if (copyBtn) {
      copyBtn.addEventListener('click', function() {
        var code = codeEl ? codeEl.textContent : '';
        if (code && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code);
        }
        navigator.sendBeacon(
          PROXY_URL + '/track?event=click&campaign_id=' + campaignId + '&shop=' + encodeURIComponent(shop)
        );
      });
    }

    var currentRot = 0;
    if (goBtn && disk) {
      goBtn.addEventListener('click', function() {
        if (spun) return;
        if (config.spinRequireEmail && emailIn) {
          var em = (emailIn.value || '').trim();
          if (!em || em.indexOf('@') < 1) {
            emailIn.focus();
            return;
          }
        }
        spun = true;
        goBtn.disabled = true;
        var picked = pickWeightedSpinSegment(segments);
        navigator.sendBeacon(
          PROXY_URL + '/track?event=click&campaign_id=' + campaignId + '&shop=' + encodeURIComponent(shop)
        );
        var per = 360 / n;
        var centerAngle = picked.index * per + per / 2;
        var mod = (360 - centerAngle) % 360;
        currentRot = currentRot + 360 * 7 + mod;
        disk.style.transition = 'transform 4.2s cubic-bezier(0.15, 0.85, 0.2, 1)';
        disk.style.transform = 'rotate(' + currentRot + 'deg)';
        setTimeout(function() {
          var code = resolveSegmentPromo(picked.seg, config.promoCode);
          if (resultTitle) resultTitle.textContent = (picked.seg && picked.seg.label) || 'You won!';
          if (resultBody) {
            resultBody.textContent = code
              ? 'Use this code at checkout.'
              : 'Thanks for playing!';
          }
          if (codeEl && copyBtn) {
            if (code) {
              codeEl.style.display = 'block';
              codeEl.textContent = code;
              copyBtn.style.display = 'block';
            } else {
              codeEl.style.display = 'none';
              copyBtn.style.display = 'none';
            }
          }
          if (intro) intro.style.display = 'none';
          if (result) result.style.display = 'block';
        }, 4200);
      });
    }

    return wrapper;
  }

  function wireOfferInteractions(wrapper, config, campaignId) {
    var ctas = wrapper.querySelectorAll('.os-cta');
    for (var i = 0; i < ctas.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          navigator.sendBeacon(PROXY_URL + '/track?event=click&campaign_id=' + campaignId + '&shop=' + encodeURIComponent(shop));
          if (config.ctaAction === 'redirect' && config.ctaUrl) window.location.href = config.ctaUrl;
          else if (config.ctaAction === 'copy_promo' && config.promoCode) {
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(config.promoCode);
          }
          wrapper.remove();
        });
      })(ctas[i]);
    }
    var dismiss = wrapper.querySelector('.os-dismiss');
    if (dismiss) {
      dismiss.addEventListener('click', function(e) {
        e.preventDefault();
        var tsBox = wrapper.querySelector('.os-box.os-exit-twostep');
        if (tsBox && tsBox.classList.contains('os-exit-show-offer')) {
          tsBox.classList.remove('os-exit-show-offer');
          return;
        }
        wrapper.remove();
      });
    }
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function generateCSS() {
    return (
      '.os-overlay-wrapper{position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s ease}' +
      '.os-overlay-wrapper.os-visible{opacity:1}.os-backdrop{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5)}' +
      '.os-box{position:relative;padding:40px;max-width:560px;width:90%;z-index:1;box-shadow:0 20px 60px rgba(0,0,0,.3)}' +
      '.os-close{position:absolute;top:12px;right:16px;background:0;border:0;font-size:20px;cursor:pointer;color:#666;z-index:2}' +
      '.os-cta,.os-exit-stay{display:block;width:100%;padding:14px;margin-top:20px;border:0;cursor:pointer;font-size:16px;font-weight:600}' +
      '.os-dismiss{display:block;text-align:center;margin-top:12px;cursor:pointer;font-size:13px;color:#888;text-decoration:underline}' +
      '.os-image{width:100%;margin-bottom:16px;border-radius:4px}' +
      '.os-phase-offer{display:none}.os-exit-twostep.os-exit-show-offer .os-phase-gate{display:none}.os-exit-twostep.os-exit-show-offer .os-phase-offer{display:block}' +
      '.os-exit-gate-actions{display:flex;flex-direction:column;gap:12px;margin-top:8px}' +
      '@media(min-width:480px){.os-exit-gate-actions{flex-direction:row;flex-wrap:wrap;align-items:center}}' +
      '.os-exit-leave{background:none;border:0;padding:8px 0;cursor:pointer;font-size:14px;text-decoration:underline;width:100%;text-align:center}' +
      '@media(min-width:480px){.os-exit-leave{width:auto;text-align:left}}' +
      '.os-overlay-wrapper.os-welcome-mat{align-items:stretch;justify-content:stretch}' +
      '.os-welcome-mat .os-backdrop{background:rgba(0,0,0,.42);z-index:0}' +
      '.os-welcome-mat-panel{position:relative;z-index:1;width:100%;min-height:100vh;height:100%;max-width:none;margin:0;border-radius:0!important;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;padding:clamp(20px,4vw,56px);overflow-y:auto;box-shadow:none!important}' +
      '.os-welcome-mat-inner{width:100%;margin:0 auto;text-align:center;flex-shrink:0}' +
      '.os-welcome-mat-inner .os-headline{font-size:clamp(22px,4vw,36px)!important;line-height:1.2}' +
      '.os-welcome-mat-inner .os-image{max-height:min(40vh,280px);width:auto;max-width:100%;object-fit:contain;margin-left:auto;margin-right:auto}' +
      '.os-welcome-mat-inner .os-cta{max-width:min(100%,380px);margin-left:auto;margin-right:auto}' +
      '.os-upsell-modal .os-box{border:2px solid rgba(108,99,255,.22);box-shadow:0 24px 64px rgba(0,0,0,.32)}' +
      '.os-persistent-bar{position:fixed;left:0;right:0;z-index:999998;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(0,0,0,.12);transform:translateY(-100%);opacity:0;transition:transform .35s ease,opacity .35s ease}' +
      '.os-persistent-bar.os-bar-bottom{top:auto;bottom:0;transform:translateY(100%)}' +
      '.os-persistent-bar.os-bar-top{top:0;bottom:auto}' +
      '.os-persistent-bar.os-visible{transform:translateY(0);opacity:1}' +
      '.os-bar-inner{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;width:100%;max-width:1200px;padding:10px 40px 10px 14px;box-sizing:border-box;position:relative;margin:0 auto}' +
      '.os-bar-main{display:flex;flex:1;flex-wrap:wrap;align-items:center;gap:6px 14px;min-width:0}' +
      '.os-bar-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}' +
      '.os-bar-close{position:absolute;top:4px;right:6px;border:0;background:transparent;font-size:22px;line-height:1;cursor:pointer;color:#64748b;padding:4px}' +
      '.os-bar-cta{padding:8px 16px;border:0;cursor:pointer;font-size:14px;font-weight:600;white-space:nowrap}' +
      '.os-bar-promo{font-family:ui-monospace,monospace;font-size:13px;font-weight:700;padding:6px 10px;background:rgba(0,0,0,.06)}' +
      '.os-bar-dismiss{font-size:13px;color:#64748b;text-decoration:underline;cursor:pointer}' +
      '.os-sticky-footer.os-persistent-bar{box-shadow:0 -4px 24px rgba(0,0,0,.1)}' +
      '.os-spin-wheel .os-box.os-spin-box{max-width:400px;width:92%;padding:28px 24px 24px}' +
      '.os-wheel-wrap{position:relative;width:220px;height:220px;margin:16px auto}' +
      '.os-wheel-disk{width:100%;height:100%;border-radius:50%;box-shadow:inset 0 0 0 6px rgba(255,255,255,.25);transition:transform 0s}' +
      '.os-wheel-pointer{position:absolute;top:-4px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-bottom:18px solid #1f2937;z-index:2}' +
      '.os-spin-email{display:block;width:100%;margin:12px 0;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:15px;box-sizing:border-box}' +
      '.os-spin-title{margin:0 0 8px;font-size:22px;font-weight:700;text-align:center;line-height:1.25}' +
      '.os-spin-sub{margin:0 0 8px;font-size:14px;text-align:center;line-height:1.45}' +
      '.os-spin-go{display:block;width:100%;padding:14px;margin-top:8px;border:0;cursor:pointer;font-size:16px;font-weight:600}' +
      '.os-spin-go:disabled{opacity:.55;cursor:default}' +
      '.os-spin-result{text-align:center}' +
      '.os-spin-result-title{margin:0 0 8px;font-size:20px;font-weight:700}' +
      '.os-spin-result-body{margin:0 0 12px;font-size:14px;line-height:1.5}' +
      '.os-spin-code{margin:0 0 8px}'
    );
  }

  function matchesPageTarget(triggerConfig) {
    var target = triggerConfig.pageTargeting || triggerConfig.pageTarget || 'all';
    if (!target || target === 'all') return true;
    var path = window.location.pathname || '/';
    if (target === 'homepage') return path === '/' || path === '';
    if (target === 'product') return path.indexOf('/products/') === 0;
    if (target === 'cart') return path === '/cart';
    if (target === 'custom' && (triggerConfig.customUrlRegex || triggerConfig.customUrlPattern)) {
      try { return new RegExp(triggerConfig.customUrlRegex || triggerConfig.customUrlPattern).test(path); } catch (e) { return true; }
    }
    return true;
  }

  function matchesDevice(triggerConfig) {
    var devices = triggerConfig.deviceTarget;
    if (!devices || !Array.isArray(devices)) {
      var d = triggerConfig;
      devices = [];
      if (d.deviceDesktop !== false) devices.push('desktop');
      if (d.deviceMobile !== false) devices.push('mobile');
      if (d.deviceTablet !== false) devices.push('tablet');
    }
    var ua = navigator.userAgent || '';
    var isMobile = /Mobi|Android/i.test(ua);
    var isTablet = /Tablet|iPad/i.test(ua);
    if (isMobile && !isTablet) return devices.indexOf('mobile') !== -1;
    if (isTablet) return devices.indexOf('tablet') !== -1;
    return devices.indexOf('desktop') !== -1;
  }
})();
