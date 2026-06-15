import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './FilterPill.css';

/**
 * Reusable pill-style filter button with dropdown content
 * @param {Object} props - Component props
 * @param {string} props.label - Default label for the pill
 * @param {string} [props.activeLabel] - Label to show when the filter is active
 * @param {boolean} [props.isActive=false] - Whether the filter currently has an active value
 * @param {boolean} [props.disabled=false] - Whether the pill is disabled
 * @param {React.ReactNode|Function} props.children - Dropdown content shown when the pill is open, or a render function receiving close
 * @param {string} [props.className=""] - Additional class name for the wrapper
 * @returns {JSX.Element} FilterPill component
 */
function FilterPill({
  label,
  activeLabel,
  isActive = false,
  disabled = false,
  children,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState(null);
  const filterPillRef = useRef(null);
  const dropdownRef = useRef(null);
  const displayLabel = isActive && activeLabel ? activeLabel : label;
  const wrapperClassName = [
    'filter-pill',
    isActive ? 'filter-pill-active' : '',
    isOpen ? 'filter-pill-open' : '',
    disabled ? 'filter-pill-disabled' : '',
    className
  ].filter(Boolean).join(' ');

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      const target = event.target;
      if (
        filterPillRef.current &&
        !filterPillRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const updateDropdownPosition = () => {
      if (!filterPillRef.current) return;

      const rect = filterPillRef.current.getBoundingClientRect();
      const dropdownWidth = 320;
      const viewportPadding = 8;
      const maxLeft = window.innerWidth - dropdownWidth - viewportPadding;

      setDropdownPosition({
        top: rect.bottom + 8,
        left: Math.max(viewportPadding, Math.min(rect.left, maxLeft)),
      });
    };

    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen((open) => !open);
    }
  };

  const close = () => setIsOpen(false);
  const dropdownContent = typeof children === 'function'
    ? children({ close })
    : children;

  return (
    <div className={wrapperClassName} ref={filterPillRef}>
      <button
        type="button"
        className="filter-pill-button"
        onClick={handleToggle}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-pressed={isActive}
      >
        <span className="filter-pill-label">{displayLabel}</span>
        <span className="filter-pill-chevron" aria-hidden="true">▾</span>
      </button>

      {isOpen && dropdownPosition && createPortal(
        <div
          className="filter-pill-dropdown filter-dropdown-panel"
          ref={dropdownRef}
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          {dropdownContent}
        </div>,
        document.body
      )}
    </div>
  );
}

export default FilterPill;
