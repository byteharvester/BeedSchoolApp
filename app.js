/**
 * MySchool - Enterprise PWA
 * Smart Splash Screen with Google Verification Integration
 */
(function() {
  'use strict';

  // ============================================================
  // DOM REFERENCES
  // ============================================================
  var DOM = {
    splash: document.getElementById('splash-screen'),
    iframe: document.getElementById('app-frame'),
    progressFill: document.getElementById('progress-fill'),
    loadingPercent: document.getElementById('loading-percent'),
    loadingMsg: document.getElementById('loading-message'),
    loadingStatus: document.getElementById('loading-status'),
    greeting: document.getElementById('greeting-text'),
    clock: document.getElementById('clock-text'),
    date: document.getElementById('date-text'),
    errorScreen: document.getElementById('error-screen'),
    btnRetry: document.getElementById('btn-retry'),
    errorTitle: document.getElementById('error-title'),
    errorMsg: document.getElementById('error-message'),
    updateBadge: document.getElementById('update-badge')
  };

  // ============================================================
  // STATE
  // ============================================================
  var STATE = {
    isLoaded: false,
    isGoogleVerified: false,
    progress: 0,
    maxProgress: 92,
    loadAttempts: 0,
    maxAttempts: 5,
    clockTimer: null,
    loadInterval: null,
    msgInterval: null,
    timeoutTimer: null,
    verifyTimer: null,
    version: '2.2.0'
  };

  // ============================================================
  // STATUS MESSAGES
  // ============================================================
  var STATUS_MESSAGES = {
    connecting: 'Connecting to server...',
    verifying: 'Verifying Google Account...',
    verified: '✅ Google Verified!',
    loading: 'Loading Dashboard...',
    ready: '✅ Welcome to MySchool!',
    error: '❌ Connection error'
  };

  // ============================================================
  // LOGO ERROR HANDLING
  // ============================================================
  function setupLogoFallback() {
    var logo = document.getElementById('splash-logo');
    if (!logo) return;
    
    logo.addEventListener('error', function() {
      this.classList.add('error');
      var fallback = this.nextElementSibling;
      if (fallback && fallback.classList.contains('logo-fallback')) {
        fallback.style.display = 'flex';
      }
    });
    
    logo.addEventListener('load', function() {
      this.classList.remove('error');
      var fallback = this.nextElementSibling;
      if (fallback && fallback.classList.contains('logo-fallback')) {
        fallback.style.display = 'none';
      }
    });
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================
  function init() {
    setupLogoFallback();
    registerServiceWorker();
    checkForUpdate();
    startClockAndGreeting();
    startLoadingSimulation();
    setupNetworkListeners();
    setupIframeListener();
    checkIframeLoaded();
    startGoogleVerificationMonitor();
  }

  // ============================================================
  // CLOCK & GREETING
  // ============================================================
  function startClockAndGreeting() {
    function update() {
      var now = new Date();
      DOM.clock.textContent = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      DOM.date.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
      
      var hour = now.getHours();
      var greeting = 'Good Evening';
      if (hour < 12) greeting = 'Good Morning';
      else if (hour < 17) greeting = 'Good Afternoon';
      DOM.greeting.textContent = greeting;
      
      STATE.clockTimer = setTimeout(update, 60000 - (now.getSeconds() * 1000));
    }
    update();
  }

  // ============================================================
  // GOOGLE VERIFICATION MONITOR
  // ============================================================
  function startGoogleVerificationMonitor() {
    updateStatus(STATUS_MESSAGES.verifying, 'loading');

    var checkCount = 0;
    STATE.verifyTimer = setInterval(function() {
      if (STATE.isGoogleVerified || STATE.isLoaded) return;
      checkCount++;

      try {
        var doc = DOM.iframe.contentDocument || DOM.iframe.contentWindow.document;
        if (doc && doc.body) {
          var bodyText = doc.body.innerText || '';
          
          var hasAuthScreen = bodyText.indexOf('Verifying Google Account') !== -1;
          var hasAppContent = bodyText.indexOf('RukhmaiGovind') !== -1 ||
                             bodyText.indexOf('Matimand') !== -1 ||
                             bodyText.indexOf('Students') !== -1 ||
                             bodyText.indexOf('Staff') !== -1 ||
                             bodyText.indexOf('Dashboard') !== -1 ||
                             bodyText.length > 300;

          if (!hasAuthScreen && hasAppContent) {
            STATE.isGoogleVerified = true;
            updateStatus(STATUS_MESSAGES.verified, 'verified');
            handleGoogleVerified();
            clearInterval(STATE.verifyTimer);
            return;
          }
        }
      } catch(e) {}

      if (checkCount >= 12) {
        STATE.isGoogleVerified = true;
        updateStatus(STATUS_MESSAGES.verified, 'verified');
        handleGoogleVerified();
        clearInterval(STATE.verifyTimer);
      }
    }, 1000);
  }

  function updateStatus(message, type) {
    if (!DOM.loadingStatus) return;
    
    var dot = DOM.loadingStatus.querySelector('.status-dot');
    
    if (dot) {
      dot.className = 'status-dot';
      if (type === 'verified') dot.classList.add('success');
      else if (type === 'error') dot.classList.add('error');
      else dot.classList.add('pulse');
    }
    
    var textSpan = DOM.loadingStatus.querySelector('.status-text-content');
    if (textSpan) {
      textSpan.textContent = message;
    }
    
    DOM.loadingStatus.className = 'status-text';
    if (type === 'verified') DOM.loadingStatus.classList.add('verified');
    else if (type === 'loading') DOM.loadingStatus.classList.add('loading');
  }

  function handleGoogleVerified() {
    if (STATE.isLoaded) return;
    
    if (STATE.progress < 95) {
      STATE.progress = 95;
      updateUIProgress(STATE.progress);
    }
    
    DOM.loadingMsg.textContent = 'Loading Dashboard...';
    updateStatus(STATUS_MESSAGES.loading, 'loading');
  }

  // ============================================================
  // LOADING SIMULATION
  // ============================================================
  function startLoadingSimulation() {
    var messages = [
      'Initializing...',
      'Connecting to server...',
      'Securing connection...',
      'Authenticating...',
      'Loading School Portal...'
    ];
    var msgIndex = 0;

    STATE.msgInterval = setInterval(function() {
      if (STATE.isLoaded) return;
      DOM.loadingMsg.textContent = messages[msgIndex % messages.length];
      msgIndex++;
    }, 2000);

    function simulate() {
      if (STATE.isLoaded) return;
      if (STATE.progress < STATE.maxProgress) {
        var increment = Math.max(0.3, (STATE.maxProgress - STATE.progress) * 0.07);
        STATE.progress += increment;
        updateUIProgress(STATE.progress);
        STATE.loadInterval = requestAnimationFrame(simulate);
      }
    }
    requestAnimationFrame(simulate);

    STATE.timeoutTimer = setTimeout(function() {
      if (!STATE.isLoaded) {
        DOM.loadingMsg.textContent = 'Still connecting...';
        updateStatus('⏳ Taking longer than expected...', 'loading');
        retryIframe();
      }
    }, 25000);
  }

  function updateUIProgress(val) {
    var p = Math.floor(val);
    DOM.loadingPercent.textContent = p + '%';
    DOM.progressFill.style.transform = 'scaleX(' + (val / 100) + ')';
  }

  // ============================================================
  // IFRAME HANDLING
  // ============================================================
  function checkIframeLoaded() {
    try {
      var doc = DOM.iframe.contentDocument || DOM.iframe.contentWindow.document;
      if (doc && doc.readyState === 'complete') {
        setTimeout(function() {
          if (!STATE.isLoaded) {
            var bodyText = doc.body ? doc.body.innerText : '';
            if (bodyText.indexOf('Verifying Google Account') === -1 && bodyText.length > 50) {
              STATE.isGoogleVerified = true;
              updateStatus(STATUS_MESSAGES.verified, 'verified');
              handleGoogleVerified();
              handleIframeLoad();
            }
          }
        }, 1500);
      }
    } catch(e) {}
  }

  function setupIframeListener() {
    if (!navigator.onLine) return handleOffline();

    DOM.iframe.addEventListener('load', function() {
      var checkCount = 0;
      var checkInterval = setInterval(function() {
        checkCount++;
        try {
          var doc = DOM.iframe.contentDocument || DOM.iframe.contentWindow.document;
          if (doc && doc.body) {
            var bodyText = doc.body.innerText || '';
            if (bodyText.indexOf('Verifying Google Account') === -1 && bodyText.length > 50) {
              STATE.isGoogleVerified = true;
              updateStatus(STATUS_MESSAGES.verified, 'verified');
              handleGoogleVerified();
              clearInterval(checkInterval);
              handleIframeLoad();
              return;
            }
          }
        } catch(e) {}
        
        if (checkCount >= 15) {
          STATE.isGoogleVerified = true;
          updateStatus(STATUS_MESSAGES.verified, 'verified');
          handleGoogleVerified();
          clearInterval(checkInterval);
          handleIframeLoad();
        }
      }, 1000);
    });
    
    DOM.iframe.addEventListener('error', handleIframeError);

    var loadCheckInterval = setInterval(function() {
      if (STATE.isLoaded) {
        clearInterval(loadCheckInterval);
        return;
      }
      checkIframeLoaded();
    }, 3000);

    setTimeout(function() { clearInterval(loadCheckInterval); }, 35000);
  }

  function handleIframeLoad() {
    if (STATE.isLoaded) return;
    
    if (!STATE.isGoogleVerified) {
      var waitCount = 0;
      var waitInterval = setInterval(function() {
        waitCount++;
        if (STATE.isGoogleVerified || waitCount > 20) {
          clearInterval(waitInterval);
          completeLoad();
        }
      }, 500);
      return;
    }
    
    completeLoad();
  }

  function completeLoad() {
    if (STATE.isLoaded) return;
    STATE.isLoaded = true;
    
    cleanup();
    updateUIProgress(100);
    DOM.loadingMsg.textContent = 'Ready.';
    updateStatus(STATUS_MESSAGES.ready, 'verified');
    
    DOM.iframe.classList.add('visible');
    
    setTimeout(function() {
      DOM.splash.classList.add('fade-out');
      setTimeout(function() {
        DOM.splash.classList.add('hidden');
        clearTimeout(STATE.clockTimer);
        DOM.iframe.style.pointerEvents = 'auto';
      }, 800);
    }, 300);
  }

  function handleIframeError() {
    STATE.loadAttempts++;
    if (STATE.loadAttempts < STATE.maxAttempts) {
      DOM.loadingMsg.textContent = 'Retrying... (' + STATE.loadAttempts + '/' + STATE.maxAttempts + ')';
      updateStatus('🔄 Retrying connection...', 'loading');
      setTimeout(retryIframe, 2000);
    } else {
      updateStatus(STATUS_MESSAGES.error, 'error');
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
    clearInterval(STATE.verifyTimer);
  }

  // ============================================================
  // AUTO-UPDATE
  // ============================================================
  function checkForUpdate() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(function(registration) {
        setInterval(function() { registration.update(); }, 60000);
        
        registration.addEventListener('updatefound', function() {
          var newWorker = registration.installing;
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
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

  // ============================================================
  // NETWORK & ERROR
  // ============================================================
  function setupNetworkListeners() {
    window.addEventListener('online', function() {
      if (!STATE.isLoaded) {
        DOM.loadingMsg.textContent = 'Back online!';
        updateStatus('🔄 Reconnecting...', 'loading');
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
    updateStatus('❌ Connection lost', 'error');
  }

  // ============================================================
  // SERVICE WORKER
  // ============================================================
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js', { scope: '/' })
          .then(function(registration) {
            console.log('SW registered');
          })
          .catch(function(err) {
            console.log('SW registration failed:', err);
          });
      });
    }
  }

  // ============================================================
  // BOOT
  // ============================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
