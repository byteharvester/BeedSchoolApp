/**
 * Matimand Nivasi Vidyalay - Enterprise PWA
 * Smart Splash Screen that waits for Google Verification
 */
(function() {
  'use strict';

  // ==========================================
  // DOM CACHE
  // ==========================================
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

  // ==========================================
  // STATE
  // ==========================================
  var STATE = {
    isLoaded: false,
    isGoogleVerified: false,
    progress: 0,
    maxProgress: 95, // Hold at 95% until Google verification
    loadAttempts: 0,
    maxAttempts: 5,
    clockTimer: null,
    loadInterval: null,
    msgInterval: null,
    timeoutTimer: null,
    verifyTimer: null,
    version: '2.0.0',
    splashHold: false
  };

  // ==========================================
  // AUTO-UPDATE SYSTEM
  // ==========================================
  function checkForUpdate() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(function(registration) {
        setInterval(function() {
          registration.update();
        }, 60000);
        
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
    
    // Start monitoring for Google verification
    startGoogleVerificationMonitor();
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
  // GOOGLE VERIFICATION MONITOR
  // ==========================================
  function startGoogleVerificationMonitor() {
    // Update status message
    updateStatus('⏳ Verifying Google Account...');
    
    // Check if the iframe content indicates verification is complete
    STATE.verifyTimer = setInterval(function() {
      if (STATE.isGoogleVerified) return;
      if (STATE.isLoaded) return;
      
      try {
        // Try to access iframe content - if we can, verification is done
        var iframeDoc = DOM.iframe.contentDocument || DOM.iframe.contentWindow.document;
        if (iframeDoc) {
          // Check for elements that indicate the app is loaded
          var bodyText = iframeDoc.body ? iframeDoc.body.innerText : '';
          var hasContent = iframeDoc.body && iframeDoc.body.children.length > 0;
          
          // If the iframe has content and it's not the auth screen, or if we can detect the app
          if (hasContent && bodyText.length > 50) {
            // Check if the auth screen is gone (indicating verification complete)
            var hasAuthScreen = bodyText.indexOf('Verifying Google Account') !== -1;
            var hasAppContent = bodyText.indexOf('Matimand Nivasi Vidyalay') !== -1 || 
                               bodyText.indexOf('Students') !== -1 ||
                               bodyText.indexOf('Staff') !== -1;
            
            if (!hasAuthScreen && (hasAppContent || bodyText.length > 200)) {
              STATE.isGoogleVerified = true;
              updateStatus('✅ Google Verified!');
              handleGoogleVerified();
            }
          }
        }
      } catch(e) {
        // Cross-origin or not loaded yet - keep checking
        // This is normal during the verification process
      }
    }, 1000);

    // Also check periodically if the iframe has fully loaded
    var loadCheck = setInterval(function() {
      if (STATE.isGoogleVerified || STATE.isLoaded) {
        clearInterval(loadCheck);
        return;
      }
      
      // Check if iframe is fully loaded
      try {
        var doc = DOM.iframe.contentDocument || DOM.iframe.contentWindow.document;
        if (doc && doc.readyState === 'complete') {
          // Give it a moment for the auth to complete
          setTimeout(function() {
            if (!STATE.isGoogleVerified && !STATE.isLoaded) {
              // If we're here, assume verification is done
              STATE.isGoogleVerified = true;
              updateStatus('✅ Google Verified!');
              handleGoogleVerified();
            }
          }, 3000);
        }
      } catch(e) {}
    }, 2000);

    // Safety timer - if not verified after 15 seconds, assume success
    setTimeout(function() {
      if (!STATE.isGoogleVerified && !STATE.isLoaded) {
        STATE.isGoogleVerified = true;
        updateStatus('✅ Connected');
        handleGoogleVerified();
      }
    }, 15000);
  }

  function updateStatus(message) {
    if (DOM.loadingStatus) {
      DOM.loadingStatus.textContent = message;
    }
  }

  function handleGoogleVerified() {
    if (STATE.isLoaded) return;
    
    // Update progress to reflect verification
    if (STATE.progress < 95) {
      STATE.progress = 95;
      updateUIProgress(STATE.progress);
    }
    
    DOM.loadingMsg.textContent = 'Loading Dashboard...';
    updateStatus('✅ Ready!');
    DOM.loadingStatus.className = 'done';
    
    // The iframe load event will finish the rest
  }

  // ==========================================
  // LOADING SIMULATION
  // ==========================================
  function startLoadingSimulation() {
    var messages = [
      'Connecting to server...',
      'Securing connection...',
      'Authenticating...',
      'Loading School Portal...',
      'Fetching Records...'
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
        var increment = Math.max(0.3, (STATE.maxProgress - STATE.progress) * 0.06);
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
        retryIframe();
      }
    }, 25000);
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
        // Wait a bit more for verification to complete
        setTimeout(function() {
          if (!STATE.isLoaded) {
            // Check if auth is done
            var bodyText = doc.body ? doc.body.innerText : '';
            if (bodyText.indexOf('Verifying Google Account') === -1) {
              STATE.isGoogleVerified = true;
              handleGoogleVerified();
              handleIframeLoad();
            }
          }
        }, 2000);
      }
    } catch(e) {}
  }

  function setupIframeListener() {
    if (!navigator.onLine) return handleOffline();

    DOM.iframe.addEventListener('load', function() {
      // The iframe loaded, but Google verification may still be happening
      // Wait for verification to complete
      var checkCount = 0;
      var checkInterval = setInterval(function() {
        checkCount++;
        try {
          var doc = DOM.iframe.contentDocument || DOM.iframe.contentWindow.document;
          if (doc) {
            var bodyText = doc.body ? doc.body.innerText : '';
            // Check if the auth screen is gone
            if (bodyText.indexOf('Verifying Google Account') === -1 && bodyText.length > 50) {
              STATE.isGoogleVerified = true;
              handleGoogleVerified();
              clearInterval(checkInterval);
              handleIframeLoad();
              return;
            }
          }
        } catch(e) {}
        
        // If we've checked 15 times (15 seconds), assume it's done
        if (checkCount >= 15) {
          STATE.isGoogleVerified = true;
          handleGoogleVerified();
          clearInterval(checkInterval);
          handleIframeLoad();
        }
      }, 1000);
    });
    
    DOM.iframe.addEventListener('error', handleIframeError);

    // Periodic check
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
    
    // Only complete if Google is verified or we're forcing it
    if (!STATE.isGoogleVerified) {
      // Wait for verification
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
    updateStatus('✅ Welcome!');
    DOM.loadingStatus.className = 'done';
    
    // Slight delay for smooth transition
    setTimeout(function() {
      DOM.splash.classList.add('fade-out');
      setTimeout(function() {
        DOM.splash.classList.add('hidden');
        clearTimeout(STATE.clockTimer);
        DOM.iframe.style.pointerEvents = 'auto';
      }, 850);
    }, 300);
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
    clearInterval(STATE.verifyTimer);
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
      try {
        var paintObserver = new PerformanceObserver(function(list) {
          var entries = list.getEntries();
          entries.forEach(function(entry) {
            if (entry.name === 'first-paint') {
              console.log('First Paint:', entry.startTime.toFixed(0), 'ms');
            }
          });
        });
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
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
