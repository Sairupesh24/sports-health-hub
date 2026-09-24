/**
 * Universal touch-swipe and mouse-wheel scroll helper.
 * 
 * Bypasses mobile event cancellations (e.g., from modal scroll-lock libraries like
 * react-remove-scroll in Radix Dialogs) by imperatively incrementing scrollTop
 * during touchmove and wheel events, with natural inertial momentum on touchend.
 */
export function attachTouchAndWheelScroll(node: HTMLElement | null): () => void {
  if (!node) return () => {};

  // Wheel scroll for desktop mice and trackpads
  const handleWheel = (e: WheelEvent) => {
    e.stopPropagation();
    node.scrollTop += e.deltaY;
  };

  // Touch scroll with momentum for mobile devices
  let lastTouchY = 0;
  let lastTime = 0;
  let velocityY = 0;
  let animId: number | null = null;
  let isTouching = false;

  const cancelMomentum = () => {
    if (animId !== null) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    cancelMomentum();
    if (e.touches.length === 1) {
      isTouching = true;
      lastTouchY = e.touches[0].clientY;
      lastTime = performance.now();
      velocityY = 0;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isTouching || e.touches.length !== 1) return;

    const currentY = e.touches[0].clientY;
    const deltaY = lastTouchY - currentY;
    const now = performance.now();
    const dt = Math.max(1, now - lastTime);

    // Track instant velocity (px per ms) with slight smoothing
    const instantVelocity = deltaY / dt;
    velocityY = 0.75 * instantVelocity + 0.25 * velocityY;

    lastTouchY = currentY;
    lastTime = now;

    // Directly scroll element
    node.scrollTop += deltaY;
    e.stopPropagation();
  };

  const handleTouchEnd = () => {
    if (!isTouching) return;
    isTouching = false;

    // Apply natural momentum deceleration if flicked
    if (Math.abs(velocityY) > 0.05) {
      // Convert to px per frame (~60fps)
      let currentVelocity = velocityY * 16;
      currentVelocity = Math.max(-45, Math.min(45, currentVelocity));

      const step = () => {
        currentVelocity *= 0.93; // Inertial friction
        node.scrollTop += currentVelocity;

        if (Math.abs(currentVelocity) > 0.5) {
          animId = requestAnimationFrame(step);
        } else {
          animId = null;
        }
      };

      animId = requestAnimationFrame(step);
    }
  };

  node.addEventListener("wheel", handleWheel, { passive: false });
  node.addEventListener("touchstart", handleTouchStart, { passive: true });
  node.addEventListener("touchmove", handleTouchMove, { passive: false });
  node.addEventListener("touchend", handleTouchEnd, { passive: true });
  node.addEventListener("touchcancel", handleTouchEnd, { passive: true });

  return () => {
    cancelMomentum();
    node.removeEventListener("wheel", handleWheel);
    node.removeEventListener("touchstart", handleTouchStart);
    node.removeEventListener("touchmove", handleTouchMove);
    node.removeEventListener("touchend", handleTouchEnd);
    node.removeEventListener("touchcancel", handleTouchEnd);
  };
}
