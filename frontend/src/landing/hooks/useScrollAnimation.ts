"use client";

import { useScroll, useTransform, useAnimationControls } from "framer-motion";
import { useEffect, useState } from "react";

export interface ScrollAnimationConfig {
  target: React.RefObject<HTMLElement>;
  offset?: ["start end", "end start"];
  ease?: "linear" | "easeIn" | "easeOut" | "easeInOut";
}

export interface ParallaxConfig {
  y?: [number, number];
  x?: [number, number];
  scale?: [number, number];
  rotate?: [number, number];
  opacity?: [number, number];
}

/**
 * Hook for scroll-driven animations using Framer Motion's useScroll and useTransform
 * Provides parallax, reveal, and progress animations tied to scroll position
 */
export function useScrollAnimation(
  config: ScrollAnimationConfig,
  transforms: ParallaxConfig = {}
) {
  const { target, offset = ["start end", "end start"] } = config;
  const controls = useAnimationControls();

  const { scrollYProgress } = useScroll({
    target,
    offset,
  });

  const transformValues: Record<string, any> = {};

  if (transforms.y) {
    transformValues.y = useTransform(scrollYProgress, [0, 1], transforms.y);
  }
  if (transforms.x) {
    transformValues.x = useTransform(scrollYProgress, [0, 1], transforms.x);
  }
  if (transforms.scale) {
    transformValues.scale = useTransform(scrollYProgress, [0, 1], transforms.scale);
  }
  if (transforms.rotate) {
    transformValues.rotate = useTransform(scrollYProgress, [0, 1], transforms.rotate);
  }
  if (transforms.opacity) {
    transformValues.opacity = useTransform(scrollYProgress, [0, 1], transforms.opacity);
  }

  return { scrollYProgress, transformValues, controls };
}

/**
 * Hook for element reveal animations on scroll
 * Elements animate in when they enter the viewport
 */
export function useRevealAnimation(
  target: React.RefObject<HTMLElement>,
  options: {
    once?: boolean;
    amount?: number;
    margin?: string;
  } = {}
) {
  const { once = true, amount = 0.15, margin = "0px" } = options;
  const controls = useAnimationControls();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = target.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          controls.start("visible");
          if (once) observer.unobserve(element);
        } else if (!once) {
          setIsVisible(false);
          controls.start("hidden");
        }
      },
      { threshold: amount, rootMargin: margin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [target, controls, once, amount, margin]);

  return { controls, isVisible };
}

/**
 * Hook for staggered children animations
 * Provides container variants for staggered entrance
 */
export function useStaggerAnimation(
  staggerDelay: number = 0.06,
  delay: number = 0
) {
  return {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay,
          delayChildren: delay,
        },
      },
    },
    item: {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 300, damping: 26 },
      },
    },
  };
}

/**
 * Hook for scroll progress indicator
 * Returns progress 0-1 based on scroll position within a section
 */
export function useSectionProgress(
  target: React.RefObject<HTMLElement>,
  offset: ["start end", "end start"] = ["start end", "end start"]
) {
  const { scrollYProgress } = useScroll({
    target,
    offset,
  });

  const progress = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return progress;
}

/**
 * Hook for reduced motion preference
 * Returns true if user prefers reduced motion
 */
export function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReduced(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}

/**
 * Hook for counter animation
 * Animates a number from 0 to target value
 */
export function useCounterAnimation(
  target: number,
  duration: number = 2000,
  delay: number = 0
) {
  const [count, setCount] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    const startTime = Date.now() + delay;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth counter
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(target * eased));

      if (progress >= 1) {
        setCount(target);
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target, duration, delay, isActive]);

  const start = () => setIsActive(true);
  const reset = () => { setCount(0); setIsActive(false); };

  return { count, start, reset, isActive };
}

