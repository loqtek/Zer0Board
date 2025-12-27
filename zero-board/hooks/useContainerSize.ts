import { useState, useEffect, Dispatch, SetStateAction } from "react";

export function useContainerSize(
  containerRef: HTMLDivElement | null,
  setContainerRef: Dispatch<SetStateAction<HTMLDivElement | null>>
) {
  const [containerSize, setContainerSize] = useState({ width: 200, height: 100 });

  useEffect(() => {
    if (!containerRef) return;
    
    const updateSize = () => {
      if (containerRef) {
        setContainerSize({
          width: containerRef.offsetWidth,
          height: containerRef.offsetHeight,
        });
      }
    };
    
    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  return { containerSize, setContainerRef };
}

