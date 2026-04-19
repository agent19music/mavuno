"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Tooltip({
  content,
  children,
  containerClassName,
}: {
  content: string | React.ReactNode;
  children: React.ReactNode;
  containerClassName?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [height, setHeight] = useState(0);
  const [width, setWidth] = useState(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && contentRef.current && tooltipRef.current) {
      const updateDimensions = () => {
        if (contentRef.current && tooltipRef.current) {
          setHeight(contentRef.current.scrollHeight);
          setWidth(tooltipRef.current.offsetWidth || tooltipRef.current.scrollWidth);
        }
      };

      const ensureImageOpacity = () => {
        if (!tooltipRef.current) return;

        const images = tooltipRef.current.querySelectorAll("img");
        images.forEach((img) => {
          img.style.setProperty("opacity", "1", "important");
          img.style.setProperty("display", "block", "important");
          const parent = img.parentElement;
          if (parent) {
            parent.style.setProperty("opacity", "1", "important");
          }
        });
      };

      updateDimensions();
      ensureImageOpacity();

      requestAnimationFrame(() => {
        updateDimensions();
        ensureImageOpacity();
      });

      const observer = new MutationObserver(() => {
        ensureImageOpacity();
      });

      observer.observe(tooltipRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class"],
      });

      return () => {
        observer.disconnect();
      };
    }
  }, [isVisible, content]);

  const calculatePosition = useCallback(
    (mouseX: number, mouseY: number) => {
      if (!containerRef.current) return { x: mouseX + 12, y: mouseY + 12 };

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 12;

      const tooltipWidth = width || 240;
      const tooltipHeight = height || 0;

      const mouseAbsoluteX = containerRect.left + mouseX;
      const mouseAbsoluteY = containerRect.top + mouseY;

      let finalX: number;
      let finalY: number;

      const spaceRight = viewportWidth - mouseAbsoluteX;
      const spaceLeft = mouseAbsoluteX;
      const spaceBottom = viewportHeight - mouseAbsoluteY;
      const spaceTop = mouseAbsoluteY;

      if (spaceRight >= tooltipWidth + padding) {
        finalX = mouseAbsoluteX + padding;
      } else if (spaceLeft >= tooltipWidth + padding) {
        finalX = mouseAbsoluteX - tooltipWidth - padding;
      } else {
        finalX = Math.max(
          padding,
          viewportWidth - tooltipWidth - padding,
        );
      }

      if (spaceBottom >= tooltipHeight + padding) {
        finalY = mouseAbsoluteY + padding;
      } else if (spaceTop >= tooltipHeight + padding) {
        finalY = mouseAbsoluteY - tooltipHeight - padding;
      } else {
        finalY = Math.max(
          padding,
          viewportHeight - tooltipHeight - padding,
        );
      }

      return { x: finalX, y: finalY };
    },
    [width, height],
  );

  const updateMousePosition = (mouseX: number, mouseY: number) => {
    setMouse({ x: mouseX, y: mouseY });
    const newPosition = calculatePosition(mouseX, mouseY);
    setPosition(newPosition);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    setIsVisible(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    updateMousePosition(mouseX, mouseY);
  };

  const handleMouseLeave = () => {
    setMouse({ x: 0, y: 0 });
    setPosition({ x: 0, y: 0 });
    setIsVisible(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (!isVisible) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    updateMousePosition(mouseX, mouseY);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLSpanElement>) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = touch.clientX - rect.left;
    const mouseY = touch.clientY - rect.top;
    updateMousePosition(mouseX, mouseY);
    setIsVisible(true);
  };

  const handleTouchEnd = () => {
    setTimeout(() => {
      setIsVisible(false);
      setMouse({ x: 0, y: 0 });
      setPosition({ x: 0, y: 0 });
    }, 2000);
  };

  const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (window.matchMedia("(hover: none)").matches) {
      e.preventDefault();
      if (isVisible) {
        setIsVisible(false);
        setMouse({ x: 0, y: 0 });
        setPosition({ x: 0, y: 0 });
      } else {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        updateMousePosition(mouseX, mouseY);
        setIsVisible(true);
      }
    }
  };

  useEffect(() => {
    if (isVisible && contentRef.current) {
      const newPosition = calculatePosition(mouse.x, mouse.y);
      setPosition(newPosition);
    }
  }, [isVisible, height, width, mouse.x, mouse.y, calculatePosition]);

  return (
    <span
      ref={containerRef}
      className={cn("relative inline-block", containerClassName)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      {children}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isVisible && (
              <motion.div
                ref={tooltipRef}
                key="tooltip"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                }}
                className="pointer-events-none fixed z-[9999] max-w-[90vw] rounded-[var(--radius-md)] border border-black/[.08] bg-popover text-foreground shadow-[0_16px_48px_rgba(0,0,0,0.08)] dark:border-white/[.08] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
                style={{
                  top: position.y,
                  left: position.x,
                }}
              >
                <div
                  ref={contentRef}
                  className="p-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 [&>p+*]:mt-2 [&>p]:mb-2 [&>p]:last:mb-0 [&>p]:leading-relaxed [&>*+*]:mt-2 [&_img]:relative [&_img]:z-10 [&_img]:mb-0 [&_img]:block [&_img]:h-auto [&_img]:max-w-[min(300px,calc(90vw-2rem))] [&_img]:bg-transparent [&_span>img]:!opacity-100 [&_span]:!opacity-100"
                >
                  {content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </span>
  );
}
