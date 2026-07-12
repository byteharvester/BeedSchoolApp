/**
 * Matimand Nivasi Vidyalay - Enterprise PWA
 * Features: Auto-update, Performance, Offline Support
 */
(function() {
  'use strict';

  // ==========================================
  // DOM CACHE
  // ==========================================
  const DOM = {
    splash: document.getElementById('splash-screen'),
    iframe: document.getElementById('app-frame'),
    progressFill: document.getElementById('progress-fill'),
    loadingPercent: document.getElementById('loading-percent'),
    loadingMsg: document.getElementById('loading-message'),
    greeting: document.getElementById('greeting-text'),
    clock: document.getElementById('clock-text'),
    date: document.getElementById('date-text'),
    errorScreen: document.getElementById('error-screen'),
    btnRetry: document.getElementById('btn-retry'),
    errorTitle: document.getElementById('error-title'),
    errorMsg: document.getElementById('error-message'),
    updateBadge: document.getElementById('update-badge')
  };

  // ==========================================
  // STATE
  // ==========================================
  const STATE = {
    isLoaded: false,
    progress: 0,
    maxProgress: 92,
    loadAttempts: 0,
    maxAttempts: 5,
    clockTimer: null,
    loadInterval: null,
    msgInterval: null,
    timeoutTimer: null,
    version: '2.0.0'
  };

  // ==========================================
  // AUTO-UPDATE SYSTEM
  // ==========================================
  function checkForUpdate() {
    // Check if service worker supports updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(function(registration) {
        // Check for updates every 60 seconds
        setInterval(function() {
          registration.update();
        }, 60000);
        
        // Listen for update found
        registration.addEventListener('updatefound', function() {
          var newWorker = registration.installing;
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New update available
              showUpdateAvailable();
            }
          });
        });
      }).catch(function() {});
    }
  }

  function showUpdateAvailable() {
    var badge = DOM.updateBadge;
    if (badge) {
      badge.classList.remove('hidden');
      badge.innerHTML = '<span class="update-icon">⟳</span> Update Available - Tap to Refresh';
      badge.style.cursor = 'pointer';
      badge.onclick = function() {
        if (confirm('A new version is available. Update now?')) {
          window.location.reload();
        }
      };
    }
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================
  function init() {
    registerServiceWorker();
    checkForUpdate();
    startClockAndGreeting();
    startLoadingSimulation();
    setupNetworkListeners();
    setupIframeListener();
    checkIframeLoaded();
    trackPerformance();
  }

  // ==========================================
  // CLOCK & GREETING
  // ==========================================
  function startClockAndGreeting() {
    function update() {
      var now = new Date();
      DOM.clock.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      DOM.date.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      
      var hour = now.getHours();
      var greeting = 'Good Evening';
      if (hour < 12) greeting = 'Good Morning';
      else if (hour < 17) greeting = 'Good Afternoon';
      DOM.greeting.textContent = greeting;
      
      STATE.clockTimer = setTimeout(update, 60000 - (now.getSeconds() * 1000));
    }
    update();
  }

  // ==========================================
  // LOADING SIMULATION
  // ==========================================
  function startLoadingSimulation() {
    var messages = [
      'Checking network...',
      'Securing connection...',
      'Loading School Portal...',
      'Fetching HR Records...',
      'Preparing Dashboard...'
    ];
    var msgIndex = 0;

    STATE.msgInterval = setInterval(function() {
      if (STATE.isLoaded) return;
      DOM.loadingMsg.textContent = messages[msgIndex % messages.length];
      msgIndex++;
    }, 2500);

    function simulate() {
      if (STATE.isLoaded) return;
      if (STATE.progress < STATE.maxProgress) {
        var increment = Math.max(0.5, (STATE.maxProgress - STATE.progress) * 0.08);
        STATE.progress += increment;
        updateUIProgress(STATE.progress);
        STATE.loadInterval = requestAnimationFrame(simulate);
      }
    }
    requestAnimationFrame(simulate);

    STATE.timeoutTimer = setTimeout(function() {
      if (!STATE.isLoaded) {
        DOM.loadingMsg.textContent = 'Still connecting...';
        DOM.loadingMsg.style.color = '#f59e0b';
        // Try to reload iframe
        retryIframe();
      }
    }, 20000);
  }

  function updateUIProgress(val) {
    var p = Math.floor(val);
    DOM.loadingPercent.textContent = p + '%';
    DOM.progressFill.style.transform = 'scaleX(' + (val / 100) + ')';
  }

  // ==========================================
  // IFRAME HANDLING
  // ==========================================
  function checkIframeLoaded() {
    try {
      var doc = DOM.iframe.contentDocument || DOM.iframe.contentWindow.document;
      if (doc && doc.readyState === 'complete') {
        handleIframeLoad();
      }
    } catch(e) {}
  }

  function setupIframeListener() {
    if (!navigator.onLine) return handleOffline();

    DOM.iframe.addEventListener('load', handleIframeLoad);
    DOM.iframe.addEventListener('error', handleIframeError);

    // Periodic check
    var checkInterval = setInterval(function() {
      if (STATE.isLoaded) {
        clearInterval(checkInterval);
        return;
      }
      checkIframeLoaded();
    }, 2000);

    setTimeout(function() { clearInterval(checkInterval); }, 30000);
  }

  function handleIframeLoad() {
    if (STATE.isLoaded) return;
    STATE.isLoaded = true;
    
    cleanup();
    updateUIProgress(100);
    DOM.loadingMsg.textContent = 'Ready.';
    
    setTimeout(function() {
      DOM.splash.classList.add('fade-out');
      setTimeout(function() {
        DOM.splash.remove();
        clearTimeout(STATE.clockTimer);
        // Enable iframe interactions
        DOM.iframe.style.pointerEvents = 'auto';
      }, 850);
    }, 400);
  }

  function handleIframeError() {
    STATE.loadAttempts++;
    if (STATE.loadAttempts < STATE.maxAttempts) {
      DOM.loadingMsg.textContent = 'Retrying connection... (' + STATE.loadAttempts + '/' + STATE.maxAttempts + ')';
      setTimeout(retryIframe, 2000);
    } else {
      handleOffline();
    }
  }

  function retryIframe() {
    var src = DOM.iframe.src;
    DOM.iframe.src = '';
    setTimeout(function() {
      DOM.iframe.src = src;
    }, 500);
  }

  function cleanup() {
    cancelAnimationFrame(STATE.loadInterval);
    clearInterval(STATE.msgInterval);
    clearTimeout(STATE.timeoutTimer);
  }

  // ==========================================
  // NETWORK & ERROR HANDLING
  // ==========================================
  function setupNetworkListeners() {
    window.addEventListener('online', function() {
      if (!STATE.isLoaded) {
        DOM.loadingMsg.textContent = 'Back online! Reconnecting...';
        retryIframe();
      }
    });
    
    window.addEventListener('offline', handleOffline);
    DOM.btnRetry.addEventListener('click', function() {
      window.location.reload();
    });
  }

  function handleOffline() {
    var isOnline = navigator.onLine;
    DOM.errorTitle.textContent = isOnline ? 'Server Error' : 'No Internet';
    DOM.errorMsg.textContent = isOnline 
      ? 'Unable to reach the school server. Please try again.' 
      : 'You are offline. Please check your connection.';
    DOM.errorScreen.classList.remove('hidden');
    DOM.splash.classList.add('fade-out');
  }

  // ==========================================
  // PERFORMANCE TRACKING
  // ==========================================
  function trackPerformance() {
    if ('performance' in window && 'measure' in performance) {
      // Track First Paint
      var paintObserver = new PerformanceObserver(function(list) {
        var entries = list.getEntries();
        entries.forEach(function(entry) {
          if (entry.name === 'first-paint') {
            console.log('First Paint:', entry.startTime.toFixed(0), 'ms');
          }
        });
      });
      try {
        paintObserver.observe({ entryTypes: ['paint'] });
      } catch(e) {}
    }
  }

  // ==========================================
  // SERVICE WORKER
  // ==========================================
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js', { scope: '/' })
          .then(function(registration) {
            console.log('SW registered:', registration.scope);
          })
          .catch(function(err) {
            console.log('SW registration failed:', err);
          });
      });
    }
  }

  // ==========================================
  // BOOT
  // ==========================================
  // Only start if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
