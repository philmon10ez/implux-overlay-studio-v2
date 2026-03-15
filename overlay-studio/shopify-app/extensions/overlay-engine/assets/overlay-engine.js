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

  function registerExitIntent(campaign) {
    var handler = function(e) {
      if (e.clientY <= 5) {
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

    var config = normalizeDesignConfig(designConfig, campaign.promoCode);
    var overlay = buildOverlayDOM(config, id);
    document.body.appendChild(overlay);
    requestAnimationFrame(function() { overlay.classList.add('os-visible'); });

    navigator.sendBeacon(PROXY_URL + '/track?event=impression&campaign_id=' + id + '&shop=' + encodeURIComponent(shop));
  }

  function normalizeDesignConfig(d, promoCode) {
    return {
      bgColor: d.background || '#ffffff',
      bgOpacity: d.backgroundOpacity != null ? d.backgroundOpacity : 0.95,
      borderRadius: d.borderRadius != null ? d.borderRadius : 8,
      closeButton: d.showCloseButton !== false,
      image: d.imageDataUrl || d.image || '',
      headline: d.headline || '',
      headlineColor: d.headlineColor || '#1f2937',
      headlineFontSize: d.headlineSize != null ? d.headlineSize : 24,
      subheadline: d.subheadline || '',
      subColor: d.subheadlineColor || '#6b7280',
      subFontSize: d.subheadlineSize != null ? d.subheadlineSize : 16,
      body: d.body || '',
      ctaText: d.ctaText || '',
      ctaAction: d.ctaAction || 'close',
      ctaUrl: d.ctaUrl || '',
      ctaBgColor: d.ctaBgColor || '#6c63ff',
      ctaTextColor: d.ctaTextColor || '#ffffff',
      ctaBorderRadius: d.ctaBorderRadius != null ? d.ctaBorderRadius : 8,
      dismissText: d.secondaryCtaText || '',
      promoCode: promoCode || d.promoCode || ''
    };
  }

  function buildOverlayDOM(config, campaignId) {
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
        (config.image ? '<img src="' + config.image + '" class="os-image" alt="" />' : '') +
        (config.headline ? '<h2 class="os-headline" style="color:' + config.headlineColor + ';font-size:' + config.headlineFontSize + 'px">' + escapeHtml(config.headline) + '</h2>' : '') +
        (config.subheadline ? '<p class="os-sub" style="color:' + config.subColor + ';font-size:' + config.subFontSize + 'px">' + escapeHtml(config.subheadline) + '</p>' : '') +
        (config.body ? '<p class="os-body">' + escapeHtml(config.body) + '</p>' : '') +
        (config.ctaText ? '<button type="button" class="os-cta" style="background:' + config.ctaBgColor + ';color:' + config.ctaTextColor + ';border-radius:' + config.ctaBorderRadius + 'px">' + escapeHtml(config.ctaText) + '</button>' : '') +
        (config.dismissText ? '<a href="#" class="os-dismiss">' + escapeHtml(config.dismissText) + '</a>' : '') +
      '</div>';

    var cta = wrapper.querySelector('.os-cta');
    if (cta) {
      cta.addEventListener('click', function() {
        navigator.sendBeacon(PROXY_URL + '/track?event=click&campaign_id=' + campaignId + '&shop=' + encodeURIComponent(shop));
        if (config.ctaAction === 'redirect' && config.ctaUrl) window.location.href = config.ctaUrl;
        else if (config.ctaAction === 'copy_promo' && config.promoCode) navigator.clipboard.writeText(config.promoCode);
        wrapper.remove();
      });
    }
    wrapper.querySelector('.os-close') && wrapper.querySelector('.os-close').addEventListener('click', function() { wrapper.remove(); });
    wrapper.querySelector('.os-dismiss') && wrapper.querySelector('.os-dismiss').addEventListener('click', function(e) { e.preventDefault(); wrapper.remove(); });
    wrapper.querySelector('.os-backdrop') && wrapper.querySelector('.os-backdrop').addEventListener('click', function() { wrapper.remove(); });

    return wrapper;
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function generateCSS() {
    return '.os-overlay-wrapper{position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s ease}.os-overlay-wrapper.os-visible{opacity:1}.os-backdrop{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5)}.os-box{position:relative;padding:40px;max-width:560px;width:90%;z-index:1;box-shadow:0 20px 60px rgba(0,0,0,.3)}.os-close{position:absolute;top:12px;right:16px;background:0;border:0;font-size:20px;cursor:pointer;color:#666}.os-cta{display:block;width:100%;padding:14px;margin-top:20px;border:0;cursor:pointer;font-size:16px;font-weight:600}.os-dismiss{display:block;text-align:center;margin-top:12px;cursor:pointer;font-size:13px;color:#888;text-decoration:underline}.os-image{width:100%;margin-bottom:16px;border-radius:4px}';
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
