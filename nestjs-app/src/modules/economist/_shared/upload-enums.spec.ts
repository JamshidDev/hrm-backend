// Unit testlar: UploadType/Status enumlar va resolveRefreshTable.

import {
  UploadType,
  UploadStatus,
  uploadTypesList,
  uploadStatusesList,
  resolveRefreshTable,
} from '@/modules/economist/_shared/upload-enums';

describe('Economist · upload-enums', () => {
  describe('UploadType', () => {
    it('Laravel parity: 1..4 qiymatlar', () => {
      expect(UploadType.STATEMENTS).toBe(1);
      expect(UploadType.TAX_FOUR).toBe(2);
      expect(UploadType.TAX_FIVE).toBe(3);
      expect(UploadType.PENSION_PAYMENTS).toBe(4);
    });

    it('uploadTypesList — 4 ta {id, name}', () => {
      const list = uploadTypesList();
      expect(list.length).toBe(4);
      expect(list.map((x) => x.id)).toEqual([1, 2, 3, 4]);
      expect(
        list.every((x) => typeof x.name === 'string' && x.name.length > 0),
      ).toBe(true);
    });
  });

  describe('UploadStatus', () => {
    it('Laravel parity: 1..4 qiymatlar', () => {
      expect(UploadStatus.PROCESS).toBe(1);
      expect(UploadStatus.RELOADED).toBe(2);
      expect(UploadStatus.SUCCESS).toBe(3);
      expect(UploadStatus.ERROR).toBe(4);
    });

    it('uploadStatusesList — 4 ta {id, name}', () => {
      const list = uploadStatusesList();
      expect(list.length).toBe(4);
      expect(list.map((x) => x.id)).toEqual([1, 2, 3, 4]);
    });
  });

  describe('resolveRefreshTable', () => {
    it('Statements → statements', () => {
      expect(resolveRefreshTable('statements')).toBe('statements');
    });

    it('Tax-four (ikkala variant) → tax_four_applications', () => {
      expect(resolveRefreshTable('tax-four-applications')).toBe(
        'tax_four_applications',
      );
      expect(resolveRefreshTable('tax_four_applications')).toBe(
        'tax_four_applications',
      );
    });

    it('Tax-five (ikkala variant) → tax_five_applications', () => {
      expect(resolveRefreshTable('tax-five-applications')).toBe(
        'tax_five_applications',
      );
      expect(resolveRefreshTable('tax_five_applications')).toBe(
        'tax_five_applications',
      );
    });

    it('Pension (ikkala variant) → pension_payments', () => {
      expect(resolveRefreshTable('pension-payments')).toBe('pension_payments');
      expect(resolveRefreshTable('pension_payments')).toBe('pension_payments');
    });

    it('Noma`lum tur → throw', () => {
      expect(() => resolveRefreshTable('unknown')).toThrow(
        /Unknown refresh type/,
      );
    });
  });
});
