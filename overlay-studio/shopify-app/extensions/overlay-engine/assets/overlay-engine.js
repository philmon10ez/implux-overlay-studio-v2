(function() {
  if (typeof Shopify === 'undefined' || !Shopify.shop) return;
  var shop = Shopify.shop;
  var PROXY_URL = 'https://api.implux.io/proxy';

  function isExitIntentType(t) {
    return String(t || '')
      .toLowerCase()
      .replace(/-/g, '_') === 'exit_intent';
  }

  function truthyExitTwoStep(d) {
    if (d == null || d.exitTwoStep === undefined || d.exitTwoStep === null) return true;
    if (d.exitTwoStep === false || d.exitTwoStep === 'false' || d.exitTwoStep === 0) return false;
    return true;
  }

  function isScrollDepthType(t) {
    return String(t || '')
      .toLowerCase()
      .replace(/-/g, '_') === 'scroll_depth';
  }

  function isWelcomeMatType(t) {
    return String(t || '')
      .toLowerCase()
      .replace(/-/g, '_') === 'welcome_mat';
  }

  function isUpsellModalType(t) {
    return String(t || '')
      .toLowerCase()
      .replace(/-/g, '_') === 'upsell_modal';
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
      var others = [];
      for (var i = 0; i < campaigns.length; i++) {
        var c = campaigns[i];
        if (isExitIntentType(c.type)) exitOnes.push(c);
        else if (isScrollDepthType(c.type)) scrollOnes.push(c);
        else if (isWelcomeMatType(c.type)) welcomeOnes.push(c);
        else if (isUpsellModalType(c.type)) upsellOnes.push(c);
        else others.push(c);
      }
      sortCampaignsNewestFirst(exitOnes);
      sortCampaignsNewestFirst(scrollOnes);
      sortCampaignsNewestFirst(welcomeOnes);
      sortCampaignsNewestFirst(upsellOnes);
      for (var j = 0; j < others.length; j++) initCampaign(others[j]);
      if (exitOnes.length) initCampaign(exitOnes[0]);
      if (scrollOnes.length) initCampaign(scrollOnes[0]);
      if (welcomeOnes.length) initCampaign(welcomeOnes[0]);
      if (upsellOnes.length) initCampaign(upsellOnes[0]);
    })
    .catch(function() {});

  function initCampaign(campaign) {
    var type = campaign.type;
    var triggerConfig = campaign.triggerConfig || {};
    var designConfig = campaign.designConfig || {};
    var id = campaign.id;

    var capKey = 'os_shown_' + id;
    var cap = triggerConfig.frequencyCap;
    if (cap === 'once_ever' && localStorage.getItem(capKey)) return;
    if (cap === 'once_per_session' && sessionStorage.getItem(capKey)) return;

    if (!matchesPageTarget(triggerConfig)) return;
    if (!matchesDevice(triggerConfig)) return;

    if (isExitIntentType(type)) {
      registerExitIntent(campaign);
    } else if (type === 'time_delay') {
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

  function registerExitIntent(campaign) {
    var tc = campaign.triggerConfig || {};
    var threshold = exitIntentYThreshold(tc);
    var handler = function(e) {
      if (typeof e.clientY === 'number' && e.clientY <= threshold) {
        document.removeEventListener('mouseleave', handler);
        checkCartAndShow(campaign);
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

  function registerScrollTrigger(campaign) {
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
      checkCartAndShow(campaign);
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

  function checkCartAndShow(campaign) {
    var tc = campaign.triggerConfig || {};
    var minCart = tc.cartValueMin != null ? tc.cartValueMin : (tc.minCartValue != null ? tc.minCartValue : 0);
    var useCart = tc.cartValueFilter || minCart > 0;
    if (useCart && minCart > 0) {
      fetch('/cart.js')
        .then(function(r) { return r.json(); })
        .then(function(cart) {
          var total = (cart.total_price || 0) / 100;
          if (total >= minCart) showOverlay(campaign);
        })
        .catch(function() { showOverlay(campaign); });
    } else {
      showOverlay(campaign);
    }
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
          : 640
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
      '.os-upsell-modal .os-box{border:2px solid rgba(108,99,255,.22);box-shadow:0 24px 64px rgba(0,0,0,.32)}'
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
