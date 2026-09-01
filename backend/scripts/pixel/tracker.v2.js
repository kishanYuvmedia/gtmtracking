(function () {
  'use strict';

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getBrowserName(ua) {
    if (/Edg\//i.test(ua)) return 'Edge';
    if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera';
    if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Chrome';
    if (/Firefox\//i.test(ua)) return 'Firefox';
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
    return 'Unknown';
  }

  function getBrowserVersion(ua) {
    var m;
    if (/Edg\//i.test(ua)) { m = ua.match(/Edg\/([\d.]+)/); }
    else if (/OPR\//i.test(ua)) { m = ua.match(/OPR\/([\d.]+)/); }
    else if (/Chrome\//i.test(ua)) { m = ua.match(/Chrome\/([\d.]+)/); }
    else if (/Firefox\//i.test(ua)) { m = ua.match(/Firefox\/([\d.]+)/); }
    else if (/Version\//i.test(ua)) { m = ua.match(/Version\/([\d.]+)/); }
    return m ? m[1] : null;
  }

  function getOS(ua) {
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac OS X/i.test(ua) || /macOS/i.test(ua)) return 'macOS';
    if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'Linux';
    if (/Android/i.test(ua)) return 'Android';
    if (/iOS/i.test(ua) || /iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    if (/CrOS/i.test(ua)) return 'ChromeOS';
    return 'Unknown';
  }

  function getDeviceType(ua, w) {
    if (/iPad|Android(?!.*Mobile)|Windows(?!.*Phone)|Macintosh|Linux(?!.*Android)/i.test(ua) && w >= 768) return 'tablet';
    if (/Mobile|iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function getDevice() {
    var ua = navigator.userAgent;
    return {
      user_agent: ua,
      browser_name: getBrowserName(ua),
      browser_version: getBrowserVersion(ua),
      os_name: getOS(ua),
      os_version: null,
      device_type: getDeviceType(ua, screen.width),
      screen_width: screen.width,
      screen_height: screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      language: navigator.language,
    };
  }

  function getPage() {
    return {
      url: window.location.href,
      referrer: document.referrer || '',
      title: document.title,
      canonical_url: (document.querySelector('link[rel="canonical"]') || {}).href || null,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    };
  }

  function getUTMParams() {
    var params = new URLSearchParams(window.location.search);
    var utm = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (key) {
      var val = params.get(key);
      if (val) utm[key.replace('utm_', '')] = val;
    });
    return utm;
  }

  function getAdParams() {
    var params = new URLSearchParams(window.location.search);
    var ad = {};
    var adParams = ['gclid', 'fbclid', 'msclkid', 'ttclid', 'twclid', 'dclid', 'li_fat_id', 'igshid', 'mc_cid', 'mc_eid'];
    adParams.forEach(function (key) {
      var val = params.get(key);
      if (val) ad[key] = val;
    });
    return ad;
  }

  function getLocation() {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezone_offset: -new Date().getTimezoneOffset(),
    };
  }

  function getClosestAttribute(el, attr) {
    while (el) {
      if (el.getAttribute && el.hasAttribute(attr)) return el.getAttribute(attr);
      el = el.parentElement;
    }
    return null;
  }

  function getSelector(el) {
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

  var CDP = {
    config: {
      apiKey: '',
      websiteId: '',
      endpoint: 'https://collect.domain.com',
      debug: false,
      batchSize: 10,
      flushInterval: 5000,
      trackClicks: true,
      trackForms: true,
      trackScroll: true,
      trackEcommerce: true,
    },

    queue: [],
    timer: null,
    sessionId: null,
    visitorId: null,
    started: false,
    scrollMaxDepth: 0,
    eventCount: 0,
    history: [],
    userId: null,
    userEmail: null,

    init: function (options) {
      for (var key in options) {
        if (key in this.config) this.config[key] = options[key];
      }
      this.sessionId = this.getCookie('cdp_session') || uuid();
      this.setCookie('cdp_session', this.sessionId, 30);
      this.visitorId = this.getCookie('cdp_visitor') || uuid();
      this.setCookie('cdp_visitor', this.visitorId, 365);
      this.userId = this.getCookie('cdp_user') || null;
      this.loadHistory();
      this.start();
    },

    start: function () {
      if (this.started) return;
      this.started = true;
      this.device = getDevice();
      this.location = getLocation();
      this.utm = getUTMParams();
      this.ad = getAdParams();
      this.attachListeners();
      this.startFlushTimer();
      this.track('PageView', { url: window.location.href, title: document.title, referrer: document.referrer });
      if (window.CDP) window.CDP.ready = true;
    },

    identify: function (data) {
      this.userId = data.userId || this.userId;
      this.userEmail = data.email || this.userEmail;
      if (data.userId) this.setCookie('cdp_user', data.userId, 365);
      this.track('Identify', data);
      this.sendIdentify(data);
    },

    track: function (eventName, properties, context) {
      if (!this.started) return;
      this.eventCount++;
      var event = {
        event_name: eventName,
        website_id: this.config.websiteId,
        session_id: this.sessionId,
        visitor_id: this.visitorId,
        user_id: this.userId || '',
        event_id: uuid(),
        timestamp: new Date().toISOString(),
        properties: properties || {},
        page: getPage(),
        device: this.device,
        location: this.location,
        utm: this.utm,
        ad: this.ad,
      };
      if (context) for (var k in context) event[k] = context[k];
      this.queue.push(event);
      this.addToHistory(event);
      if (this.config.debug) console.log('[CDP] Track', eventName, properties);
      if (this.queue.length >= this.config.batchSize) this.flush();
    },

    // E-commerce tracking
    viewProduct: function (data) {
      this.track('ProductView', {
        product_id: data.id || data.product_id,
        name: data.name,
        sku: data.sku,
        category: data.category,
        price: data.price,
        currency: data.currency || 'USD',
        url: data.url || window.location.href,
        image_url: data.image_url,
        brand: data.brand,
        variant: data.variant,
      });
    },

    addToCart: function (data) {
      this.track('AddToCart', {
        product_id: data.id || data.product_id,
        name: data.name,
        sku: data.sku,
        price: data.price,
        quantity: data.quantity || 1,
        currency: data.currency || 'USD',
        category: data.category,
        url: data.url || window.location.href,
        image_url: data.image_url,
      });
    },

    removeFromCart: function (data) {
      this.track('RemoveFromCart', {
        product_id: data.id || data.product_id,
        name: data.name,
        price: data.price,
        quantity: data.quantity || 1,
        currency: data.currency || 'USD',
      });
    },

    viewCart: function (data) {
      this.track('ViewCart', {
        cart_id: data.cart_id,
        items: data.items,
        total: data.total,
        currency: data.currency || 'USD',
        item_count: data.item_count,
      });
    },

    checkoutStarted: function (data) {
      this.track('CheckoutStarted', {
        order_id: data.order_id,
        cart_id: data.cart_id,
        items: data.items,
        total: data.total,
        currency: data.currency || 'USD',
        shipping: data.shipping,
        tax: data.tax,
        coupon: data.coupon,
        payment_method: data.payment_method,
        item_count: data.item_count,
      });
    },

    addPaymentInfo: function (data) {
      this.track('AddPaymentInfo', {
        order_id: data.order_id,
        payment_method: data.payment_method,
        card_type: data.card_type,
        currency: data.currency || 'USD',
      });
    },

    purchase: function (data) {
      this.track('Purchase', {
        order_id: data.order_id || data.transaction_id,
        transaction_id: data.transaction_id || data.order_id,
        items: data.items,
        total: data.total,
        value: data.total,
        currency: data.currency || 'USD',
        shipping: data.shipping,
        tax: data.tax,
        coupon: data.coupon,
        payment_method: data.payment_method,
        item_count: data.item_count,
        billing_city: data.billing_city,
        billing_country: data.billing_country,
        shipping_city: data.shipping_city,
        shipping_country: data.shipping_country,
      });
    },

    // Lead & form tracking
    lead: function (data) {
      this.track('Lead', {
        form_id: data.form_id,
        form_name: data.form_name,
        value: data.value,
        currency: data.currency || 'USD',
        email: data.email,
        phone: data.phone,
        name: data.name,
      });
    },

    signUp: function (data) {
      this.track('SignUp', {
        method: data.method || 'email',
        email: data.email,
        name: data.name,
      });
    },

    search: function (data) {
      this.track('Search', {
        query: data.query,
        category: data.category,
        results_count: data.results_count,
        url: window.location.href,
      });
    },

    // Custom event
    custom: function (eventName, properties) {
      this.track(eventName, properties);
    },

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

    sendIdentify: function (data) {
      data.visitor_id = this.visitorId;
      data.session_id = this.sessionId;
      data.device = this.device;
      data.location = this.location;
      data.utm = this.utm;
      data.ad = this.ad;
      fetch(this.config.endpoint + '/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.config.apiKey },
        body: JSON.stringify(data),
        keepalive: true,
      });
    },

    attachListeners: function () {
      var self = this;

      if (this.config.trackClicks) {
        document.addEventListener('click', function (e) {
          var el = e.target;
          var tag = el.tagName.toLowerCase();
          var text = (el.innerText || el.textContent || '').trim().slice(0, 100);
          var selector = getSelector(el);

          if (tag === 'button' || tag === 'input' && (el.type === 'button' || el.type === 'submit')) {
            self.track('ButtonClick', {
              text: text, selector: selector, id: el.id || '',
              form_id: getClosestAttribute(el, 'data-form-id') || '',
              pageX: e.pageX, pageY: e.pageY,
            });
          } else if (tag === 'a' && el.href) {
            self.track('LinkClick', {
              text: text, selector: selector, href: el.href,
              id: el.id || '', target: el.target || '',
              pageX: e.pageX, pageY: e.pageY,
            });
          } else {
            var productId = getClosestAttribute(el, 'data-product-id') ||
                           getClosestAttribute(el, 'data-sku');
            if (productId) {
              self.track('ProductClick', {
                product_id: productId,
                text: text, selector: selector,
                pageX: e.pageX, pageY: e.pageY,
              });
            } else {
              self.track('Click', {
                target: tag, text: text, selector: selector,
                id: el.id || '', pageX: e.pageX, pageY: e.pageY,
              });
            }
          }
        });
      }

      if (this.config.trackScroll) {
        var scrollTimer;
        window.addEventListener('scroll', function () {
          clearTimeout(scrollTimer);
          scrollTimer = setTimeout(function () {
            var y = window.scrollY;
            var h = document.documentElement.scrollHeight - window.innerHeight;
            if (h <= 0) return;
            var pct = Math.round((y / h) * 100);
            if (pct > self.scrollMaxDepth) self.scrollMaxDepth = pct;
            if ([25, 50, 75, 90, 100].indexOf(pct) >= 0 && pct > (self._lastScrollPct || 0)) {
              self.track('Scroll', { percentage: pct, depth_px: y, max_depth: self.scrollMaxDepth });
              self._lastScrollPct = pct;
            }
          }, 300);
        });
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
            form_id: form.id || '', form_action: form.action || '',
            form_method: form.method || '',
            field_count: form.querySelectorAll('input, select, textarea').length,
            has_email: !!formData.email || !!formData.Email,
            has_phone: !!formData.phone || !!formData.Phone,
            email: formData.email || formData.Email || '',
            phone: formData.phone || formData.Phone || '',
          });
        });
      }

      // SPA page view tracking
      if (window.history && window.history.pushState) {
        var orig = history.pushState;
        history.pushState = function () {
          orig.apply(this, arguments);
          self.track('PageView', { url: window.location.href, title: document.title, referrer: '' });
        };
        window.addEventListener('popstate', function () {
          self.track('PageView', { url: window.location.href, title: document.title, referrer: '' });
        });
      }
    },

    startFlushTimer: function () {
      var self = this;
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(function () { self.flush(); }, this.config.flushInterval);
      window.addEventListener('beforeunload', function () { self.flush(); });
    },

    getCookie: function (name) {
      var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
      return m ? m.pop() : null;
    },

    setCookie: function (name, value, days) {
      var expires = '';
      if (days) {
        var d = new Date();
        d.setTime(d.getTime() + days * 86400000);
        expires = '; expires=' + d.toUTCString();
      }
      document.cookie = name + '=' + (value || '') + expires + '; path=/; SameSite=Lax; Secure';
    },

    loadHistory: function () {
      try {
        var raw = this.getCookie('cdp_history');
        if (raw) this.history = JSON.parse(decodeURIComponent(raw));
      } catch (e) {}
    },

    saveHistory: function () {
      var recent = this.history.slice(-100);
      try {
        this.setCookie('cdp_history', encodeURIComponent(JSON.stringify(recent)), 7);
      } catch (e) {}
    },

    addToHistory: function (event) {
      this.history.push({ n: event.event_name, u: (event.properties && event.properties.url) || '', t: event.timestamp });
      this.saveHistory();
    },

    getHistory: function () { return this.history; },
    getSessionId: function () { return this.sessionId; },
    getVisitorId: function () { return this.visitorId; },
  };

  if (typeof window !== 'undefined') {
    var cfg = window._cdpConfig || window._gtmConfig || window.gtmConfig || {};
    CDP.config.apiKey = cfg.apiKey || CDP.config.apiKey;
    CDP.config.websiteId = cfg.websiteId || cfg.website_id || CDP.config.websiteId;
    CDP.config.endpoint = cfg.endpoint || CDP.config.endpoint;
    CDP.config.debug = cfg.debug || CDP.config.debug;
    if (CDP.config.apiKey) CDP.init(cfg);
    window.CDP = CDP;
    window.gtmTracker = CDP;
    window.cdpTracker = CDP;
  }
})();
