(function () {
  'use strict';

  var SDK_VERSION = '3.0.0';
  var STORAGE_PREFIX = '_gtm_';

  // ── Utilities ──

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function sha256(str) {
    if (!window.crypto || !window.crypto.subtle) return str;
    var encoder = new TextEncoder();
    return crypto.subtle.digest('SHA-256', encoder.encode(str)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  function now() { return new Date().toISOString(); }
  function nowMs() { return Date.now(); }

  function getClosestAttribute(el, attr) {
    while (el) {
      if (el.getAttribute && el.hasAttribute(attr)) return el.getAttribute(attr);
      el = el.parentElement;
    }
    return null;
  }

  function buildSelector(el) {
    if (el.id) return '#' + el.id;
    var path = [];
    while (el && el !== document) {
      var name = el.tagName.toLowerCase();
      if (el.id) { path.unshift('#' + el.id); break; }
      if (el.className && typeof el.className === 'string') {
        var classes = el.className.trim().split(/\s+/).slice(0, 2).join('.');
        if (classes) name += '.' + classes;
      }
      path.unshift(name);
      el = el.parentElement;
    }
    return path.join(' > ');
  }

  function buildXPath(el) {
    if (el.id) return '//*[@id="' + el.id + '"]';
    if (el === document.body) return '/html/body';
    var ix = 0;
    var siblings = el.parentNode ? el.parentNode.children : [];
    for (var i = 0; i < siblings.length; i++) {
      var sibling = siblings[i];
      if (sibling === el) return buildXPath(el.parentNode) + '/' + el.tagName.toLowerCase() + '[' + (ix + 1) + ']';
      if (sibling.tagName === el.tagName) ix++;
    }
    return '';
  }

  function nthOfType(el) {
    var parent = el.parentNode;
    if (!parent) return 1;
    var tag = el.tagName;
    var ix = 1;
    for (var i = 0; i < parent.children.length; i++) {
      if (parent.children[i] === el) return ix;
      if (parent.children[i].tagName === tag) ix++;
    }
    return 1;
  }

  function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  // ── Browser Engine Detection ──

  function getBrowserEngine(ua) {
    if (/Edg\//i.test(ua)) return { name: 'Edge', version: (ua.match(/Edg\/([\d.]+)/) || [])[1] || '' };
    if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return { name: 'Opera', version: (ua.match(/(?:OPR|Version)\/([\d.]+)/) || [])[1] || '' };
    if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return { name: 'Chrome', version: (ua.match(/Chrome\/([\d.]+)/) || [])[1] || '' };
    if (/Firefox\//i.test(ua)) return { name: 'Firefox', version: (ua.match(/Firefox\/([\d.]+)/) || [])[1] || '' };
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return { name: 'Safari', version: (ua.match(/Version\/([\d.]+)/) || [])[1] || '' };
    return { name: 'Unknown', version: '' };
  }

  function getOS(ua) {
    if (/Windows/i.test(ua)) return { name: 'Windows', version: (ua.match(/Windows NT ([\d.]+)/) || [])[1] || '' };
    if (/Mac OS X/i.test(ua) || /macOS/i.test(ua)) return { name: 'macOS', version: (ua.match(/Mac OS X ([\d_]+)/) || [])[1] ? (ua.match(/Mac OS X ([\d_]+)/)[1].replace(/_/g, '.')) : '' };
    if (/Linux/i.test(ua) && !/Android/i.test(ua)) return { name: 'Linux', version: '' };
    if (/Android/i.test(ua)) return { name: 'Android', version: (ua.match(/Android ([\d.]+)/) || [])[1] || '' };
    if (/iPhone|iPad|iPod/i.test(ua)) return { name: 'iOS', version: (ua.match(/OS ([\d_]+)/) || [])[1] ? (ua.match(/OS ([\d_]+)/)[1].replace(/_/g, '.')) : '' };
    if (/CrOS/i.test(ua)) return { name: 'ChromeOS', version: '' };
    return { name: 'Unknown', version: '' };
  }

  function getDeviceType(ua) {
    var w = screen.width;
    if (/iPad|Android(?!.*Mobile)|Windows(?!.*Phone)|Macintosh|Linux(?!.*Android)/i.test(ua) && w >= 768) return 'tablet';
    if (/Mobile|iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function getOrientation() {
    if (screen.orientation && screen.orientation.type) return screen.orientation.type.split('-')[0];
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }

  // ── Collectors ──

  function collectIdentifiers(sdk) {
    return {
      event_id: uuid(),
      session_id: sdk.sessionId,
      visitor_id: sdk.visitorId,
      website: window.location.origin,
      time: now(),
      sdk_version: SDK_VERSION,
    };
  }

  function collectPage(sdk) {
    return {
      page_title: document.title,
      page_path: window.location.pathname,
      page_url: window.location.href,
      search: window.location.search || '',
      hash: window.location.hash || '',
      landing_page: sdk.landingPage,
      referrer: document.referrer || '',
      page_load_time_ms: sdk.pageLoadStart ? nowMs() - sdk.pageLoadStart : 0,
      time_since_page_load_ms: sdk.pageLoadStart ? nowMs() - sdk.pageLoadStart : 0,
      is_new_session: sdk.isNewSession || false,
      page_number_in_session: sdk.pageNumber,
      previous_page_url: sdk.previousPage || '',
    };
  }

  function collectAttribution() {
    var params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
      gclid: params.get('gclid') || '',
      gbraid: params.get('gbraid') || '',
      wbraid: params.get('wbraid') || '',
      fbclid: params.get('fbclid') || '',
      msclkid: params.get('msclkid') || '',
      ttclid: params.get('ttclid') || '',
      twclid: params.get('twclid') || '',
      dclid: params.get('dclid') || '',
      li_fat_id: params.get('li_fat_id') || '',
      igshid: params.get('igshid') || '',
      mc_cid: params.get('mc_cid') || '',
      mc_eid: params.get('mc_eid') || '',
      utm_id: params.get('utm_id') || '',
      utm_source_platform: params.get('utm_source_platform') || '',
      utm_creative_format: params.get('utm_creative_format') || '',
      utm_term: params.get('utm_term') || '',
      affiliate_id: params.get('affiliate_id') || params.get('ref') || '',
      campaign_id: params.get('campaign_id') || params.get('cid') || '',
    };
  }

  function collectAllUrlParams() {
    var params = new URLSearchParams(window.location.search);
    var result = {};
    params.forEach(function (value, key) {
      result[key] = value;
    });
    return result;
  }

  function collectDevice() {
    var ua = navigator.userAgent;
    var os = getOS(ua);
    var browser = getBrowserEngine(ua);
    return {
      os_name: os.name,
      os_version: os.version,
      device_type: getDeviceType(ua),
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      user_agent: ua,
      browser: {
        name: browser.name,
        version: browser.version,
        engine: browser.name === 'Edge' ? 'EdgeHTML/Blink' : browser.name === 'Firefox' ? 'Gecko' : browser.name === 'Safari' ? 'WebKit' : 'Blink',
      },
      display: {
        screen_width: screen.width,
        screen_height: screen.height,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        pixel_ratio: window.devicePixelRatio || 1,
        color_depth: screen.colorDepth || 24,
        orientation: getOrientation(),
      },
    };
  }

  function collectNetwork() {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return { connection_type: '', effective_bandwidth_mbps: 0, rtt_ms: 0, save_data: false, online: navigator.onLine };
    return {
      connection_type: conn.effectiveType || '',
      effective_bandwidth_mbps: conn.downlink || 0,
      rtt_ms: conn.rtt || 0,
      save_data: conn.saveData || false,
      online: navigator.onLine,
    };
  }

  function collectConsent(sdk) {
    return {
      consent_status: sdk.consentStatus || 'pending',
      analytics: sdk.consent.analytics !== false,
      marketing: sdk.consent.marketing === true,
      preferences: sdk.consent.preferences !== false,
    };
  }

  function collectEngagement(sdk) {
    return {
      time_on_page_ms: sdk.pageLoadStart ? nowMs() - sdk.pageLoadStart : 0,
      scroll_depth_percent: sdk.scrollMaxDepth || 0,
      mouse_movements: sdk.mouseMoveCount || 0,
      click_count: sdk.clickCount || 0,
      keypress_count: sdk.keypressCount || 0,
      rage_click: sdk.rageClick || false,
      inactive_time_ms: sdk.totalInactiveTime || 0,
      active_time_ms: sdk.pageLoadStart ? (nowMs() - sdk.pageLoadStart - (sdk.totalInactiveTime || 0)) : 0,
    };
  }

  function collectSession(sdk) {
    return {
      session_duration_ms: sdk.sessionStart ? nowMs() - sdk.sessionStart : 0,
      event_count: sdk.eventCount,
      pageviews: sdk.pageNumber,
      entry_page: sdk.entryPage || '',
      exit_page: window.location.href,
      bounce: sdk.pageNumber <= 1,
    };
  }

  function collectPerformance() {
    var perf = window.performance;
    if (!perf || !perf.timing) return {};
    var t = perf.timing;
    var nav = perf.getEntriesByType('navigation')[0] || {};
    return {
      dns_ms: (t.domainLookupEnd - t.domainLookupStart) || (nav.domainLookupEnd - nav.domainLookupStart) || 0,
      tcp_ms: (t.connectEnd - t.connectStart) || (nav.connectEnd - nav.connectStart) || 0,
      ssl_ms: (t.secureConnectionStart ? t.connectEnd - t.secureConnectionStart : 0) || 0,
      ttfb_ms: (t.responseStart - t.requestStart) || (nav.responseStart - nav.requestStart) || 0,
      dom_ready_ms: (t.domInteractive - t.navigationStart) || 0,
      window_loaded_ms: (t.loadEventEnd - t.navigationStart) || 0,
      largest_contentful_paint_ms: 0,
      first_input_delay_ms: 0,
      cumulative_layout_shift: 0,
      interaction_to_next_paint_ms: 0,
    };
  }

  // ── Core Tracker ──

  var GTMTracker = {
    // Config
    config: {
      apiKey: '',
      websiteId: '',
      endpoint: 'https://collect.domain.com',
      debug: false,
      batchSize: 20,
      flushInterval: 5000,
      trackClicks: true,
      trackForms: true,
      trackScroll: true,
      trackVideos: true,
      trackErrors: true,
      trackPerformance: true,
      trackEngagement: true,
      consentRequired: false,
      respectDoNotTrack: false,
      // Set from the dashboard snippet: E-Commerce websites auto-capture shop events.
      ecommerce: false,
      websiteType: '',
      // Shop country and its currency, set per website in the dashboard.
      country: '',
      currency: 'INR',
    },

    // State
    queue: [],
    timer: null,
    sessionId: null,
    visitorId: null,
    started: false,
    ready: false,
    eventCount: 0,
    pageNumber: 1,
    clickCount: 0,
    mouseMoveCount: 0,
    keypressCount: 0,
    scrollMaxDepth: 0,
    rageClick: false,
    totalInactiveTime: 0,
    pageLoadStart: null,
    sessionStart: null,
    landingPage: null,
    entryPage: null,
    previousPage: null,
    isNewSession: false,
    userId: null,
    userEmail: null,
    userEmailHash: null,
    userPhoneHash: null,
    customDimensions: {},
    consentStatus: 'pending',
    consent: { analytics: true, marketing: false, preferences: true },
    _lastScrollPct: 0,
    _inactiveTimer: null,
    _lastActiveTime: null,
    _history: [],

    init: function (options) {
      for (var key in options) {
        if (key in this.config) this.config[key] = options[key];
      }

      this.loadConsent();
      this.visitorId = this.getCookie('visitor_id') || uuid();
      this.setCookie('visitor_id', this.visitorId, 365);
      // Sessions end after 30 minutes of inactivity: the cookie expiry rolls forward on every event.
      this.sessionId = this.getCookie('session_id');
      this.isNewSession = !this.sessionId;
      if (!this.sessionId) this.sessionId = uuid();
      this.touchSession();
      this.updateVisit();
      this.updateTouches();
      this.updateAdCookies();

      var pg = this.getSessionStorage('page_number');
      this.pageNumber = pg ? parseInt(pg, 10) + 1 : 1;
      this.setSessionStorage('page_number', String(this.pageNumber));

      this.landingPage = this.getSessionStorage('entry_page') || window.location.href;
      this.setSessionStorage('entry_page', this.landingPage);
      this.entryPage = this.landingPage;

      this.pageLoadStart = nowMs();
      this.sessionStart = this.sessionStart || this.pageLoadStart;
      this._lastActiveTime = this.pageLoadStart;

      this.loadConsent();

      if (this.config.respectDoNotTrack && navigator.doNotTrack === '1') {
        if (this.config.debug) console.log('[GTM] Do Not Track enabled — skipping tracking');
        return;
      }

      this.start();
    },

    start: function () {
      if (this.started) return;
      this.started = true;

      this.attachListeners();
      this.startFlushTimer();
      this.startInactivityTracker();
      this.startRageClickDetector();

      if (this.config.trackPerformance) this.capturePerformanceMetrics();
      if (this.config.trackErrors) this.attachErrorListeners();
      if (this.config.trackVideos) this.attachVideoListeners();

      this.track('PageView', {});
      this.attachEcommerce();

      if (this.config.trackEngagement) {
        this.track('SessionStart', {});
      }

      this.ready = true;
      if (window.GTMTracker) window.GTMTracker.ready = true;
    },

    // ── Identity ──

    identify: function (data) {
      if (data.userId) {
        this.userId = data.userId;
        this.setCookie('user_id', data.userId, 365);
      }
      if (data.email) {
        this.userEmail = data.email;
        var self = this;
        sha256(data.email.toLowerCase().trim()).then(function (hash) { self.userEmailHash = hash; });
      }
      if (data.phone) {
        var self = this;
        sha256(data.phone.replace(/\D/g, '')).then(function (hash) { self.userPhoneHash = hash; });
      }
      this.track('Identify', {
        user_id: data.userId || '',
        email_hash: this.userEmailHash || '',
        phone_hash: this.userPhoneHash || '',
        name: data.name || '',
      });

      var payload = {
        visitor_id: this.visitorId,
        session_id: this.sessionId,
        user_id: data.userId || this.userId,
        email: data.email || this.userEmail,
        name: data.name || '',
      };
      fetch(this.config.endpoint + '/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.config.apiKey },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    },

    setConsent: function (status, prefs) {
      this.consentStatus = status;
      if (prefs) {
        for (var k in prefs) this.consent[k] = prefs[k];
      }
      localStorage.setItem('gtm_consent', JSON.stringify({ status: status, prefs: this.consent }));
      this.track('ConsentUpdate', { status: status, ...this.consent });
    },

    loadConsent: function () {
      try {
        var raw = localStorage.getItem('gtm_consent');
        if (raw) {
          var c = JSON.parse(raw);
          this.consentStatus = c.status || 'pending';
          if (c.prefs) for (var k in c.prefs) this.consent[k] = c.prefs[k];
        }
      } catch (e) {}
    },

    // ── Event Methods ──

    track: function (type, properties, custom) {
      if (this.config.consentRequired && this.consentStatus !== 'granted') {
        if (type !== 'ConsentUpdate') return;
      }

      this.eventCount++;
      this.clickCount++;
      this.touchSession();

      var event = {
        identifiers: collectIdentifiers(this),
        page: collectPage(this),
        attribution: collectAttribution(),
        url_params: collectAllUrlParams(),
        event: {
          type: type,
          properties: properties || {},
        },
        engagement: collectEngagement(this),
        device: collectDevice(),
        geo: {},
        network: collectNetwork(),
        consent: collectConsent(this),
        performance: this._perfMetrics || {},
        session: collectSession(this),
        context: this.collectContext(),
        custom: custom || this.customDimensions || {},
      };

      this.queue.push(event);
      this._history.push({ t: type, ts: now() });

      if (this.config.debug) console.log('[GTM] Track', type, event);

      if (this.queue.length >= this.config.batchSize) this.flush();
    },

    // ── E-Commerce ──

    viewProduct: function (data) {
      this.ecomEmit('ViewContent', this.ecomProps([data], data), 'manual');
    },

    addToCart: function (data) {
      this.ecomEmit('AddToCart', this.ecomProps([data], { currency: data.currency }), 'manual');
    },

    removeFromCart: function (data) {
      this.ecomEmit('RemoveFromCart', this.ecomProps([data], { currency: data.currency }), 'manual');
    },

    beginCheckout: function (data) {
      this.ecomEmit('InitiateCheckout', this.ecomProps(data.items || [], { value: data.total, currency: data.currency, coupon: data.coupon }), 'manual');
    },

    purchase: function (data) {
      this.ecomEmit('Purchase', this.ecomProps(data.products || data.items || [], {
        value: data.revenue != null ? data.revenue : data.total,
        currency: data.currency,
        order_id: data.order_id || data.transaction_id,
        tax: data.tax, shipping: data.shipping, discount: data.discount, coupon: data.coupon,
      }), 'manual');
    },

    // ── E-Commerce auto-capture ──
    // Three layers, strongest first: dataLayer (GA4 / UA ecommerce pushes from GTM, Shopify,
    // WooCommerce plugins), built-in Shopify + WooCommerce hooks, then generic page detection.
    // The same event from several layers within ~2s is sent once, keeping the strongest.

    _ecomSlots: {},

    ecomNumber: function (value) {
      if (typeof value === 'number') return isFinite(value) ? value : 0;
      if (typeof value !== 'string') return 0;
      var n = parseFloat(value.replace(/[^0-9.\-]/g, ''));
      return isFinite(n) ? n : 0;
    },

    ecomProps: function (items, extra) {
      var self = this;
      extra = extra || {};
      var contents = (Array.isArray(items) ? items : []).filter(Boolean).map(function (it) {
        return {
          id: String(it.item_id || it.id || it.product_id || it.sku || it.variant_id || ''),
          name: String(it.item_name || it.name || it.title || ''),
          price: self.ecomNumber(it.price),
          quantity: self.ecomNumber(it.quantity) || 1,
          category: String(it.item_category || it.category || ''),
          brand: String(it.item_brand || it.brand || ''),
          variant: String(it.item_variant || it.variant || ''),
        };
      });
      var computed = contents.reduce(function (sum, c) { return sum + c.price * c.quantity; }, 0);
      var props = {
        value: extra.value != null && extra.value !== '' ? this.ecomNumber(extra.value) : Math.round(computed * 100) / 100,
        currency: String(extra.currency || this.config.currency || 'INR').toUpperCase(),
        content_type: 'product',
        content_ids: contents.map(function (c) { return c.id; }).filter(Boolean),
        contents: contents,
        num_items: contents.reduce(function (sum, c) { return sum + c.quantity; }, 0),
      };
      if (contents[0]) {
        props.product_id = contents[0].id;
        props.product_name = contents[0].name;
      }
      ['order_id', 'coupon', 'tax', 'shipping', 'discount', 'search_term'].forEach(function (key) {
        if (extra[key] != null && extra[key] !== '') props[key] = extra[key];
      });
      return props;
    },

    ecomEmit: function (name, props, source) {
      var priority = { dom: 1, shopify: 2, woocommerce: 2, datalayer: 3, manual: 4 }[source] || 1;
      if (name === 'Purchase' && props.order_id && this.getLocalStorage('order_' + props.order_id)) return;
      var t = nowMs();
      var slot = this._ecomSlots[name];
      if (slot && t - slot.at < 2000) {
        if (slot.priority >= priority) return;
        if (!slot.timer) return; // weaker copy already sent
        clearTimeout(slot.timer);
      }
      var self = this;
      props.capture_source = source;
      if (this._platform) props.store_platform = this._platform;
      var send = function () {
        slot.timer = null;
        if (name === 'Purchase' && props.order_id) self.setLocalStorage('order_' + props.order_id, String(nowMs()));
        self.track(name, props);
      };
      slot = this._ecomSlots[name] = { at: t, priority: priority, timer: null };
      // Platform/DOM guesses wait briefly so a precise dataLayer push can replace them.
      if (priority < 3) slot.timer = setTimeout(send, 700);
      else send();
    },

    attachEcommerce: function () {
      try { this.attachDataLayer(); } catch (e) {}
      if (!this.config.ecommerce) return;
      try {
        if (!this.attachShopify()) this.attachWooCommerce();
      } catch (e) {}
      try { this.attachDomCommerce(); } catch (e) {}
    },

    attachDataLayer: function () {
      var self = this;
      var dl = window.dataLayer = window.dataLayer || [];
      var seen = 0;
      var scan = function () {
        for (; seen < dl.length; seen++) {
          try { self.handleDataLayer(dl[seen]); } catch (e) {}
        }
      };
      scan();
      var original = dl.push;
      dl.push = function () {
        var result = original.apply(dl, arguments);
        scan();
        return result;
      };
      // GTM may replace push after we load; a light poll catches anything we missed.
      setInterval(scan, 1000);
    },

    handleDataLayer: function (entry) {
      if (!entry || typeof entry !== 'object') return;
      var name, data;
      if (typeof entry.length === 'number' && entry[0] === 'event') {
        // gtag('event', 'add_to_cart', {...}) pushes an arguments object.
        name = entry[1];
        data = entry[2] || {};
      } else if (entry.event) {
        name = entry.event;
        data = entry.ecommerce || entry;
      } else if (entry.ecommerce) {
        data = entry.ecommerce;
      } else {
        return;
      }
      var GA4 = {
        view_item: 'ViewContent', view_item_list: 'ViewCategory', add_to_cart: 'AddToCart',
        remove_from_cart: 'RemoveFromCart', view_cart: 'ViewCart', begin_checkout: 'InitiateCheckout',
        add_shipping_info: 'AddShippingInfo', add_payment_info: 'AddPaymentInfo', purchase: 'Purchase',
        refund: 'Refund', add_to_wishlist: 'AddToWishlist', search: 'Search', generate_lead: 'Lead',
        sign_up: 'SignUp', login: 'Login',
      };
      var mapped = GA4[name];
      if (mapped) {
        if (!this.config.ecommerce && ['Lead', 'SignUp', 'Login', 'Search'].indexOf(mapped) === -1) return;
        var items = data.items || (data.ecommerce && data.ecommerce.items) || [];
        this.ecomEmit(mapped, this.ecomProps(items, {
          value: data.value, currency: data.currency, order_id: data.transaction_id,
          coupon: data.coupon, tax: data.tax, shipping: data.shipping, search_term: data.search_term,
        }), 'datalayer');
        return;
      }
      if (!this.config.ecommerce || !data) return;
      // Universal Analytics enhanced ecommerce.
      var ua = [['detail', 'ViewContent'], ['add', 'AddToCart'], ['remove', 'RemoveFromCart'], ['checkout', 'InitiateCheckout'], ['purchase', 'Purchase']];
      for (var i = 0; i < ua.length; i++) {
        var block = data[ua[i][0]];
        if (!block) continue;
        var action = block.actionField || {};
        this.ecomEmit(ua[i][1], this.ecomProps(block.products || [], {
          value: action.revenue, currency: data.currencyCode, order_id: action.id, coupon: action.coupon,
          tax: action.tax, shipping: action.shipping,
        }), 'datalayer');
        return;
      }
    },

    // Calls back with (url, body) for every fetch / XHR the page makes.
    interceptRequests: function (callback) {
      var notify = function (url, body) { try { callback(String(url || ''), body); } catch (e) {} };
      if (window.fetch) {
        var originalFetch = window.fetch;
        window.fetch = function (input, init) {
          notify(typeof input === 'string' ? input : input && input.url, init && init.body);
          return originalFetch.apply(this, arguments);
        };
      }
      if (window.XMLHttpRequest) {
        var open = XMLHttpRequest.prototype.open;
        var sendXhr = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function (method, url) {
          this._cdpUrl = url;
          return open.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function (body) {
          notify(this._cdpUrl, body);
          return sendXhr.apply(this, arguments);
        };
      }
    },

    readRequestBody: function (body) {
      if (!body) return {};
      if (typeof body === 'string') {
        try { return JSON.parse(body); } catch (e) {}
        var out = {};
        new URLSearchParams(body).forEach(function (v, k) { out[k] = v; });
        return out;
      }
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        var data = {};
        body.forEach(function (v, k) { data[k] = v; });
        return data;
      }
      return {};
    },

    attachShopify: function () {
      var shopify = window.Shopify;
      var analytics = window.ShopifyAnalytics;
      if (!shopify && !analytics) return false;
      this._platform = 'shopify';
      var self = this;
      var meta = (analytics && analytics.meta) || window.meta || {};
      var currency = (shopify && shopify.currency && shopify.currency.active) || this.config.currency;
      var pageType = meta.page && meta.page.pageType;
      var product = meta.product;
      var variantItem = function (variantId) {
        var variants = (product && product.variants) || [];
        var variant = variants.filter(function (v) { return String(v.id) === String(variantId); })[0] || variants[0];
        if (!variant) return null;
        return { id: product.id, variant_id: variant.id, name: variant.name || product.title || '', price: (variant.price || 0) / 100, variant: variant.public_title || '' };
      };

      if (pageType === 'product' && product) {
        var item = variantItem(null);
        if (item) this.ecomEmit('ViewContent', this.ecomProps([item], { currency: currency }), 'shopify');
      } else if (pageType === 'collection') {
        this.ecomEmit('ViewCategory', this.ecomProps([], { currency: currency, value: 0 }), 'shopify');
      }

      this.interceptRequests(function (url, body) {
        if (!/\/cart\/add(\.js)?(\?|$)/.test(url)) return;
        var data = self.readRequestBody(body);
        var lines = data.items || [{ id: data.id, quantity: data.quantity }];
        var items = lines.map(function (line) {
          var it = variantItem(line.id) || { id: line.id, name: '', price: 0 };
          it.quantity = parseInt(line.quantity, 10) || 1;
          return it;
        });
        self.ecomEmit('AddToCart', self.ecomProps(items, { currency: currency }), 'shopify');
      });
      document.addEventListener('submit', function (e) {
        var form = e.target;
        if (!form || !form.getAttribute) return;
        var action = form.getAttribute('action') || '';
        if (/\/cart\/add/.test(action)) {
          var idField = form.querySelector('[name="id"]');
          var qtyField = form.querySelector('[name="quantity"]');
          var it = variantItem(idField && idField.value) || { id: idField && idField.value, price: 0 };
          it.quantity = parseInt(qtyField && qtyField.value, 10) || 1;
          self.ecomEmit('AddToCart', self.ecomProps([it], { currency: currency }), 'shopify');
        } else if (/\/cart$/.test(action) && e.submitter && e.submitter.name === 'checkout') {
          self.ecomEmit('InitiateCheckout', self.ecomProps([], { currency: currency, value: 0 }), 'shopify');
        }
      }, true);

      // Classic checkout (thank-you page "additional scripts"). Checkout Extensibility stores
      // need the Shopify customer-events pixel to send Purchase.
      var checkout = shopify && shopify.checkout;
      if (checkout) {
        var lines = (checkout.line_items || []).map(function (li) {
          return { id: li.product_id, variant_id: li.variant_id, name: li.title, price: li.price, quantity: li.quantity, sku: li.sku };
        });
        var isThankYou = /thank_you|\/orders\//.test(location.pathname) || checkout.order_id;
        this.ecomEmit(isThankYou ? 'Purchase' : 'InitiateCheckout', this.ecomProps(lines, {
          value: checkout.total_price, currency: checkout.currency || currency, order_id: checkout.order_id,
          tax: checkout.total_tax, shipping: checkout.shipping_rate && checkout.shipping_rate.price,
          discount: checkout.discount && checkout.discount.amount,
        }), 'shopify');
      }
      return true;
    },

    attachWooCommerce: function () {
      var body = document.body;
      var cls = (body && body.className) || '';
      if (!window.wc_add_to_cart_params && !window.woocommerce_params && !/\bwoocommerce(-page)?\b/.test(cls)) return false;
      this._platform = 'woocommerce';
      var self = this;
      var priceIn = function (root) {
        var el = root && root.querySelector('.price ins .amount, .price .amount, .woocommerce-Price-amount');
        return el ? self.ecomNumber(el.textContent) : 0;
      };
      var pageProduct = function () {
        var jsonLd = self.readJsonLdProduct();
        if (jsonLd) return jsonLd;
        var form = document.querySelector('form.cart');
        var idField = form && (form.querySelector('[name="add-to-cart"]') || form.querySelector('[name="product_id"]'));
        var title = document.querySelector('.product_title, h1');
        return {
          id: idField ? idField.value : '',
          name: title ? title.textContent.trim() : document.title,
          price: priceIn(document.querySelector('.summary, .product')),
        };
      };

      if (/\bsingle-product\b/.test(cls)) {
        this.ecomEmit('ViewContent', this.ecomProps([pageProduct()]), 'woocommerce');
      }

      // AJAX add-to-cart buttons on shop/category pages.
      if (window.jQuery) {
        window.jQuery(document.body).on('added_to_cart', function (e, fragments, hash, button) {
          var btn = button && button[0];
          var card = btn && btn.closest ? btn.closest('.product, li') : null;
          var titleEl = card && card.querySelector('.woocommerce-loop-product__title, h2, h3');
          self.ecomEmit('AddToCart', self.ecomProps([{
            id: btn ? btn.getAttribute('data-product_id') || btn.getAttribute('data-product_sku') : '',
            name: btn && btn.getAttribute('data-product_name') || (titleEl ? titleEl.textContent.trim() : ''),
            quantity: btn ? btn.getAttribute('data-quantity') : 1,
            price: priceIn(card),
          }]), 'woocommerce');
        });
      }
      // Single product form (full page submit).
      document.addEventListener('submit', function (e) {
        var form = e.target;
        if (!form || !form.matches || !form.matches('form.cart')) return;
        var product = pageProduct();
        var qty = form.querySelector('[name="quantity"]');
        product.quantity = qty ? qty.value : 1;
        self.ecomEmit('AddToCart', self.ecomProps([product]), 'woocommerce');
      }, true);

      if (/\bwoocommerce-order-received\b/.test(cls)) {
        var orderMatch = location.pathname.match(/order-received\/(\d+)/);
        var orderEl = document.querySelector('.woocommerce-order-overview__order strong, .order strong');
        var totalEl = document.querySelector('.woocommerce-order-overview__total .amount, .order-total .amount');
        this.ecomEmit('Purchase', this.ecomProps([], {
          order_id: orderMatch ? orderMatch[1] : orderEl ? orderEl.textContent.trim() : '',
          value: totalEl ? totalEl.textContent : 0,
        }), 'woocommerce');
      } else if (/\bwoocommerce-checkout\b/.test(cls)) {
        var total = document.querySelector('.order-total .amount');
        this.ecomEmit('InitiateCheckout', this.ecomProps([], { value: total ? total.textContent : 0 }), 'woocommerce');
      } else if (/\bwoocommerce-cart\b/.test(cls)) {
        var cartTotal = document.querySelector('.order-total .amount, .cart-subtotal .amount');
        this.ecomEmit('ViewCart', this.ecomProps([], { value: cartTotal ? cartTotal.textContent : 0 }), 'woocommerce');
      }
      return true;
    },

    readJsonLdProduct: function () {
      var scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < scripts.length; i++) {
        var data;
        try { data = JSON.parse(scripts[i].textContent); } catch (e) { continue; }
        var nodes = [].concat(data && data['@graph'] ? data['@graph'] : data);
        for (var j = 0; j < nodes.length; j++) {
          var node = nodes[j];
          var type = node && node['@type'];
          if (type === 'Product' || (Array.isArray(type) && type.indexOf('Product') !== -1)) {
            var offer = [].concat(node.offers || [])[0] || {};
            if (offer.offers) offer = [].concat(offer.offers)[0] || offer;
            return {
              id: node.sku || node.productID || node.mpn || '',
              name: node.name || '',
              price: offer.price || offer.lowPrice || 0,
              brand: node.brand && (node.brand.name || node.brand) || '',
              currency: offer.priceCurrency || '',
            };
          }
        }
      }
      return null;
    },

    // Generic fallback for any store: product schema, add-to-cart / checkout buttons and
    // order confirmation URLs.
    attachDomCommerce: function () {
      var self = this;
      var product = this.readJsonLdProduct();
      if (product) {
        this.ecomEmit('ViewContent', this.ecomProps([product], { currency: product.currency }), 'dom');
      }
      var label = function (el) {
        return [el.innerText || el.textContent || '', el.value || '', el.getAttribute('aria-label') || '', el.getAttribute('name') || '', el.id || '', typeof el.className === 'string' ? el.className : '']
          .join(' ').toLowerCase();
      };
      document.addEventListener('click', function (e) {
        var el = e.target && e.target.closest ? e.target.closest('button, a, input[type="submit"], [role="button"]') : null;
        if (!el) return;
        var text = label(el);
        if (/add[\s_-]*to[\s_-]*(cart|bag|basket)|buy[\s_-]*now|add_to_cart|single_add_to_cart/.test(text)) {
          var item = self.readJsonLdProduct() || {
            id: el.getAttribute('data-product-id') || el.getAttribute('data-product_id') || el.getAttribute('data-sku') || '',
            name: (document.querySelector('h1') || {}).textContent || document.title,
          };
          self.ecomEmit('AddToCart', self.ecomProps([item], { currency: item.currency }), 'dom');
        } else if (/(^|\s)(proceed[\s_-]*to[\s_-]*)?(checkout|place[\s_-]*order)(\s|$)/.test(text)) {
          self.ecomEmit('InitiateCheckout', self.ecomProps([], { value: 0 }), 'dom');
        }
      }, true);
      if (/(thank[-_]?you|order[-_]?(received|confirmation|complete|success)|checkout\/success|purchase[-_]?complete)/i.test(location.pathname)) {
        var params = new URLSearchParams(location.search);
        var orderId = params.get('order_id') || params.get('orderId') || params.get('order') || params.get('key') || location.pathname;
        this.ecomEmit('Purchase', this.ecomProps([], { order_id: orderId, value: params.get('value') || params.get('total') || 0 }), 'dom');
      }
    },

    // ── Search ──

    search: function (data) {
      this.track('Search', {
        query: data.query || '',
        results: data.results || data.results_count || 0,
        filters: data.filters || [],
      });
    },

    // ── Custom ──

    setCustomDimension: function (key, value) {
      this.customDimensions[key] = value;
    },

    custom: function (type, properties) {
      this.track(type, properties);
    },

    // ── Flush ──

    flush: function () {
      if (this.queue.length === 0) return;
      var batch = this.queue.splice(0, this.config.batchSize);
      var self = this;
      var payload = JSON.stringify({ events: batch });
      fetch(this.config.endpoint + '/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.config.apiKey },
        body: payload,
        keepalive: true,
      }).then(function (response) {
        if (!response.ok) throw new Error('Event batch rejected: ' + response.status);
        if (response.status !== 207) return null;
        return response.json().then(function (result) {
          var failed = Array.isArray(result.results)
            ? result.results.filter(function (item) { return item && item.success === false; })
            : [];
          var retry = failed.map(function (item) { return batch[item.index]; }).filter(Boolean);
          if (retry.length) self.queue = retry.concat(self.queue);
        });
      }).catch(function () {
        self.queue = batch.concat(self.queue);
      });
    },

    // ── Listeners ──

    attachListeners: function () {
      var self = this;

      if (this.config.trackClicks) {
        document.addEventListener('click', function (e) {
          var el = e.target;
          var rect = el.getBoundingClientRect && el.getBoundingClientRect();
          var tag = (el.tagName || '').toLowerCase();

          var clickData = {
            x: e.pageX,
            y: e.pageY,
            viewport_relative_x: e.clientX,
            viewport_relative_y: e.clientY,
            id: el.id || '',
            name: el.getAttribute('name') || '',
            class: (el.className && typeof el.className === 'string') ? el.className : '',
            text: (el.innerText || el.textContent || '').trim().slice(0, 100),
            href: el.href || '',
            target: el.target || '',
            tag_name: tag,
            element_path: buildSelector(el),
            css_selector: buildSelector(el),
            xpath: buildXPath(el),
            nth_of_type: nthOfType(el),
            is_outbound_link: tag === 'a' && el.href && el.hostname && el.hostname !== window.location.hostname,
            is_download: tag === 'a' && el.href && /\.(pdf|zip|doc|docx|xls|xlsx|png|jpg|jpeg|gif|mp4|mp3)$/i.test(el.href),
            element_width: rect ? rect.width : 0,
            element_height: rect ? rect.height : 0,
          };

          if (tag === 'a' && el.href && clickData.is_outbound_link) {
            self.track('OutboundClick', clickData);
          } else if (tag === 'a' && el.href && clickData.is_download) {
            self.track('Download', clickData);
          } else if (tag === 'button' || (tag === 'input' && (el.type === 'button' || el.type === 'submit'))) {
            self.track('Click', clickData);
          } else if (tag === 'a' && el.href) {
            self.track('Click', clickData);
          } else {
            var productId = getClosestAttribute(el, 'data-product-id') || getClosestAttribute(el, 'data-sku');
            if (productId) {
              self.track('Click', { ...clickData, product_id: productId });
            } else {
              self.track('Click', clickData);
            }
          }
        }, true);
      }

      if (this.config.trackScroll) {
        var scrollTimer;
        window.addEventListener('scroll', function () {
          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(function () {
            var y = window.scrollY;
            var h = document.documentElement.scrollHeight - window.innerHeight;
            if (h <= 0) return;
            var pct = Math.min(Math.round((y / h) * 100), 100);
            if (pct > self.scrollMaxDepth) self.scrollMaxDepth = pct;
            var thresholds = [25, 50, 75, 90, 100];
            for (var i = 0; i < thresholds.length; i++) {
              if (pct >= thresholds[i] && (self._lastScrollPct || 0) < thresholds[i]) {
                self.track('Scroll', { scroll_depth_percent: pct, max_scroll_percent: self.scrollMaxDepth });
                break;
              }
            }
            self._lastScrollPct = pct;
          }, 300);
        }, { passive: true });
      }

      if (this.config.trackForms) {
        document.addEventListener('submit', function (e) {
          var form = e.target;
          var formData = {};
          try {
            var fd = new FormData(form);
            fd.forEach(function (v, k) { formData[k] = v.toString().slice(0, 200); });
          } catch (ex) {}
          self.track('FormSubmit', {
            form_id: form.id || '',
            form_name: form.getAttribute('name') || form.getAttribute('data-form-name') || '',
            field_count: form.querySelectorAll('input, select, textarea').length,
            has_email: !!formData.email || !!formData.Email,
            has_phone: !!formData.phone || !!formData.Phone,
            email: formData.email || formData.Email || '',
            phone: formData.phone || formData.Phone || '',
          });
        });

        // Form field errors
        document.addEventListener('invalid', function (e) {
          var el = e.target;
          self.track('FormError', {
            form_id: (el.form && el.form.id) || '',
            form_name: (el.form && (el.form.getAttribute('name') || el.form.getAttribute('data-form-name'))) || '',
            field_name: el.getAttribute('name') || el.id || '',
            field_type: el.type || el.tagName || '',
            validation_error: el.validationMessage || '',
          });
        }, true);
      }

      // Copy / Paste
      document.addEventListener('copy', function () { self.track('Copy', {}); });
      document.addEventListener('paste', function () { self.track('Paste', {}); });

      // Print
      if (window.matchMedia) {
        var printMq = window.matchMedia('print');
        printMq.addListener(function (mql) { if (mql.matches) self.track('Print', {}); });
      }

      // Visibility
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          self.flush();
          self.track('TabHidden', {});
        } else {
          self.track('TabVisible', {});
        }
      });

      // Window resize
      var resizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          self.track('WindowResize', {
            width: window.innerWidth,
            height: window.innerHeight,
          });
        }, 500);
      });

      // SPA page view tracking
      if (window.history && window.history.pushState) {
        var orig = history.pushState;
        history.pushState = function () {
          orig.apply(this, arguments);
          setTimeout(function () {
            self.previousPage = window.location.href;
            self.pageNumber++;
            self.setSessionStorage('page_number', String(self.pageNumber));
            self.track('PageView', {});
          }, 100);
        };
        window.addEventListener('popstate', function () {
          setTimeout(function () {
            self.previousPage = window.location.href;
            self.pageNumber++;
            self.setSessionStorage('page_number', String(self.pageNumber));
            self.track('PageView', {});
          }, 100);
        });
      }
    },

    // ── Inactivity Tracker ──

    startInactivityTracker: function () {
      var self = this;
      var INACTIVE_THRESHOLD = 30000;

      function resetInactive() {
        if (self._inactiveTimer) {
          self.totalInactiveTime += nowMs() - self._lastActiveTime;
          clearTimeout(self._inactiveTimer);
        }
        self._lastActiveTime = nowMs();
        self._inactiveTimer = setTimeout(function () {
          self.track('Inactive', { duration_ms: INACTIVE_THRESHOLD });
        }, INACTIVE_THRESHOLD);
      }

      ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(function (evt) {
        window.addEventListener(evt, resetInactive, { passive: true });
      });
      resetInactive();
    },

    // ── Rage Click Detector ──

    startRageClickDetector: function () {
      var self = this;
      var clicks = [];

      document.addEventListener('click', function (e) {
        var now = nowMs();
        clicks.push({ x: e.clientX, y: e.clientY, t: now });
        clicks = clicks.filter(function (c) { return now - c.t < 2000; });

        if (clicks.length >= 5) {
          // 5+ clicks in 2s
          var allClose = clicks.every(function (c) { return Math.abs(c.x - clicks[0].x) < 30 && Math.abs(c.y - clicks[0].y) < 30; });
          if (allClose && !self.rageClick) {
            self.rageClick = true;
            self.track('RageClick', { click_count: clicks.length, time_window_ms: 2000 });
          }
        }
      });
    },

    // ── Video Tracking ──

    attachVideoListeners: function () {
      var self = this;
      var videos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]');

      videos.forEach(function (video) {
        if (video.tagName === 'VIDEO') {
          var provider = 'html5';
          var videoId = video.id || video.dataset.videoId || '';

          video.addEventListener('play', function () { self.trackVideo(provider, videoId, video, 'play'); });
          video.addEventListener('pause', function () { self.trackVideo(provider, videoId, video, 'pause'); });
          video.addEventListener('ended', function () { self.trackVideo(provider, videoId, video, 'complete'); });

          var timeUpdateTimer;
          video.addEventListener('timeupdate', function () {
            if (timeUpdateTimer) return;
            timeUpdateTimer = setTimeout(function () {
              timeUpdateTimer = null;
              var pct = video.duration ? Math.round((video.currentTime / video.duration) * 100) : 0;
              if ([25, 50, 75, 90].indexOf(pct) >= 0) {
                self.trackVideo(provider, videoId, video, 'percent', pct);
              }
            }, 1000);
          });
        }
      });
    },

    trackVideo: function (provider, videoId, el, action, percent) {
      this.track('Video', {
        provider: provider,
        video_id: videoId,
        duration: el.duration || 0,
        current_time: el.currentTime || 0,
        percent: percent || 0,
        action: action,
      });
    },

    // ── Error Tracking ──

    attachErrorListeners: function () {
      var self = this;

      window.addEventListener('error', function (e) {
        self.track('Error', {
          message: e.message || '',
          file: e.filename || '',
          line: e.lineno || 0,
          column: e.colno || 0,
          stack: (e.error && e.error.stack) || '',
        });
        return false;
      }, true);

      window.addEventListener('unhandledrejection', function (e) {
        self.track('Error', {
          message: e.reason ? (e.reason.message || String(e.reason)) : '',
          stack: e.reason ? e.reason.stack || '' : '',
        });
      });

      // Resource failures
      document.addEventListener('error', function (e) {
        var target = e.target;
        if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
          self.track('Error', {
            message: 'Resource load failed',
            file: target.src || target.href || '',
            line: 0,
            column: 0,
          });
        }
      }, true);
    },

    // ── Performance Metrics (Core Web Vitals) ──

    capturePerformanceMetrics: function () {
      var self = this;
      var perf = collectPerformance();

      // LCP
      if (PerformanceObserver) {
        try {
          var lcpObs = new PerformanceObserver(function (list) {
            var entries = list.getEntries();
            if (entries.length) {
              perf.largest_contentful_paint_ms = entries[entries.length - 1].startTime || 0;
            }
          });
          lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {}

        // FID
        try {
          var fidObs = new PerformanceObserver(function (list) {
            var entries = list.getEntries();
            if (entries.length) {
              perf.first_input_delay_ms = entries[0].processingStart - entries[0].startTime || 0;
            }
          });
          fidObs.observe({ type: 'first-input', buffered: true });
        } catch (e) {}

        // CLS
        try {
          var clsObs = new PerformanceObserver(function (list) {
            var entries = list.getEntries();
            var cls = 0;
            for (var i = 0; i < entries.length; i++) {
              if (!entries[i].hadRecentInput) cls += entries[i].value;
            }
            perf.cumulative_layout_shift = cls;
          });
          clsObs.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {}

        // INP
        try {
          var inpObs = new PerformanceObserver(function (list) {
            var entries = list.getEntries();
            var max = 0;
            for (var i = 0; i < entries.length; i++) {
              var dur = entries[i].duration || 0;
              if (dur > max) max = dur;
            }
            perf.interaction_to_next_paint_ms = max;
          });
          inpObs.observe({ type: 'first-input', buffered: true });
          inpObs.observe({ type: 'pointerdown', buffered: true });
        } catch (e) {}
      }

      this._perfMetrics = perf;
    },

    // ── Storage ──

    getCookie: function (name) {
      return this.getRawCookie(STORAGE_PREFIX + name);
    },

    setCookie: function (name, value, days) {
      this.setRawCookie(STORAGE_PREFIX + name, value, days);
    },

    getRawCookie: function (name) {
      var m = document.cookie.match('(^|;)\\s*' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '\\s*=\\s*([^;]+)');
      if (!m) return null;
      try { return decodeURIComponent(m.pop()); } catch (e) { return null; }
    },

    // days may be fractional (30 minutes = 30 / 1440). Cookies are set on the root domain so
    // www.example.com and example.com share one visitor; Secure only on https so local test
    // pages over http keep working.
    setRawCookie: function (name, value, days) {
      var expires = '';
      if (days) {
        var d = new Date();
        d.setTime(d.getTime() + days * 86400000);
        expires = '; expires=' + d.toUTCString();
      }
      var domain = this.cookieDomain();
      document.cookie = name + '=' + encodeURIComponent(value || '') + expires + '; path=/; SameSite=Lax'
        + (domain ? '; domain=' + domain : '') + (location.protocol === 'https:' ? '; Secure' : '');
    },

    cookieDomain: function () {
      if (this._cookieDomain !== undefined) return this._cookieDomain;
      var host = location.hostname;
      this._cookieDomain = '';
      if (!host || /^[\d.]+$/.test(host) || host.indexOf('.') === -1) return '';
      var parts = host.split('.');
      // Shortest suffix the browser accepts is the registrable domain (handles .co.uk etc.).
      for (var i = parts.length - 2; i >= 0; i--) {
        var candidate = parts.slice(i).join('.');
        document.cookie = '_cdp_tld=1; path=/; domain=' + candidate;
        if (document.cookie.indexOf('_cdp_tld=1') !== -1) {
          document.cookie = '_cdp_tld=; path=/; domain=' + candidate + '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          this._cookieDomain = candidate;
          break;
        }
      }
      return this._cookieDomain;
    },

    getJsonCookie: function (name) {
      var raw = this.getCookie(name);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    },

    // ── Visits, sessions & attribution cookies ──

    touchSession: function () {
      this.setCookie('session_id', this.sessionId, 30 / 1440);
    },

    updateVisit: function () {
      var t = nowMs();
      var count = parseInt(this.getCookie('visit_count') || '0', 10) || 0;
      var first = parseInt(this.getCookie('first_visit_at') || '', 10) || t;
      var current = parseInt(this.getCookie('current_visit_at') || '', 10) || null;
      var previous = parseInt(this.getCookie('last_visit_at') || '', 10) || null;
      if (this.isNewSession || !current) {
        // The visit that just ended becomes "last visit".
        previous = current || previous;
        current = t;
        count += 1;
        this.setCookie('visit_count', String(count), 365);
        this.setCookie('current_visit_at', String(current), 365);
        if (previous) this.setCookie('last_visit_at', String(previous), 365);
      }
      this.setCookie('first_visit_at', String(first), 365);
      this.sessionStart = current;
      this.visit = {
        visit_count: count,
        is_returning: count > 1,
        first_visit_at: new Date(first).toISOString(),
        current_visit_at: new Date(current).toISOString(),
        last_visit_at: previous ? new Date(previous).toISOString() : null,
        days_since_last_visit: previous ? Math.floor((current - previous) / 86400000) : null,
        days_since_first_visit: Math.floor((current - first) / 86400000),
      };
    },

    updateTouches: function () {
      var a = collectAttribution();
      var touch = {};
      var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'ttclid'];
      for (var i = 0; i < keys.length; i++) if (a[keys[i]]) touch[keys[i]] = a[keys[i]];
      var external = document.referrer && document.referrer.indexOf(location.host) === -1;
      if (!Object.keys(touch).length && !external) return;
      touch.referrer = document.referrer || '';
      touch.landing_page = location.href.split('#')[0].slice(0, 500);
      touch.at = now();
      if (!this.getCookie('first_touch')) this.setCookie('first_touch', JSON.stringify(touch), 365);
      // Last touch only moves for campaign/click traffic, not plain referrals of a known visitor.
      if (Object.keys(touch).length > 3 || !this.getCookie('last_touch')) this.setCookie('last_touch', JSON.stringify(touch), 90);
      var clicks = this.getJsonCookie('click_ids') || {};
      var ids = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'ttclid'];
      var changed = false;
      for (var j = 0; j < ids.length; j++) {
        if (a[ids[j]]) { clicks[ids[j]] = a[ids[j]]; clicks[ids[j] + '_at'] = now(); changed = true; }
      }
      if (changed) this.setCookie('click_ids', JSON.stringify(clicks), 90);
    },

    // Meta browser cookies, in Meta's own format, so CAPI can match and dedupe with the pixel.
    updateAdCookies: function () {
      if (this.config.consentRequired && !this.consent.marketing) return;
      var t = nowMs();
      if (!this.getRawCookie('_fbp')) {
        this.setRawCookie('_fbp', 'fb.1.' + t + '.' + Math.floor(1e9 + Math.random() * 9e9), 90);
      }
      var fbclid = new URLSearchParams(location.search).get('fbclid');
      var fbc = this.getRawCookie('_fbc');
      if (fbclid && (!fbc || fbc.split('.').slice(3).join('.') !== fbclid)) {
        this.setRawCookie('_fbc', 'fb.1.' + t + '.' + fbclid, 90);
      }
    },

    collectContext: function () {
      return {
        library: { name: 'cdp.js', version: SDK_VERSION },
        cookies: { _fbp: this.getRawCookie('_fbp') || '', _fbc: this.getRawCookie('_fbc') || '' },
        click_ids: this.getJsonCookie('click_ids') || {},
        first_touch: this.getJsonCookie('first_touch'),
        last_touch: this.getJsonCookie('last_touch'),
        visit: this.visit || null,
        website_type: this.config.websiteType || '',
        website_country: this.config.country || '',
        website_currency: this.config.currency || '',
        store_platform: this._platform || '',
        consent: { ads: !(this.config.consentRequired && !this.consent.marketing), analytics: this.consent.analytics !== false },
      };
    },

    getSessionStorage: function (key) {
      try { return sessionStorage.getItem(STORAGE_PREFIX + key); } catch (e) { return null; }
    },

    setSessionStorage: function (key, value) {
      try { sessionStorage.setItem(STORAGE_PREFIX + key, value); } catch (e) {}
    },

    getLocalStorage: function (key) {
      try { return localStorage.getItem(STORAGE_PREFIX + key); } catch (e) { return null; }
    },

    setLocalStorage: function (key, value) {
      try { localStorage.setItem(STORAGE_PREFIX + key, value); } catch (e) {}
    },

    // ── Timer ──

    startFlushTimer: function () {
      var self = this;
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(function () { self.flush(); }, this.config.flushInterval);

      // Flush on unload
      window.addEventListener('beforeunload', function () { self.flush(); });
      window.addEventListener('pagehide', function () { self.flush(); });
    },

    // ── Accessors ──

    getSessionId: function () { return this.sessionId; },
    getVisitorId: function () { return this.visitorId; },
    getEventCount: function () { return this.eventCount; },
    getHistory: function () { return this._history; },
  };

  // ── Auto-init ──

  if (typeof window !== 'undefined') {
    var cfg = window._gtmConfig || window._cdpConfig || window.gtmConfig || {};
    GTMTracker.config.apiKey = cfg.apiKey || GTMTracker.config.apiKey;
    GTMTracker.config.websiteId = cfg.websiteId || cfg.website_id || GTMTracker.config.websiteId;
    GTMTracker.config.endpoint = cfg.endpoint || GTMTracker.config.endpoint;
    GTMTracker.config.debug = cfg.debug || GTMTracker.config.debug;

    if (cfg.consentRequired !== undefined) GTMTracker.config.consentRequired = cfg.consentRequired;
    if (cfg.ecommerce !== undefined) GTMTracker.config.ecommerce = !!cfg.ecommerce;
    if (cfg.websiteType) GTMTracker.config.websiteType = cfg.websiteType;
    if (cfg.currency) GTMTracker.config.currency = cfg.currency;
    if (cfg.country) GTMTracker.config.country = cfg.country;
    if (cfg.respectDoNotTrack !== undefined) GTMTracker.config.respectDoNotTrack = cfg.respectDoNotTrack;

    if (GTMTracker.config.apiKey) GTMTracker.init(cfg);

    window.GTMTracker = GTMTracker;
    window.gtmTracker = GTMTracker;
    window.cdpTracker = GTMTracker;
    window.CDP = GTMTracker;
  }
})();
