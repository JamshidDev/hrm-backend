// OrganizationService mapper. Laravel: Helper::organizationServices().
// Har enum case uchun `{key, name, active}` chiqadi (mavjud yo'qsa active=false).

import { OrganizationServiceItemDto } from '@/modules/structure/organization-services/dto/organization-service.dto';

// OrganizationServiceEnum cases — Laravel'da hardcoded ("E-imzo", "Eskiz sms").
// Translation key yo'q — har tilda bir xil chiqadi.
export const ORGANIZATION_SERVICE_ENUM: { key: string; name: string }[] = [
  { key: 'e-signature', name: 'E-imzo' },
  { key: 'sms-service', name: 'Eskiz sms' },
];

export interface OrganizationServiceRow {
  key: string;
  active: boolean;
}

export const OrganizationServiceMapper = {
  // Laravel Helper::organizationServices($services):
  //   - Iterates OrganizationServiceEnum::all()
  //   - For each enum key, finds matching service → active = service?.active === 1
  //   - Returns ALL enum keys (even if service not found → active: false).
  toEnumList(
    this: void,
    services: OrganizationServiceRow[],
  ): OrganizationServiceItemDto[] {
    return ORGANIZATION_SERVICE_ENUM.map((enumCase) => {
      const status = services.find((s) => s.key === enumCase.key);
      return {
        key: enumCase.key,
        name: enumCase.name,
        active: status?.active === true,
      };
    });
  },
};
