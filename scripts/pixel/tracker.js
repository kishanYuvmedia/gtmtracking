(function () {
  'use strict';

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function browserName(ua) {
    if (/Edg\//i.test(ua)) return 'Edge';
    if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera';
    if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Chrome';
    if (/Firefox\//i.test(ua)) return 'Firefox';
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
    return null;
  }

  function browserVersion(ua) {
    var m;
    if (/Edg\//i.test(ua)) { m = ua.match(/Edg\/([\d.]+)/); }
    else if (/OPR\//i.test(ua)) { m = ua.match(/OPR\/([\d.]+)/); }
    else if (/Chrome\//i.test(ua)) { m = ua.match(/Chrome\/([\d.]+)/); }
    else if (/Firefox\//i.test(ua)) { m = ua.match(/Firefox\/([\d.]+)/); }
    else if (/Version\//i.test(ua)) { m = ua.match(/Version\/([\d.]+)/); }
    return m ? m[1] : null;
  }

  function osName(ua) {
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac OS X/i.test(ua) || /macOS/i.test(ua)) return 'macOS';
    if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'Linux';
    if (/Android/i.test(ua)) return 'Android';
    if (/iOS/i.test(ua) || /iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    if (/CrOS/i.test(ua)) return 'ChromeOS';
    return null;
  }

  function osVersion(ua) {
    var m;
    if (/Windows NT ([\d.]+)/i.test(ua)) { m = ua.match(/Windows NT ([\d.]+)/); }
    else if (/Mac OS X ([\d_]+)/i.test(ua)) { m = ua.match(/Mac OS X ([\d_]+)/); if (m) m[1] = m[1].replace(/_/g, '.'); }
    else if (/Android ([\d.]+)/i.test(ua)) { m = ua.match(/Android ([\d.]+)/); }
    else if (/(iPhone|iPad).*OS ([\d_]+)/i.test(ua)) { m = ua.match(/OS ([\d_]+)/); if (m) m[1] = m[1].replace(/_/g, '.'); }
    return m ? m[1] : null;
  }

  function deviceType(ua, w) {
    if (/iPad|Android(?!.*Mobile)|Windows(?!.*Phone)|Macintosh|Linux(?!.*Android)/i.test(ua) && w >= 768) return 'tablet';
    if (/Mobile|iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function getDeviceInfo() {
    var ua = navigator.userAgent;
    return {
      user_agent: ua,
      browser_name: browserName(ua),
      browser_version: browserVersion(ua),
      os_name: osName(ua),
      os_version: osVersion(ua),
      device_type: deviceType(ua, screen.width),
      screen_width: screen.width,
      screen_height: screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      pixel_ratio: window.devicePixelRatio || 1,
      language: navigator.language,
      color_depth: screen.colorDepth || 24,
    };
  }

  function getNetworkInfo() {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return null;
    return {
      connection_type: conn.effectiveType || 'unknown',
      effective_bandwidth: conn.downlink || null,
      rtt: conn.rtt || null,
      downlink_max: conn.downlinkMax || null,
      save_data: conn.saveData || false,
    };
  }

  function getPageInfo() {
    return {
      url: window.location.href,
      referrer: document.referrer || '',
      title: document.title,
      canonical_url: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
      previous_url: null,
      history_length: window.history.length,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    };
  }

  function getPerformanceInfo() {
    var p = window.performance;
    if (!p || !p.timing) return null;
    var t = p.timing;
    var navStart = t.navigationStart || t.startTime || 0;
    if (!navStart) return null;
    var entries = p.getEntriesByType ? p.getEntriesByType('resource') : [];
    var transferSize = 0;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].transferSize) transferSize += entries[i].transferSize;
    }
    return {
      load_time: t.loadEventEnd > 0 ? t.loadEventEnd - navStart : null,
      dom_interactive: t.domInteractive > 0 ? t.domInteractive - navStart : null,
      dom_content_loaded: t.domContentLoadedEventEnd > 0 ? t.domContentLoadedEventEnd - navStart : null,
      first_paint: null,
      first_contentful_paint: null,
      time_to_interactive: null,
      dom_size: document.querySelectorAll('*').length,
      resource_count: entries.length,
      transfer_size: transferSize,
    };
  }

  function getLocationInfo() {
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    var offset = -new Date().getTimezoneOffset();
    return {
      timezone: tz,
      timezone_offset: offset,
      country: null,
      region: null,
      city: null,
      postal_code: null,
      latitude: null,
      longitude: null,
      ip_address: null,
    };
  }

  var MyTracker = {
    config: {
      apiKey: '',
      websiteId: '',
      endpoint: 'https://collect.domain.com',
      debug: false,
      batchSize: 10,
      flushInterval: 5000,
    },

    queue: [],
    timer: null,
    sessionId: null,
    visitorId: null,
    started: false,
    pageLoadTime: null,
    scrollMaxDepth: 0,
    clickCount: 0,

    init: function (options) {
      this.config.apiKey = options.apiKey || this.config.apiKey;
      this.config.websiteId = options.websiteId || options.website_id || this.config.websiteId;
      this.config.endpoint = options.endpoint || this.config.endpoint;
      this.config.debug = options.debug || false;
      this.config.batchSize = options.batchSize || this.config.batchSize;
      this.config.flushInterval = options.flushInterval || this.config.flushInterval;

      this.checkConsent();
    },

    checkConsent: function () {
      if (this.getCookie('gtm_consent') === 'true') {
        this.start();
        return;
      }

      if (typeof window.__tcfapi !== 'undefined') {
        var self = this;
        try {
          window.__tcfapi('addEventListener', 2, function (tcData, success) {
            if (success && (tcData.eventStatus === 'tcloaded' || tcData.eventStatus === 'useractioncomplete')) {
              if (tcData.purpose && tcData.purpose.consents && tcData.purpose.consents[1]) {
                self.grantConsent();
              }
            }
          });
        } catch (e) {}
        return;
      }

      if (typeof window.Cookiebot !== 'undefined') {
        var self = this;
        var iv = setInterval(function () {
          if (window.Cookiebot && window.Cookiebot.consent && window.Cookiebot.consent.statistics) {
            self.grantConsent();
            clearInterval(iv);
          }
        }, 200);
        setTimeout(function () { clearInterval(iv); }, 10000);
        return;
      }

      if (typeof window.OneTrust !== 'undefined') {
        var self = this;
        document.addEventListener('OneTrustActiveGroups', function () {
          if (window.OnetrustActiveGroups && window.OnetrustActiveGroups.indexOf(',1,') >= 0) {
            self.grantConsent();
          }
        });
        return;
      }

      this.start();
    },

    grantConsent: function () {
      this.setCookie('gtm_consent', 'true', 365);
      this.start();
    },

    start: function () {
      if (this.started) return;
      this.started = true;

      this.sessionId = this.getSessionId();
      this.visitorId = this.getVisitorId();

      var device = getDeviceInfo();
      var network = getNetworkInfo();
      var page = getPageInfo();
      var perf = getPerformanceInfo();
      var location = getLocationInfo();

      this.deviceInfo = device;
      this.networkInfo = network;
      this.locationInfo = location;

      this.setupEventListeners();
      this.startTimer();

      if (this.config.debug) {
        console.log('[Tracker] Initialized', this.config);
      }

      this.track('PageView', {
        url: page.url,
        title: page.title,
        referrer: page.referrer,
      }, {
        page: page,
        device: device,
        network: network,
        performance: perf,
        location: location,
      });
    },

    track: function (eventName, properties, context) {
      context = context || {};
      var event = {
        event_name: eventName,
        website_id: this.config.websiteId,
        session_id: this.sessionId || uuid(),
        visitor_id: this.visitorId || uuid(),
        event_id: uuid(),
        timestamp: new Date().toISOString(),
        properties: properties || {},
        page: context.page || null,
        device: context.device || this.deviceInfo || null,
        network: context.network || this.networkInfo || null,
        performance: context.performance || null,
        location: context.location || this.locationInfo || null,
      };

      this.queue.push(event);
      this.log('[Track]', eventName, event.event_id);

      if (this.queue.length >= this.config.batchSize) {
        this.flush();
      }
    },

    identify: function (data) {
      this.sendIdentify(data);
    },

    flush: function () {
      if (this.queue.length === 0) return;

      var batch = this.queue.splice(0, this.config.batchSize);
      this.sendBatch(batch);
    },

    sendBatch: function (events) {
      var self = this;
      var payload = JSON.stringify({ events: events });

      this.request(this.config.endpoint + '/api/batch', payload)
        .then(function () {
          self.log('[Batch] Sent', events.length, 'events');
        })
        .catch(function (err) {
          self.log('[Batch] Failed', err);
          self.queue = events.concat(self.queue);
        });
    },

    sendIdentify: function (data) {
      var self = this;
      data.visitor_id = this.visitorId;
      data.device = this.deviceInfo;
      data.location = this.locationInfo;
      var payload = JSON.stringify(data);

      this.request(this.config.endpoint + '/api/identify', payload)
        .then(function () {
          self.log('[Identify] Sent');
        })
        .catch(function (err) {
          self.log('[Identify] Failed', err);
        });
    },

    request: function (url, body) {
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: body,
        keepalive: true,
      });
    },

    getSessionId: function () {
      var stored = this.getCookie('gtm_session');
      if (stored) return stored;

      var id = uuid();
      this.setCookie('gtm_session', id, 30);
      return id;
    },

    getVisitorId: function () {
      var stored = this.getCookie('gtm_visitor');
      if (stored) return stored;

      var id = uuid();
      this.setCookie('gtm_visitor', id, 365);
      return id;
    },

    getCookie: function (name) {
      var match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
      return match ? match.pop() : null;
    },

    setCookie: function (name, value, days) {
      if (!this.started && name !== 'gtm_consent') return;
      var expires = '';
      if (days) {
        var date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = '; expires=' + date.toUTCString();
      }
      document.cookie = name + '=' + (value || '') + expires + '; path=/; SameSite=Lax';
    },

    startTimer: function () {
      var self = this;
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(function () {
        self.flush();
      }, this.config.flushInterval);
    },

    setupEventListeners: function () {
      var self = this;

      document.addEventListener('click', function (e) {
        self.clickCount++;
        var target = e.target;
        var text = (target.innerText || target.textContent || '').trim();
        self.track('Click', {
          target: target.tagName,
          text: text.slice(0, 100),
          id: target.id || '',
          class: target.className || '',
          href: target.href || target.getAttribute('href') || '',
          x: e.pageX,
          y: e.pageY,
        });
      });

      var scrollTimeout;
      window.addEventListener('scroll', function () {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function () {
          var scrollY = window.scrollY;
          var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          if (maxScroll <= 0) return;
          var percent = Math.round((scrollY / maxScroll) * 100);
          if (percent > self.scrollMaxDepth) {
            self.scrollMaxDepth = percent;
          }
          if (percent === 25 || percent === 50 || percent === 75 || percent === 100) {
            self.track('Scroll', {
              percentage: percent,
              depth_px: scrollY,
              max_depth: self.scrollMaxDepth,
            });
          }
        }, 500);
      });

      document.addEventListener('submit', function (e) {
        var form = e.target;
        self.track('FormSubmit', {
          form_id: form.id || '',
          form_action: form.action || '',
          form_method: form.method || '',
          field_count: form.querySelectorAll('input, select, textarea').length,
        });
      });

      if (window.history && window.history.pushState) {
        var originalPushState = history.pushState;
        history.pushState = function () {
          originalPushState.apply(this, arguments);
          self.track('PageView', { url: window.location.href, title: document.title, referrer: '' }, {
            page: getPageInfo(),
          });
        };
        window.addEventListener('popstate', function () {
          self.track('PageView', { url: window.location.href, title: document.title, referrer: '' }, {
            page: getPageInfo(),
          });
        });
      }
    },

    log: function () {
      if (this.config.debug) {
        console.log.apply(console, arguments);
      }
    },
  };

  if (typeof window !== 'undefined') {
    var cfg = window._gtmConfig || window.gtmConfig || {};
    if (cfg.apiKey) {
      MyTracker.init(cfg);
    }
    window.myTracker = MyTracker;
    window.gtmTracker = MyTracker;
  }
})();
