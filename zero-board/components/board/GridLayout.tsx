"use client";

import { useMemo, useCallback } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import type { Widget } from "@/lib/types/api";

interface GridLayoutProps {
  widgets: Widget[];
  isEditMode: boolean;
  onLayoutChange: (layout: Layout[]) => void;
  children: (widget: Widget) => React.ReactNode;
  cols?: number;
  rowHeight?: number;
}

export function ResponsiveGridLayout({
  widgets,
  isEditMode,
  onLayoutChange,
  children,
  cols = 12,
  rowHeight = 60,
}: GridLayoutProps) {
  const layout = useMemo(() => {
    return widgets.map((widget) => {
      const pos = widget.position || {};
      // Ensure all position values are numbers
      const x = typeof pos.x === "number" ? pos.x : 0;
      const y = typeof pos.y === "number" ? pos.y : 0;
      const w = typeof pos.w === "number" ? pos.w : 4;
      const h = typeof pos.h === "number" ? pos.h : 4;
      
      return {
        i: widget.id.toString(),
        x,
        y,
        w,
        h,
        minW: 2,
        minH: 2,
        maxW: cols, // Prevent widgets from touching right edge (leave 1 col margin)
        // No maxH limit - allow widgets to go down as far as needed
      };
    });
  }, [widgets, cols]);

  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      // Constrain widgets to prevent overflow beyond grid boundaries
      const constrainedLayout = newLayout.map((item) => {
        // Ensure widget doesn't extend beyond the grid width
        const maxX = cols - item.w;
        
        // Constrain x position (allow x=0, but prevent overflow)
        const constrainedX = Math.max(0, Math.min(item.x, maxX));
        
        return {
          ...item,
          x: constrainedX,
        };
      });
      
      onLayoutChange(constrainedLayout);
    },
    [onLayoutChange, cols]
  );

  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={cols}
      rowHeight={rowHeight}
      width={typeof window !== "undefined" ? window.innerWidth : 1200}
      onLayoutChange={handleLayoutChange}
      isDraggable={isEditMode}
      isResizable={isEditMode}
      draggableHandle=".drag-handle"
      compactType="vertical"
      preventCollision={false}
      margin={[8, 8]}
      containerPadding={[4, 0]}
    >
      {widgets.map((widget) => (
        <div 
          key={widget.id.toString()} 
          className="widget-container"
          style={{ 
            minWidth: "100px", 
            minHeight: "100px"
          }}
        >
          {children(widget)}
        </div>
      ))}
    </GridLayout>
  );
}

