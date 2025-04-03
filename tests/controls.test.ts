import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  normalizeSpeed,
  normalizePercentage,
  boolToInt,
  comboboxValueToIndex,
  getControlValue,
  getAllControls
} from '../src/common/controls';

describe('controls utilities', () => {
  describe('normalizeSpeed', () => {
    it('should return default speed when input is NaN', () => {
      expect(normalizeSpeed(NaN)).toEqual(1.0);
    });

    it('should return default speed when input is not a number', () => {
      // @ts-ignore - Testing invalid input
      expect(normalizeSpeed('not a number')).toEqual(1.0);
    });

    it('should normalize speed values correctly', () => {
      expect(normalizeSpeed(1)).toBeLessThan(1.0);
      expect(normalizeSpeed(5)).toBeCloseTo(1.0, 1);
      expect(normalizeSpeed(10)).toBeGreaterThan(1.0);
    });

    it('should never return a speed below 0.2', () => {
      expect(normalizeSpeed(0)).toBeGreaterThanOrEqual(0.2);
      expect(normalizeSpeed(0.1)).toBeGreaterThanOrEqual(0.2);
    });
  });

  describe('normalizePercentage', () => {
    it('should convert percentage to factor', () => {
      expect(normalizePercentage(100)).toEqual(1.0);
      expect(normalizePercentage(200)).toEqual(2.0);
      expect(normalizePercentage(50)).toEqual(0.5);
    });

    it('should use default when value is not a number', () => {
      // @ts-ignore - Testing invalid input
      expect(normalizePercentage('invalid')).toEqual(1.0);
    });

    it('should respect minimum value', () => {
      expect(normalizePercentage(0, 100, 0.01)).toEqual(0.01);
    });
  });

  describe('boolToInt', () => {
    it('should convert boolean to int', () => {
      expect(boolToInt(true)).toEqual(1);
      expect(boolToInt(false)).toEqual(0);
    });

    it('should handle numeric inputs', () => {
      expect(boolToInt(1)).toEqual(1);
      expect(boolToInt(0)).toEqual(0);
      expect(boolToInt(5)).toEqual(1);
    });
  });

  describe('comboboxValueToIndex', () => {
    const options = ['option1', 'option2', 'option3'];

    it('should return index of value in options array', () => {
      expect(comboboxValueToIndex('option1', options)).toEqual(0);
      expect(comboboxValueToIndex('option2', options)).toEqual(1);
      expect(comboboxValueToIndex('option3', options)).toEqual(2);
    });

    it('should return default index if value not found', () => {
      expect(comboboxValueToIndex('invalid', options)).toEqual(0);
      expect(comboboxValueToIndex('invalid', options, 2)).toEqual(2);
    });

    it('should handle numeric inputs', () => {
      expect(comboboxValueToIndex(1, options)).toEqual(1);
    });
  });

  describe('getControlValue', () => {
    beforeEach(() => {
      // Mock window object
      vi.stubGlobal('window', { testProperty: 'testValue' });
    });

    it('should get value from window object', () => {
      expect(getControlValue('testProperty', 'default')).toEqual('testValue');
    });

    it('should return default if property not found', () => {
      expect(getControlValue('nonExistentProperty', 'default')).toEqual('default');
    });
  });

  describe('getAllControls', () => {
    beforeEach(() => {
      // Mock window object with some control values
      vi.stubGlobal('window', {
        control1: 'value1',
        control3: 'value3'
      });
    });

    it('should get all control values from window object', () => {
      const controls = {
        control1: 'default1',
        control2: 'default2', 
        control3: 'default3'
      };

      const result = getAllControls(controls);
      expect(result).toEqual({
        control1: 'value1',
        control2: 'default2', // Uses default since not in window
        control3: 'value3'
      });
    });
  });
}); 