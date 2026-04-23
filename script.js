(function () {
  'use strict';

  var body = document.body;
  var CONFIG = {
    brandName: 'Clínica Kelly Peçanha',
    whatsappNumber: '5531982434238',
    instagramUrl: 'https://instagram.com/kp.estetica',
    mapsUrl: 'https://share.google/CAKNbxwuJpxjZjeY9',
    defaultWhatsAppBaseText: 'Oi, gostaria de mais informações sobre a limpeza de pele.',
    defaultLeadIntentText: 'Oi, gostaria de mais informações sobre a limpeza de pele.',
    defaultLeadsWebhookUrl: ''
  };

  var PAGE_CONFIG = {
    whatsappBaseText: (body && body.dataset.whatsappBaseText) || CONFIG.defaultWhatsAppBaseText,
    leadIntentText: (body && body.dataset.leadIntentText) || CONFIG.defaultLeadIntentText,
    leadsWebhookUrl: (body && body.dataset.leadsWebhookUrl) || CONFIG.defaultLeadsWebhookUrl
  };

  var navbar = document.getElementById('navbar');
  var modal = document.getElementById('leadModal');
  var modalOverlay = document.querySelector('.modal-overlay');
  var modalClose = document.getElementById('modalClose');
  var leadForm = document.getElementById('leadForm');
  var leadPhone = document.getElementById('leadPhone');
  var phoneError = document.getElementById('phoneError');

  function buildWhatsAppUrl(message) {
    var base = 'https://api.whatsapp.com/send/?phone=' + CONFIG.whatsappNumber;
    if (!message) return base;
    return base + '&text=' + encodeURIComponent(message);
  }

  function buildLeadPayload(name, phone) {
    var dateValue = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    var siteValue = window.location.href;
    return {
      data: dateValue,
      nome: name,
      whatsapp: phone,
      site: siteValue,
      Data: dateValue,
      Nome: name,
      WhatsApp: phone,
      Site: siteValue
    };
  }

  function sendLeadToSheet(payload) {
    var webhookUrl = String(PAGE_CONFIG.leadsWebhookUrl || '').trim();
    if (!webhookUrl) return Promise.resolve('missing-webhook');

    var bodyText = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      var beaconBlob = new Blob([bodyText], { type: 'text/plain;charset=UTF-8' });
      var queued = navigator.sendBeacon(webhookUrl, beaconBlob);
      if (queued) return Promise.resolve('beacon');
    }

    return fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: bodyText
    })
      .then(function () { return 'fetch'; })
      .catch(function () { return 'fetch-error'; });
  }

  function waitForLeadDispatch(sendPromise, timeoutMs) {
    return Promise.race([
      Promise.resolve(sendPromise),
      new Promise(function (resolve) {
        setTimeout(function () {
          resolve('timeout');
        }, timeoutMs);
      })
    ]);
  }

  function isMobileDevice() {
    var mobileByAgent = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
    var mobileByViewport = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
    return mobileByAgent || !!mobileByViewport;
  }

  function bindStaticLinks() {
    document.querySelectorAll('[data-instagram-link]').forEach(function (link) {
      link.href = CONFIG.instagramUrl;
    });

    document.querySelectorAll('[data-maps-link]').forEach(function (link) {
      link.href = CONFIG.mapsUrl;
    });

    document.querySelectorAll('[data-whatsapp-direct]').forEach(function (link) {
      link.href = buildWhatsAppUrl(PAGE_CONFIG.whatsappBaseText);
      link.classList.add('js-open-modal');
    });

    document.querySelectorAll('.js-open-modal').forEach(function (btn) {
      if (!btn.getAttribute('href') || btn.getAttribute('href') === '#') {
        btn.setAttribute('href', buildWhatsAppUrl(PAGE_CONFIG.whatsappBaseText));
      }
    });
  }

  function setupNavbar() {
    window.addEventListener('scroll', function () {
      if (!navbar) return;
      navbar.classList.toggle('is-scrolled', window.scrollY > 24);
    }, { passive: true });
  }

  function setupReveal() {
    if (!('IntersectionObserver' in window)) return;

    document.body.classList.add('has-io');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.animate-on-scroll').forEach(function (element) {
      observer.observe(element);
    });
  }

  function setupCarousel() {
    var carousel = document.getElementById('resultadosCarousel');
    if (!carousel) return;

    var viewport = carousel.querySelector('.carousel__viewport');
    var track = carousel.querySelector('.carousel__track');
    var slides = Array.prototype.slice.call(track.querySelectorAll('.carousel__slide'));
    var dots = Array.prototype.slice.call(carousel.querySelectorAll('.carousel__dot'));
    var prev = carousel.querySelector('.carousel__btn--prev');
    var next = carousel.querySelector('.carousel__btn--next');

    if (!viewport || !track || slides.length === 0 || dots.length === 0 || !prev || !next) return;

    var current = 0;
    var timer = null;

    function stopAuto() {
      clearInterval(timer);
      timer = null;
    }

    function getSlideVideo(index) {
      if (!slides[index]) return null;
      return slides[index].querySelector('video');
    }

    function isVideoSlide(index) {
      return !!getSlideVideo(index);
    }

    function stopNonActiveVideos(activeIndex) {
      slides.forEach(function (slide, index) {
        var video = slide.querySelector('video');
        if (!video || index === activeIndex) return;
        video.pause();
      });
    }

    function getOffset(index) {
      var vpWidth = viewport.offsetWidth;
      var slide = slides[index];
      return vpWidth / 2 - slide.offsetLeft - slide.offsetWidth / 2;
    }

    function goTo(index) {
      slides[current].classList.remove('is-active');
      dots[current].classList.remove('is-active');

      current = ((index % slides.length) + slides.length) % slides.length;

      slides[current].classList.add('is-active');
      dots[current].classList.add('is-active');
      track.style.transform = 'translateX(' + getOffset(current) + 'px)';

      stopNonActiveVideos(current);
      if (isVideoSlide(current)) {
        stopAuto();
      }
    }

    function startAuto() {
      if (slides.length < 2 || isVideoSlide(current)) return;
      stopAuto();
      timer = setInterval(function () {
        goTo(current + 1);
      }, 3400);
    }

    prev.addEventListener('click', function () {
      goTo(current - 1);
      startAuto();
    });

    next.addEventListener('click', function () {
      goTo(current + 1);
      startAuto();
    });

    dots.forEach(function (dot, index) {
      dot.addEventListener('click', function () {
        goTo(index);
        startAuto();
      });
    });

    slides.forEach(function (slide, index) {
      var video = slide.querySelector('video');
      if (!video) return;
      video.addEventListener('play', function () {
        if (current === index) {
          stopAuto();
        }
      });
    });

    track.style.transition = 'none';
    slides[0].classList.add('is-active');
    dots[0].classList.add('is-active');
    track.style.transform = 'translateX(' + getOffset(0) + 'px)';
    requestAnimationFrame(function () {
      track.style.transition = '';
    });

    startAuto();

    window.addEventListener('resize', function () {
      track.style.transition = 'none';
      track.style.transform = 'translateX(' + getOffset(current) + 'px)';
      requestAnimationFrame(function () {
        track.style.transition = '';
      });
    });
  }

  function openModal(event) {
    if (event) event.preventDefault();
    if (!modal) return;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    if (!modal) return;

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');

    if (leadForm) leadForm.reset();
    if (phoneError) phoneError.classList.remove('is-visible');
  }

  function phoneMask(value) {
    var digits = value.replace(/\D/g, '').slice(0, 11);

    if (!digits) return '';
    if (digits.length <= 2) return '(' + digits;
    if (digits.length <= 6) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
    if (digits.length <= 10) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);

    return '(' + digits.slice(0, 2) + ') ' + digits[2] + ' ' + digits.slice(3, 7) + '-' + digits.slice(7);
  }

  function setupModal() {
    if (!modal || !leadForm) return;

    document.querySelectorAll('.js-open-modal').forEach(function (trigger) {
      trigger.addEventListener('click', openModal);
    });

    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
    if (modalClose) modalClose.addEventListener('click', closeModal);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });

    if (leadPhone) {
      leadPhone.addEventListener('input', function () {
        this.value = phoneMask(this.value);

        var digits = this.value.replace(/\D/g, '');
        if (digits.length > 2 && digits.length < 10) {
          phoneError.classList.add('is-visible');
        } else {
          phoneError.classList.remove('is-visible');
        }
      });
    }

    leadForm.addEventListener('submit', function (event) {
      event.preventDefault();

      var name = String((document.getElementById('leadName') || {}).value || '').trim();
      var phone = String((leadPhone || {}).value || '').trim();
      var digits = phone.replace(/\D/g, '');

      phoneError.classList.remove('is-visible');

      if (!name || digits.length < 10) {
        if (digits.length < 10) phoneError.classList.add('is-visible');
        return;
      }

      var message = PAGE_CONFIG.leadIntentText;
      var whatsappUrl = buildWhatsAppUrl(message);
      var sendLeadPromise = waitForLeadDispatch(sendLeadToSheet(buildLeadPayload(name, phone)), 900);

      function redirectToWhatsApp() {
        if (isMobileDevice()) {
          window.location.href = whatsappUrl;
          return;
        }

        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      }

      sendLeadPromise.then(function () {
        redirectToWhatsApp();
        closeModal();
      }).catch(function () {
        redirectToWhatsApp();
        closeModal();
      });
    });
  }

  function setupClinicHours() {
    var dot = document.getElementById('clinic-dot');
    var text = document.getElementById('clinic-hours-text');
    if (!dot || !text) return;

    var schedule = {
      Mon: [9, 20],
      Tue: [9, 20],
      Wed: [9, 20],
      Thu: [9, 20],
      Fri: [9, 20],
      Sat: [9, 14],
      Sun: null
    };

    var dayLabels = {
      Mon: 'segunda-feira',
      Tue: 'terça-feira',
      Wed: 'quarta-feira',
      Thu: 'quinta-feira',
      Fri: 'sexta-feira',
      Sat: 'sábado',
      Sun: 'domingo'
    };

    var now = new Date();
    var weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'short'
    }).format(now);

    var timeParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }).formatToParts(now);

    var hour = Number(timeParts.find(function (p) { return p.type === 'hour'; }).value);
    var minute = Number(timeParts.find(function (p) { return p.type === 'minute'; }).value);
    var nowMinutes = (hour * 60) + minute;

    var todayRange = schedule[weekday];
    var isOpen = !!todayRange && nowMinutes >= (todayRange[0] * 60) && nowMinutes < (todayRange[1] * 60);

    if (isOpen) {
      dot.style.background = '#34A853';
      text.textContent = 'Aberto · Fecha às ' + String(todayRange[1]).padStart(2, '0') + ':00';
      return;
    }

    dot.style.background = '#9E9E9E';

    var order = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var idx = order.indexOf(weekday);
    var nextOpenDay = null;

    for (var i = 1; i <= 7; i += 1) {
      var key = order[(idx + i) % 7];
      if (schedule[key]) {
        nextOpenDay = key;
        break;
      }
    }

    if (nextOpenDay) {
      text.textContent = 'Fechado · Abre ' + dayLabels[nextOpenDay] + ' às ' + String(schedule[nextOpenDay][0]).padStart(2, '0') + ':00';
    } else {
      text.textContent = 'Fechado';
    }
  }

  bindStaticLinks();
  setupNavbar();
  setupReveal();
  setupCarousel();
  setupModal();
  setupClinicHours();
})();
