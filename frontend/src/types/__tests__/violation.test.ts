import { describe, it, expect } from 'vitest';
import {
  VIOLATION_LABELS,
  VIOLATION_COLORS,
  VIOLATION_SECTIONS,
  type ViolationType,
} from '../violation';

const ALL_VIOLATION_TYPES: ViolationType[] = [
  'no_helmet',
  'triple_riding',
  'wrong_side_driving',
  'illegal_parking',
  'no_seatbelt',
  'stop_line_violation',
  'red_light_violation',
  'license_plate_mismatch',
];

describe('VIOLATION_LABELS', () => {
  it('has entries for all 8 violation types', () => {
    for (const type of ALL_VIOLATION_TYPES) {
      expect(VIOLATION_LABELS).toHaveProperty(type);
    }
    expect(Object.keys(VIOLATION_LABELS)).toHaveLength(8);
  });

  it('has non-empty string values for every violation type', () => {
    for (const type of ALL_VIOLATION_TYPES) {
      const label = VIOLATION_LABELS[type];
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('maps no_helmet to "No Helmet"', () => {
    expect(VIOLATION_LABELS.no_helmet).toBe('No Helmet');
  });

  it('maps triple_riding to "Triple Riding"', () => {
    expect(VIOLATION_LABELS.triple_riding).toBe('Triple Riding');
  });

  it('maps wrong_side_driving to "Wrong Side"', () => {
    expect(VIOLATION_LABELS.wrong_side_driving).toBe('Wrong Side');
  });

  it('maps illegal_parking to "Illegal Parking"', () => {
    expect(VIOLATION_LABELS.illegal_parking).toBe('Illegal Parking');
  });

  it('maps no_seatbelt to "No Seatbelt"', () => {
    expect(VIOLATION_LABELS.no_seatbelt).toBe('No Seatbelt');
  });

  it('maps stop_line_violation to "Stop-Line"', () => {
    expect(VIOLATION_LABELS.stop_line_violation).toBe('Stop-Line');
  });

  it('maps red_light_violation to "Red-Light"', () => {
    expect(VIOLATION_LABELS.red_light_violation).toBe('Red-Light');
  });

  it('maps license_plate_mismatch to "Plate Mismatch"', () => {
    expect(VIOLATION_LABELS.license_plate_mismatch).toBe('Plate Mismatch');
  });
});

describe('VIOLATION_COLORS', () => {
  it('has entries for all 8 violation types', () => {
    for (const type of ALL_VIOLATION_TYPES) {
      expect(VIOLATION_COLORS).toHaveProperty(type);
    }
    expect(Object.keys(VIOLATION_COLORS)).toHaveLength(8);
  });

  it('has non-empty string values for every violation type', () => {
    for (const type of ALL_VIOLATION_TYPES) {
      const color = VIOLATION_COLORS[type];
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    }
  });

  it('each color is a CSS variable', () => {
    for (const type of ALL_VIOLATION_TYPES) {
      expect(VIOLATION_COLORS[type]).toMatch(/^var\(--color-.+\)$/);
    }
  });
});

describe('VIOLATION_SECTIONS', () => {
  it('has entries for all 8 violation types', () => {
    for (const type of ALL_VIOLATION_TYPES) {
      expect(VIOLATION_SECTIONS).toHaveProperty(type);
    }
    expect(Object.keys(VIOLATION_SECTIONS)).toHaveLength(8);
  });

  it('has non-empty string values for every violation type', () => {
    for (const type of ALL_VIOLATION_TYPES) {
      const section = VIOLATION_SECTIONS[type];
      expect(typeof section).toBe('string');
      expect(section.length).toBeGreaterThan(0);
    }
  });

  it('no_helmet maps to S.129', () => {
    expect(VIOLATION_SECTIONS.no_helmet).toBe('S.129');
  });

  it('triple_riding maps to S.184', () => {
    expect(VIOLATION_SECTIONS.triple_riding).toBe('S.184');
  });

  it('wrong_side_driving maps to S.184', () => {
    expect(VIOLATION_SECTIONS.wrong_side_driving).toBe('S.184');
  });

  it('illegal_parking maps to S.122', () => {
    expect(VIOLATION_SECTIONS.illegal_parking).toBe('S.122');
  });

  it('no_seatbelt maps to S.194B', () => {
    expect(VIOLATION_SECTIONS.no_seatbelt).toBe('S.194B');
  });

  it('stop_line_violation maps to S.184', () => {
    expect(VIOLATION_SECTIONS.stop_line_violation).toBe('S.184');
  });

  it('red_light_violation maps to S.184', () => {
    expect(VIOLATION_SECTIONS.red_light_violation).toBe('S.184');
  });

  it('license_plate_mismatch maps to S.177', () => {
    expect(VIOLATION_SECTIONS.license_plate_mismatch).toBe('S.177');
  });
});
