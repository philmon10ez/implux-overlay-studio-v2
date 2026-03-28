(function() {
  if (typeof Shopify === 'undefined' || !Shopify.shop) return;
  var shop = Shopify.shop;
  var PROXY_URL = 'https://api.implux.io/proxy';

  fetch(PROXY_URL + '/campaigns?shop=' + encodeURIComponent(shop))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var campaigns = data.campaigns || [];
      campaigns.forEach(function(c) { initCampaign(c); });
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

    if (type === 'exit_intent') {
      registerExitIntent(campaign);
    } else if (type === 'time_delay') {
      var sec = triggerConfig.timeDelaySeconds != null ? triggerConfig.timeDelaySeconds : (triggerConfig.delaySeconds != null ? triggerConfig.delaySeconds : 5);
      setTimeout(function() { checkCartAndShow(campaign); }, sec * 1000);
    } else if (type === 'scroll_depth') {
      registerScrollTrigger(campaign);
    } else {
      checkCartAndShow(campaign);
    }
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

  function registerScrollTrigger(campaign) {
    var tc = campaign.triggerConfig || {};
    var pct = tc.scrollDepthPercent != null ? tc.scrollDepthPercent : (tc.scrollPercent != null ? tc.scrollPercent : 50);
    var handler = function() {
      var doc = document.documentElement || document.body;
      var max = (doc.scrollHeight - window.innerHeight) || 1;
      var scrolled = (window.scrollY / max) * 100;
      if (scrolled >= pct) {
        window.removeEventListener('scroll', handler);
        checkCartAndShow(campaign);
      }
    };
    window.addEventListener('scroll', handler);
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
    requestAnimationFrame(function() { overlay.classList.add('os-visible'); });

    navigator.sendBeacon(PROXY_URL + '/track?event=impression&campaign_id=' + id + '&shop=' + encodeURIComponent(shop));
  }

  function normalizeDesignConfig(d, promoCode, campaignType) {
    var exitTwoStep = campaignType === 'exit_intent' && d.exitTwoStep !== false;
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
      offerEyebrowColor: d.exitOfferEyebrowColor || '#6c63ff'
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
    if (campaign.type === 'exit_intent' && config.exitTwoStep) {
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
    wrapper.className = 'os-overlay-wrapper';
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
        if (!onOffer) {
          navigator.sendBeacon(PROXY_URL + '/track?event=exit_leave&campaign_id=' + campaignId + '&shop=' + encodeURIComponent(shop));
        }
        wrapper.remove();
      });
    wrapper.querySelector('.os-backdrop') &&
      wrapper.querySelector('.os-backdrop').addEventListener('click', function() {
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
      '@media(min-width:480px){.os-exit-leave{width:auto;text-align:left}}'
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
