"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "./input";
import { Card } from "./card";

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (item: any) => void;
  fetchSuggestions: (query: string) => Promise<any[]>;
  getDisplayValue: (item: any) => string;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function Autocomplete({
  value,
  onChange,
  onSelect,
  fetchSuggestions,
  getDisplayValue,
  placeholder,
  label,
  className,
}: AutocompleteProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadSuggestions = async () => {
      if (value.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const results = await fetchSuggestions(value);
        setSuggestions(results);
        setIsOpen(results.length > 0);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(loadSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [value, fetchSuggestions]);

  const handleSelect = (item: any) => {
    onChange(getDisplayValue(item));
    if (onSelect) {
      onSelect(item);
    }
    setIsOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      {label && (
        <label className="block text-sm font-medium mb-2">{label}</label>
      )}
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
      />
      {isOpen && (suggestions.length > 0 || isLoading) && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto border-[var(--border)] bg-[var(--card-bg)]">
          {isLoading ? (
            <div className="p-3 text-sm text-[var(--text-muted)]">Loading...</div>
          ) : (
            <ul className="py-1">
              {suggestions.map((item, index) => (
                <li
                  key={index}
                  onClick={() => handleSelect(item)}
                  className="px-3 py-2 cursor-pointer hover:bg-[var(--muted)] text-[var(--foreground)]"
                >
                  {getDisplayValue(item)}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

