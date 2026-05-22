<?php

namespace Modules\HR\Enums;

enum ContractTypeEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;
    case FIVE = 5;
    case SIX = 6;

    public function label(): string
    {
        return match ($this) {
            self::ONE => trans('messages.contract.employment_contract_indefinite'),
            self::SIX => trans('messages.contract.employment_contract_fixed'),
            self::TWO => trans('messages.contract.civil_labor_contract'),
            self::THREE => trans('messages.contract.employment_contract_part_time'),
            self::FOUR => trans('messages.contract.employment_contract_remote'),
            self::FIVE => trans('messages.contract.employment_contract_seasonal'),
        };
    }

    public function labelMinimized(): string
    {
        return match ($this) {
            self::ONE => trans('messages.contract.minimeze_employment_contract_indefinite'),
            self::SIX => trans('messages.contract.minimeze_employment_contract_fixed'),
            self::TWO => trans('messages.contract.minimeze_civil_labor_contract'),
            self::THREE => trans('messages.contract.minimeze_employment_contract_part_time'),
            self::FOUR => trans('messages.contract.minimeze_employment_contract_remote'),
            self::FIVE => trans('messages.contract.minimeze_employment_contract_seasonal'),
        };
    }

    public static function get(int $key): string
    {
        foreach (self::cases() as $case) {
            if ($case->value === $key) {
                return $case->label();
            }
        }
        return "";
    }

    public static function getMinimized(int $key): string
    {
        foreach (self::cases() as $case) {
            if ($case->value === $key) {
                return $case->labelMinimized();
            }
        }
        return "";
    }

    public static function getApplicationTypes(): array
    {
        return [
            ['id' => self::ONE->value, 'name' => trans('messages.application.user.uncertain')],
            ['id' => self::SIX->value, 'name' => trans('messages.application.user.certain')],
            ['id' => self::THREE->value, 'name' => trans('messages.application.user.temporary')],
        ];
    }

    public static function list(): array
    {
        return array_map(static fn($case) => [
            'id' => $case->value,
            'name' => $case->label()
        ], self::cases());
    }
}


