<?php

namespace Modules\HR\Enums;

enum ContractAdditionalTypeEnum: int
{
    case ONE = 1;
    case TWO = 2;
    case THREE = 3;
    case FOUR = 4;
    case FIVE = 5;
    case SIX = 6;
    case SEVEN = 7;
    case EIGHT = 8;
    case NINE = 9;
    case TEN = 10;
    case ELEVEN = 11;
    case TWELVE = 12;
    case THIRTEEN = 13;

    public static function getByContractAdditionalTypes($contractType): array
    {
        return match ((int)$contractType) {
            ContractTypeEnum::TWO->value => [
                ['id' => self::ONE, 'name' => self::ONE->label()],
                ['id' => self::TWELVE, 'name' => self::TWELVE->label()]
            ],
            default => [
                ['id' => self::ONE, 'name' => self::ONE->label()],
                ['id' => self::EIGHT, 'name' => self::EIGHT->label()],
                ['id' => self::THIRTEEN, 'name' => self::THIRTEEN->label()]
            ],
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::ONE => trans('messages.contract_changes.employment_terms_change'),
            self::TWO => trans('messages.contract_changes.civil_contract_extension'),
            self::THREE => trans('messages.contract_changes.civil_contract_activity_change'),
            self::FOUR => trans('messages.contract_changes.civil_contract_acceptance'),
            self::FIVE => trans('messages.contract_changes.civil_contract_termination_agreement'),
            self::SIX => trans('messages.contract_changes.civil_contract_termination_notice'),
            self::SEVEN => trans('messages.contract_changes.civil_contract_termination_warning'),
            self::EIGHT => trans('messages.contract_changes.employee_transfer'),
            self::NINE => trans('messages.contract_changes.employer_relocation'),
            self::TEN => trans('messages.contract_changes.temporary_assignment'),
            self::ELEVEN => trans('messages.contract_changes.workplace_change'),
            self::TWELVE => trans('messages.contract_changes.civil_contract_termination'),
            self::THIRTEEN => trans('messages.contract_changes.contract_termination'),
        };
    }
}
