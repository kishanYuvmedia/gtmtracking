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
      fbclid: params.get('fbclid') || '',
      msclkid: params.get('msclkid') || '',
      ttclid: params.get('ttclid') || '',
      affiliate_id: params.get('affiliate_id') || params.get('ref') || '',
      campaign_id: params.get('campaign_id') || params.get('cid') || '',
    };
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

      this.sessionId = this.getCookie('visitor_id') ? null : uuid();
      this.sessionId = this.getCookie('session_id') || uuid();
      this.visitorId = this.getCookie('visitor_id') || uuid();
      this.isNewSession = !this.getCookie('session_id');

      this.setCookie('session_id', this.sessionId, 30);
      this.setCookie('visitor_id', this.visitorId, 365);

      var pg = this.getSessionStorage('page_number');
      this.pageNumber = pg ? parseInt(pg, 10) + 1 : 1;
      this.setSessionStorage('page_number', String(this.pageNumber));

      this.landingPage = this.getSessionStorage('entry_page') || window.location.href;
      this.setSessionStorage('entry_page', this.landingPage);
      this.entryPage = this.landingPage;

      this.pageLoadStart = nowMs();
      this.sessionStart = this.pageLoadStart;
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

      var event = {
        identifiers: collectIdentifiers(this),
        page: collectPage(this),
        attribution: collectAttribution(),
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
        custom: custom || this.customDimensions || {},
      };

      this.queue.push(event);
      this._history.push({ t: type, ts: now() });

      if (this.config.debug) console.log('[GTM] Track', type, event);

      if (this.queue.length >= this.config.batchSize) this.flush();
    },

    // ── E-Commerce ──

    viewProduct: function (data) {
      this.track('ViewProduct', {
        product_id: data.id || data.product_id || '',
        sku: data.sku || '',
        name: data.name || '',
        category: data.category || '',
        brand: data.brand || '',
        price: data.price || 0,
        currency: data.currency || 'INR',
        url: data.url || window.location.href,
        image_url: data.image_url || '',
        variant: data.variant || '',
      });
    },

    addToCart: function (data) {
      this.track('AddToCart', {
        cart_id: data.cart_id || '',
        product_id: data.id || data.product_id || '',
        name: data.name || '',
        quantity: data.quantity || 1,
        price: data.price || 0,
        currency: data.currency || 'INR',
      });
    },

    removeFromCart: function (data) {
      this.track('RemoveFromCart', {
        cart_id: data.cart_id || '',
        product_id: data.id || data.product_id || '',
        name: data.name || '',
        quantity: data.quantity || 1,
        price: data.price || 0,
      });
    },

    beginCheckout: function (data) {
      this.track('BeginCheckout', {
        step: data.step || 1,
        items: data.items || [],
        coupon: data.coupon || '',
        total: data.total || 0,
        currency: data.currency || 'INR',
      });
    },

    purchase: function (data) {
      this.track('Purchase', {
        order_id: data.order_id || data.transaction_id || '',
        revenue: data.revenue || data.total || 0,
        tax: data.tax || 0,
        shipping: data.shipping || 0,
        discount: data.discount || 0,
        currency: data.currency || 'INR',
        products: data.products || data.items || [],
      });
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
      var m = document.cookie.match('(^|;)\\s*' + STORAGE_PREFIX + name + '\\s*=\\s*([^;]+)');
      return m ? m.pop() : null;
    },

    setCookie: function (name, value, days) {
      var expires = '';
      if (days) {
        var d = new Date();
        d.setTime(d.getTime() + days * 86400000);
        expires = '; expires=' + d.toUTCString();
      }
      document.cookie = STORAGE_PREFIX + name + '=' + (value || '') + expires + '; path=/; SameSite=Lax; Secure';
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
    if (cfg.respectDoNotTrack !== undefined) GTMTracker.config.respectDoNotTrack = cfg.respectDoNotTrack;

    if (GTMTracker.config.apiKey) GTMTracker.init(cfg);

    window.GTMTracker = GTMTracker;
    window.gtmTracker = GTMTracker;
    window.cdpTracker = GTMTracker;
    window.CDP = GTMTracker;
  }
})();
