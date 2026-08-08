(function() {
  'use strict';

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
    btnRetry: document.getElementById('btn-retry')
  };

  var STATE = {
    isLoaded: false,
    progress: 0,
    clockTimer: null
  };

  function init() {
    registerServiceWorker();
    startClockAndGreeting();
    startLoadingSimulation();
    setupIframeListener();
  }

  function startClockAndGreeting() {
    function update() {
      var now = new Date();
      DOM.clock.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      DOM.date.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      var hour = now.getHours();
      DOM.greeting.textContent = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
      STATE.clockTimer = setTimeout(update, 60000 - (now.getSeconds() * 1000));
    }
    update();
  }

  function startLoadingSimulation() {
    var messages = ['Initializing...', 'Connecting to server...', 'Securing connection...', 'Loading Interface...'];
    var msgIndex = 0;

    setInterval(function() {
      if (STATE.isLoaded) return;
      DOM.loadingMsg.textContent = messages[msgIndex % messages.length];
      msgIndex++;
    }, 2000);

    function simulate() {
      if (STATE.isLoaded) return;
      if (STATE.progress < 90) {
        STATE.progress += Math.max(0.3, (90 - STATE.progress) * 0.05);
        updateUIProgress(STATE.progress);
        requestAnimationFrame(simulate);
      }
    }
    requestAnimationFrame(simulate);
  }

  function updateUIProgress(val) {
    DOM.loadingPercent.textContent = Math.floor(val) + '%';
    DOM.progressFill.style.transform = 'scaleX(' + (val / 100) + ')';
  }

  function setupIframeListener() {
    if (!navigator.onLine) return handleOffline();

    // The iframe has loaded the Google Script
    DOM.iframe.addEventListener('load', function() {
      STATE.isLoaded = true;
      updateUIProgress(100);
      DOM.loadingMsg.textContent = 'Ready.';
      
      var dot = DOM.loadingStatus.querySelector('.status-dot');
      var txt = DOM.loadingStatus.querySelector('.status-text-content');
      if(dot) { dot.className = 'status-dot success'; }
      if(txt) { txt.textContent = '✅ Connected successfully!'; }
      DOM.loadingStatus.classList.add('verified');

      DOM.iframe.classList.add('visible');
      
      setTimeout(function() {
        DOM.splash.classList.add('fade-out');
        setTimeout(function() {
          DOM.splash.classList.add('hidden');
          clearTimeout(STATE.clockTimer);
        }, 800);
      }, 500);
    });

    DOM.iframe.addEventListener('error', handleOffline);
  }

  function handleOffline() {
    DOM.errorScreen.classList.remove('hidden');
    DOM.splash.classList.add('fade-out');
  }

  DOM.btnRetry.addEventListener('click', function() {
    window.location.reload();
  });

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        // Pointing explicitly to the GitHub Pages path
        navigator.serviceWorker.register('/school-management-app/sw.js');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
