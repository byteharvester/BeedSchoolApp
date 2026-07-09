/**
 * PWA Architecture - Core Controller
 * Engineered for minimal layout thrashing and O(1) DOM updates.
 */
(function() {
  'use strict';

  // 1. Cached DOM Nodes (Query once, use forever)
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
    errorMsg: document.getElementById('error-message')
  };

  // 2. Application State
  const STATE = {
    isLoaded: false,
    progress: 0,
    maxSimulatedProgress: 92, // Holds at 92% until iframe fires 'load'
    loadingInterval: null,
    messageInterval: null,
    timeoutTimer: null,
    clockTimer: null
  };

  // 3. Dynamic UX Messages
  const LOAD_MESSAGES = [
    "Checking network...",
    "Securing connection...",
    "Loading School Portal...",
    "Fetching HR Records...",
    "Preparing Dashboard..."
  ];

  // ==========================================
  // INITIALIZATION & TIMING
  // ==========================================
  function init() {
    registerServiceWorker();
    startClockAndGreeting();
    startLoadingSimulation();
    setupNetworkListeners();
    setupIframeListener();
  }

  function startClockAndGreeting() {
    const updateTime = () => {
      const now = new Date();
      
      // Update Clock (HH:MM)
      DOM.clock.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      
      // Update Date
      DOM.date.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      
      // Update Greeting
      const hour = now.getHours();
      if (hour < 12) DOM.greeting.textContent = "Good Morning";
      else if (hour < 17) DOM.greeting.textContent = "Good Afternoon";
      else DOM.greeting.textContent = "Good Evening";
      
      STATE.clockTimer = setTimeout(updateTime, 60000 - (now.getSeconds() * 1000)); // Sync to the minute
    };
    updateTime(); // Fire immediately
  }

  // ==========================================
  // PROGRESS BAR LOGIC (Hardware Accelerated)
  // ==========================================
  function startLoadingSimulation() {
    let msgIndex = 0;
    
    // Cycle Messages
    STATE.messageInterval = setInterval(() => {
      if (STATE.isLoaded) return;
      DOM.loadingMsg.textContent = LOAD_MESSAGES[msgIndex % LOAD_MESSAGES.length];
      msgIndex++;
    }, 2500);

    // Simulate Network Progress (Eases out as it gets closer to 90%)
    const simulate = () => {
      if (STATE.isLoaded) return;
      if (STATE.progress < STATE.maxSimulatedProgress) {
        // Fast at first, slows down near the end
        const increment = Math.max(0.5, (STATE.maxSimulatedProgress - STATE.progress) * 0.1);
        STATE.progress += increment;
        updateUIProgress(STATE.progress);
        STATE.loadingInterval = requestAnimationFrame(simulate);
      }
    };
    requestAnimationFrame(simulate);

    // 20-second Timeout Catch
    STATE.timeoutTimer = setTimeout(() => {
      if (!STATE.isLoaded) {
        DOM.loadingMsg.textContent = "Still trying to connect...";
        DOM.loadingMsg.style.color = "#f59e0b"; // Warning amber
      }
    }, 20000);
  }

  function updateUIProgress(val) {
    const p = Math.floor(val);
    DOM.loadingPercent.textContent = p + '%';
    // GPU Accelerated scaleX (Values 0.0 to 1.0)
    DOM.progressFill.style.transform = `scaleX(${val / 100})`;
  }

  // ==========================================
  // IFRAME HANDLERS
  // ==========================================
  function setupIframeListener() {
    if (!navigator.onLine) return handleOffline();

    DOM.iframe.addEventListener('load', () => {
      STATE.isLoaded = true;
      
      // Clear all timers
      cancelAnimationFrame(STATE.loadingInterval);
      clearInterval(STATE.messageInterval);
      clearTimeout(STATE.timeoutTimer);

      // Snap progress to 100%
      updateUIProgress(100);
      DOM.loadingMsg.textContent = "Ready.";
      
      // Wait 400ms for psychological satisfaction, then fade out
      setTimeout(() => {
        DOM.splash.classList.add('fade-out');
        
        // Remove splash from DOM entirely after transition to free up memory
        setTimeout(() => {
          DOM.splash.remove(); 
          clearTimeout(STATE.clockTimer); // Stop clock logic since it's removed
        }, 850); 
      }, 400);
    });

    // Fallback if iframe fails silently
    DOM.iframe.addEventListener('error', handleOffline);
  }

  // ==========================================
  // ERROR & NETWORK HANDLING
  // ==========================================
  function setupNetworkListeners() {
    window.addEventListener('online', () => {
      if (!STATE.isLoaded) window.location.reload();
    });
    window.addEventListener('offline', handleOffline);
    
    DOM.btnRetry.addEventListener('click', () => {
      window.location.reload();
    });
  }

  function handleOffline() {
    DOM.errorTitle.textContent = navigator.onLine ? "Server Error" : "No Internet";
    DOM.errorMsg.textContent = navigator.onLine 
      ? "Google Apps Script refused to connect. Please try again." 
      : "You are offline. Please check your WiFi or cellular data.";
    
    DOM.errorScreen.classList.remove('hidden');
    DOM.splash.classList.add('fade-out');
  }

  // ==========================================
  // SERVICE WORKER
  // ==========================================
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      // Defer registration until window loads to prioritize First Paint
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.error('SW Error:', err));
      });
    }
  }

  // Boot Application
  init();

})();