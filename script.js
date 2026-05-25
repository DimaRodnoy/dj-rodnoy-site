const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");
const heroSlides = Array.from(document.querySelectorAll(".hero-slide"));
const heroDots = Array.from(document.querySelectorAll(".hero-dot"));
const heroVideo = document.querySelector(".hero-video");
const lightbox = document.querySelector(".lightbox");
const lightboxImage = document.querySelector(".lightbox img");
const lightboxClose = document.querySelector(".lightbox-close");
const lightboxPrev = document.querySelector(".lightbox-prev");
const lightboxNext = document.querySelector(".lightbox-next");
const videoTrack = document.querySelector(".video-grid");
const videoPrevButton = document.querySelector(".video-prev");
const videoNextButton = document.querySelector(".video-next");
const videoCards = Array.from(document.querySelectorAll(".video-card"));
const galleryTrack = document.querySelector(".gallery-grid");
const galleryPrevButton = document.querySelector(".gallery-prev");
const galleryNextButton = document.querySelector(".gallery-next");
const galleryItems = Array.from(document.querySelectorAll(".gallery-item"));
const videoStartIndex = Math.max(
  0,
  videoCards.findIndex((card) => card.querySelector("[data-video-start='true']"))
);
const galleryStartIndex = Math.max(
  0,
  galleryItems.findIndex((item) => item.dataset.galleryStart === "true")
);
const galleryImages = galleryItems
  .map((button) => button.querySelector("img"))
  .filter(Boolean);
let currentImageIndex = 0;
let lightboxImageTimer = 0;
let dragStartX = 0;
let dragOffsetX = 0;
let isDragging = false;
let activeHeroSlideIndex = 0;
let heroSlideTimer = 0;
let activeVideoIndex = 0;
let videoScrollFrame = 0;
let videoScrollLockUntil = 0;
let videoRenderTimer = 0;
let videoDragStartX = 0;
let videoDragStartScroll = 0;
let videoWasDragged = false;
let pendingVideoClickIndex = null;
let suppressVideoClick = false;
let activeGalleryIndex = 0;
let galleryScrollFrame = 0;
let galleryScrollLockUntil = 0;
let galleryDragStartX = 0;
let galleryDragStartScroll = 0;
let galleryWasDragged = false;
let pendingGalleryClickIndex = null;
let suppressGalleryClick = false;
const videoAllow = "autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share";
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (heroVideo) {
  const revealHeroVideo = () => {
    heroVideo.classList.add("is-ready");
  };

  heroVideo.addEventListener("loadeddata", revealHeroVideo, { once: true });
  heroVideo.addEventListener("canplay", revealHeroVideo, { once: true });

  if (prefersReducedMotion.matches) {
    heroVideo.removeAttribute("autoplay");
    heroVideo.pause();
  } else {
    const playPromise = heroVideo.play();
    playPromise?.catch(() => {});
  }
}

navToggle?.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

function showHeroSlide(index) {
  if (!heroSlides.length) return;

  activeHeroSlideIndex = (index + heroSlides.length) % heroSlides.length;
  heroSlides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === activeHeroSlideIndex);
  });
  heroDots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === activeHeroSlideIndex;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-current", String(isActive));
  });
}

function startHeroAutoplay() {
  if (heroSlides.length < 2 || prefersReducedMotion.matches) return;

  window.clearInterval(heroSlideTimer);
  heroSlideTimer = window.setInterval(() => {
    showHeroSlide(activeHeroSlideIndex + 1);
  }, 7000);
}

heroDots.forEach((dot, dotIndex) => {
  dot.addEventListener("click", () => {
    showHeroSlide(dotIndex);
    startHeroAutoplay();
  });
});

startHeroAutoplay();

function setLightboxImage(index) {
  if (!galleryImages.length || !lightboxImage) return;

  currentImageIndex = (index + galleryImages.length) % galleryImages.length;
  const image = galleryImages[currentImageIndex];

  window.clearTimeout(lightboxImageTimer);
  lightboxImage.style.opacity = "0";
  lightboxImage.style.transform = "translateX(0)";

  lightboxImageTimer = window.setTimeout(() => {
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightboxImage.style.opacity = "1";
  }, 120);
}

function openLightbox(index) {
  if (!lightbox) return;

  setLightboxImage(index);
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-lightbox-open");
  lightbox.focus({ preventScroll: true });
}

function showPreviousImage() {
  setLightboxImage(currentImageIndex - 1);
}

function showNextImage() {
  setLightboxImage(currentImageIndex + 1);
}

function pauseVideoCards() {
  videoCards.forEach((card) => {
    const iframe = card.querySelector("iframe");
    iframe?.contentWindow?.postMessage(JSON.stringify({ method: "pause" }), "*");
  });
}

function showVideoThumbnail(frame) {
  if (!frame || frame.querySelector("img")) return;

  const thumbnail = document.createElement("img");
  thumbnail.src = frame.dataset.videoThumb || "";
  thumbnail.alt = frame.dataset.videoTitle || "";
  thumbnail.loading = "lazy";
  frame.replaceChildren(thumbnail);
}

function showVideoPlayer(frame) {
  if (!frame || frame.querySelector("iframe")) return;

  const iframe = document.createElement("iframe");
  iframe.src = frame.dataset.videoSrc || "";
  iframe.title = frame.dataset.videoTitle || "";
  iframe.loading = "lazy";
  iframe.allow = videoAllow;
  iframe.allowFullscreen = true;
  frame.replaceChildren(iframe);
}

function renderVideoFrames(activeIndex = activeVideoIndex, shouldLoadActive = true) {
  window.clearTimeout(videoRenderTimer);

  videoCards.forEach((card, index) => {
    const frame = card.querySelector(".video-frame");

    if (index === activeIndex && shouldLoadActive) {
      showVideoPlayer(frame);
      return;
    }

    showVideoThumbnail(frame);
  });
}

function queueActiveVideoRender(delay = 260) {
  window.clearTimeout(videoRenderTimer);
  videoRenderTimer = window.setTimeout(() => {
    renderVideoFrames(activeVideoIndex, true);
  }, delay);
}

function getCenteredVideoIndex() {
  if (!videoTrack || !videoCards.length) return 0;

  const trackRect = videoTrack.getBoundingClientRect();
  const trackCenter = trackRect.left + trackRect.width / 2;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  videoCards.forEach((item, index) => {
    const itemRect = item.getBoundingClientRect();
    const itemCenter = itemRect.left + itemRect.width / 2;
    const distance = Math.abs(trackCenter - itemCenter);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function setActiveVideoIndex(index) {
  if (!videoCards.length) return;

  activeVideoIndex = (index + videoCards.length) % videoCards.length;
  videoCards.forEach((item, itemIndex) => {
    item.classList.toggle("is-active", itemIndex === activeVideoIndex);
  });
}

function updateVideoFocus() {
  const nextActiveIndex = getCenteredVideoIndex();
  const activeVideoChanged = nextActiveIndex !== activeVideoIndex;

  setActiveVideoIndex(nextActiveIndex);

  if (activeVideoChanged) {
    pauseVideoCards();
    renderVideoFrames(nextActiveIndex, false);
  }

  queueActiveVideoRender(activeVideoChanged ? 260 : 120);
}

function centerVideoItem(index, behavior = "smooth") {
  if (!videoTrack || !videoCards.length) return;

  const safeIndex = (index + videoCards.length) % videoCards.length;
  const item = videoCards[safeIndex];
  const left = item.offsetLeft - (videoTrack.clientWidth - item.clientWidth) / 2;
  const isAnimated = behavior !== "auto";

  pauseVideoCards();
  setActiveVideoIndex(safeIndex);
  renderVideoFrames(safeIndex, !isAnimated);
  if (isAnimated) videoTrack.classList.add("is-moving");
  videoScrollLockUntil = window.performance.now() + (isAnimated ? 700 : 0);
  videoTrack.scrollTo({ left, behavior });
  window.setTimeout(() => {
    videoTrack.classList.remove("is-moving");
    updateVideoFocus();
    renderVideoFrames(activeVideoIndex, true);
  }, isAnimated ? 760 : 0);
}

function moveVideo(direction) {
  centerVideoItem(activeVideoIndex + direction);
}

videoPrevButton?.addEventListener("click", () => {
  moveVideo(-1);
});

videoNextButton?.addEventListener("click", () => {
  moveVideo(1);
});

videoTrack?.addEventListener("scroll", () => {
  if (window.performance.now() < videoScrollLockUntil) return;
  if (videoScrollFrame) return;

  videoScrollFrame = window.requestAnimationFrame(() => {
    videoScrollFrame = 0;
    updateVideoFocus();
  });
});

videoTrack?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveVideo(-1);
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    moveVideo(1);
  }
});

videoTrack?.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse" || event.button !== 0) return;

  const pressedCard = event.target.closest(".video-card");
  pendingVideoClickIndex = pressedCard ? videoCards.indexOf(pressedCard) : null;
  videoDragStartX = event.clientX;
  videoDragStartScroll = videoTrack.scrollLeft;
  videoWasDragged = false;
  videoTrack.classList.add("is-dragging");
  videoTrack.setPointerCapture(event.pointerId);
});

videoTrack?.addEventListener("pointermove", (event) => {
  if (!videoTrack.classList.contains("is-dragging")) return;

  const offset = event.clientX - videoDragStartX;
  if (Math.abs(offset) > 6) videoWasDragged = true;
  videoTrack.scrollLeft = videoDragStartScroll - offset;
});

function finishVideoDrag(event) {
  if (!videoTrack?.classList.contains("is-dragging")) return;

  videoTrack.classList.remove("is-dragging");

  if (videoWasDragged) {
    centerVideoItem(getCenteredVideoIndex());
  } else if (pendingVideoClickIndex !== null && pendingVideoClickIndex !== activeVideoIndex) {
    event?.preventDefault();
    pauseVideoCards();
    centerVideoItem(pendingVideoClickIndex);
    suppressVideoClick = true;
    window.setTimeout(() => {
      suppressVideoClick = false;
    }, 320);
  }

  pendingVideoClickIndex = null;
}

videoTrack?.addEventListener("pointerup", finishVideoDrag);
videoTrack?.addEventListener("pointercancel", finishVideoDrag);

videoCards.forEach((card, index) => {
  card.addEventListener("click", (event) => {
    if (suppressVideoClick) {
      event.preventDefault();
      return;
    }

    if (index === activeVideoIndex) return;

    event.preventDefault();
    event.stopPropagation();
    pauseVideoCards();
    centerVideoItem(index);
  });
});

function getCenteredGalleryIndex() {
  if (!galleryTrack || !galleryItems.length) return 0;

  const trackRect = galleryTrack.getBoundingClientRect();
  const trackCenter = trackRect.left + trackRect.width / 2;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  galleryItems.forEach((item, index) => {
    const itemRect = item.getBoundingClientRect();
    const itemCenter = itemRect.left + itemRect.width / 2;
    const distance = Math.abs(trackCenter - itemCenter);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function setActiveGalleryIndex(index) {
  if (!galleryItems.length) return;

  activeGalleryIndex = (index + galleryItems.length) % galleryItems.length;
  galleryItems.forEach((item, itemIndex) => {
    item.classList.toggle("is-active", itemIndex === activeGalleryIndex);
  });
}

function updateGalleryFocus() {
  setActiveGalleryIndex(getCenteredGalleryIndex());
}

function getGalleryItemFromEvent(event) {
  if (!(event.target instanceof Element)) return null;
  return event.target.closest(".gallery-item");
}

function centerGalleryItem(index, behavior = "smooth") {
  if (!galleryTrack || !galleryItems.length) return;

  const safeIndex = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[safeIndex];
  const left = item.offsetLeft - (galleryTrack.clientWidth - item.clientWidth) / 2;

  setActiveGalleryIndex(safeIndex);
  galleryScrollLockUntil = window.performance.now() + (behavior === "auto" ? 0 : 700);
  galleryTrack.scrollTo({ left, behavior });
  window.setTimeout(updateGalleryFocus, behavior === "auto" ? 0 : 760);
}

function moveGallery(direction) {
  centerGalleryItem(activeGalleryIndex + direction);
}

function activateGalleryItem(index) {
  const item = galleryItems[index];
  if (!item) return;

  if (!item.classList.contains("is-active")) {
    centerGalleryItem(index);
    return;
  }

  window.setTimeout(() => {
    openLightbox(index);
  }, 0);
}

galleryPrevButton?.addEventListener("click", () => {
  moveGallery(-1);
});

galleryNextButton?.addEventListener("click", () => {
  moveGallery(1);
});

galleryTrack?.addEventListener("scroll", () => {
  if (window.performance.now() < galleryScrollLockUntil) return;
  if (galleryScrollFrame) return;

  galleryScrollFrame = window.requestAnimationFrame(() => {
    galleryScrollFrame = 0;
    updateGalleryFocus();
  });
});

galleryTrack?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveGallery(-1);
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    moveGallery(1);
  }
});

galleryTrack?.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse" || event.button !== 0) return;

  const pressedItem = getGalleryItemFromEvent(event);
  if (pressedItem) return;

  pendingGalleryClickIndex = pressedItem ? galleryItems.indexOf(pressedItem) : null;
  galleryDragStartX = event.clientX;
  galleryDragStartScroll = galleryTrack.scrollLeft;
  galleryWasDragged = false;
  galleryTrack.classList.add("is-dragging");
  galleryTrack.setPointerCapture(event.pointerId);
});

galleryTrack?.addEventListener("pointermove", (event) => {
  if (!galleryTrack.classList.contains("is-dragging")) return;

  const offset = event.clientX - galleryDragStartX;
  if (Math.abs(offset) > 6) galleryWasDragged = true;
  galleryTrack.scrollLeft = galleryDragStartScroll - offset;
});

function finishGalleryDrag(event) {
  if (!galleryTrack?.classList.contains("is-dragging")) return;

  galleryTrack.classList.remove("is-dragging");

  if (galleryWasDragged) {
    suppressGalleryClick = true;
    centerGalleryItem(getCenteredGalleryIndex());
    window.setTimeout(() => {
      suppressGalleryClick = false;
    }, 0);
  } else if (pendingGalleryClickIndex !== null) {
    const clickedGalleryIndex = pendingGalleryClickIndex;

    event?.preventDefault();
    suppressGalleryClick = true;

    if (galleryItems[clickedGalleryIndex]?.classList.contains("is-active")) {
      window.setTimeout(() => {
        openLightbox(clickedGalleryIndex);
      }, 0);
    } else {
      centerGalleryItem(clickedGalleryIndex);
    }

    window.setTimeout(() => {
      suppressGalleryClick = false;
    }, clickedGalleryIndex === activeGalleryIndex ? 240 : 320);
  }

  pendingGalleryClickIndex = null;
}

galleryTrack?.addEventListener("pointerup", finishGalleryDrag);
galleryTrack?.addEventListener("pointercancel", finishGalleryDrag);
galleryTrack?.addEventListener(
  "click",
  (event) => {
    const item = getGalleryItemFromEvent(event);
    if (!item || !galleryTrack.contains(item)) return;

    event.preventDefault();
    event.stopPropagation();

    if (suppressGalleryClick) return;
    activateGalleryItem(galleryItems.indexOf(item));
  },
  true
);
window.addEventListener("resize", () => {
  updateVideoFocus();
  updateGalleryFocus();
});
window.requestAnimationFrame(() => {
  centerVideoItem(videoStartIndex, "auto");
  centerGalleryItem(galleryStartIndex, "auto");
});

galleryItems.forEach((button, index) => {
  button.addEventListener("click", (event) => {
    if (suppressGalleryClick) {
      event.preventDefault();
      return;
    }

    activateGalleryItem(index);
  });
});

function closeLightbox() {
  if (!lightbox || !lightboxImage) return;

  window.clearTimeout(lightboxImageTimer);
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-lightbox-open");
  lightboxImage.src = "";
  lightboxImage.style.transform = "";
  lightboxImage.style.opacity = "";
}

lightboxClose?.addEventListener("click", closeLightbox);
lightboxPrev?.addEventListener("click", (event) => {
  event.stopPropagation();
  showPreviousImage();
});
lightboxNext?.addEventListener("click", (event) => {
  event.stopPropagation();
  showNextImage();
});
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});

lightbox?.addEventListener("pointerdown", (event) => {
  if (!lightbox.classList.contains("is-open")) return;
  if (event.target.closest("button")) return;

  isDragging = true;
  dragStartX = event.clientX;
  dragOffsetX = 0;
  lightbox.classList.add("is-dragging");
  lightbox.setPointerCapture(event.pointerId);
});

lightbox?.addEventListener("pointermove", (event) => {
  if (!isDragging || !lightboxImage) return;

  dragOffsetX = event.clientX - dragStartX;
  lightboxImage.style.transform = `translateX(${dragOffsetX}px)`;
});

function resetLightboxDrag() {
  isDragging = false;
  lightbox?.classList.remove("is-dragging");
  if (lightboxImage) lightboxImage.style.transform = "translateX(0)";
}

lightbox?.addEventListener("pointerup", () => {
  if (!isDragging || !lightboxImage) return;

  const shouldChangeImage = Math.abs(dragOffsetX) > 70;
  resetLightboxDrag();

  if (!shouldChangeImage) return;
  if (dragOffsetX > 0) {
    showPreviousImage();
  } else {
    showNextImage();
  }
});

lightbox?.addEventListener("pointercancel", resetLightboxDrag);

document.addEventListener("keydown", (event) => {
  if (!lightbox?.classList.contains("is-open")) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeLightbox();
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    showPreviousImage();
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    showNextImage();
  }
});
